import type { GameModule } from '$shared/core/types.js';
import { World } from './ecs/World.js';
import { GameLoop } from './GameLoop.js';
import { Director } from './Director.js';
import { DirectorState, type DirectorStateType } from './Events.js';
import { GridBitmask } from '../logic/GridBitmask.js';
import { GridHolder } from '../logic/GridHolder.js';
import { SeededRNG } from '../logic/SeededRNG.js';
import { spawnSnake } from '../logic/SnakeFactory.js';
import { Direction } from '../components/index.js';
import { GridConfig, GameplayConfig, getLevelTuning } from '../config/index.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { SnakeControlSystem } from '../systems/SnakeControlSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { BitRegisterSystem } from '../systems/BitRegisterSystem.js';
import { BitTokenSystem } from '../systems/BitTokenSystem.js';
import { LevelSystem } from '../systems/LevelSystem.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { PixiApp } from '../view/PixiApp.js';
import { MusicPlayer } from '../audio/MusicPlayer.js';

const MUSIC_SRC = '/assets/snake/music/theme.mp3';
// Чистый чёрный совпадает с фоном страницы — никаких серых областей вне поля.
const CANVAS_BACKGROUND = 0x000000;
// Минимальная длина свайпа, чтобы отличить его от тапа.
const SWIPE_THRESHOLD_PX = 22;

const KEY_TO_DIRECTION: Record<string, Direction> = {
	ArrowUp: Direction.UP,
	KeyW: Direction.UP,
	ArrowDown: Direction.DOWN,
	KeyS: Direction.DOWN,
	ArrowLeft: Direction.LEFT,
	KeyA: Direction.LEFT,
	ArrowRight: Direction.RIGHT,
	KeyD: Direction.RIGHT
};

const HOTKEYS = {
	PAUSE: 'Space',
	PAUSE_ALT: 'Escape',
	CONFIRM: 'Enter',
	MUTE: 'KeyM'
} as const;

export class SnakeGame implements GameModule {
	private canvasParent!: HTMLDivElement;
	private pixiApp!: PixiApp;
	private world: World | null = null;
	private holder: GridHolder | null = null;
	private gameLoop: GameLoop | null = null;
	private director: Director | null = null;
	private inputSystem: InputSystem | null = null;
	private renderSystem: RenderSystem | null = null;
	private music: MusicPlayer | null = null;
	private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
	private pointerDownHandler: ((event: PointerEvent) => void) | null = null;
	private pointerUpHandler: ((event: PointerEvent) => void) | null = null;
	private activePointerId: number | null = null;
	private pointerStartX = 0;
	private pointerStartY = 0;
	private lastTapAt = 0;
	private muted = false;

	public async init(canvasParent: HTMLDivElement): Promise<void> {
		this.canvasParent = canvasParent;
		this.pixiApp = new PixiApp();
		const width = GridConfig.START_COLS * GridConfig.CELL_SIZE;
		const height = GridConfig.START_ROWS * GridConfig.CELL_SIZE;
		await this.pixiApp.init(canvasParent, width, height, CANVAS_BACKGROUND);
		this.pixiApp.addTickerCallback((deltaMS) => {
			if (this.gameLoop !== null) {
				this.gameLoop.tick(deltaMS);
			}
		});
		this.bindKeyboard();
		this.bindTouch();
		this.setupRun();
	}

	private setupRun(): void {
		if (this.gameLoop !== null) {
			this.gameLoop.stop();
			this.gameLoop = null;
		}
		if (this.renderSystem !== null) {
			this.renderSystem.dispose();
			this.renderSystem = null;
		}
		if (this.music !== null) {
			this.music.dispose();
			this.music = null;
		}
		if (this.world !== null) {
			this.world.clear();
		}
		this.director = null;
		this.inputSystem = null;

		const world = new World();
		this.world = world;

		const grid = new GridBitmask(GridConfig.START_COLS, GridConfig.START_ROWS);
		grid.buildPerimeter();
		const holder = new GridHolder(grid);
		this.holder = holder;

		const rng = new SeededRNG(this.createSeed());
		const tuning = getLevelTuning(1);

		const startCol = Math.floor(GridConfig.START_COLS / 2);
		const startRow = Math.floor(GridConfig.START_ROWS / 2);
		const snakeId = spawnSnake(
			world,
			grid,
			startCol,
			startRow,
			Direction.RIGHT,
			GameplayConfig.INITIAL_SNAKE_LENGTH
		);

		const scoreEntity = world.createEntity();
		world.addComponent(scoreEntity, 'score', { value: 0 });

		const inputSystem = new InputSystem(world, snakeId, GameplayConfig.MAX_INPUT_QUEUE);
		this.inputSystem = inputSystem;
		const controlSystem = new SnakeControlSystem(world, snakeId);
		const movementSystem = new MovementSystem(world, holder, snakeId, tuning.stepIntervalMS);
		const bitRegisterSystem = new BitRegisterSystem(world, holder, rng, snakeId);
		const bitTokenSystem = new BitTokenSystem(
			world,
			holder,
			rng,
			snakeId,
			tuning.maxActiveTokens
		);
		const levelSystem = new LevelSystem(
			world,
			holder,
			rng,
			snakeId,
			GridConfig.GROWTH_COLS,
			GridConfig.GROWTH_ROWS,
			GridConfig.MAX_COLS,
			GridConfig.MAX_ROWS
		);
		const spawnSystem = new SpawnSystem(world, holder, rng, GameplayConfig.TARGET_FOOD_COUNT);
		const scoreSystem = new ScoreSystem(
			world,
			GameplayConfig.POINTS_PER_FOOD,
			GameplayConfig.POINTS_PER_SEQUENCE,
			GameplayConfig.PENALTY_SEQUENCE_FAILED
		);
		const renderSystem = new RenderSystem(
			world,
			holder,
			snakeId,
			this.pixiApp.stage,
			GridConfig.CELL_SIZE,
			this.canvasParent
		);
		this.renderSystem = renderSystem;

		const music = new MusicPlayer(world.events, MUSIC_SRC);
		music.setMuted(this.muted);
		this.music = music;

		spawnSystem.refillFood();

		world.addSystem(inputSystem);
		world.addSystem(controlSystem);
		world.addSystem(movementSystem);
		world.addSystem(bitTokenSystem);
		world.addSystem(bitRegisterSystem);
		world.addSystem(levelSystem);
		world.addSystem(spawnSystem);
		world.addSystem(scoreSystem);
		world.addSystem(renderSystem);

		const gameLoop = new GameLoop(world, GameplayConfig.MAX_DELTA_MS);
		this.gameLoop = gameLoop;
		const director = new Director(world, gameLoop);
		this.director = director;

		this.bindWorldEvents(world);

		// Канвас всегда соответствует текущему полю: критично при рестарте,
		// прошлый забег мог оставить канвас расширенным («серая область»).
		this.resizeCanvas();
		world.update(0);
	}

	private bindWorldEvents(world: World): void {
		world.events.on('director:stateChanged', () => {
			if (this.renderSystem !== null) {
				this.renderSystem.forceRender();
			}
		});
		world.events.on('level:expanded', () => {
			this.resizeCanvas();
		});
	}

	private resizeCanvas(): void {
		if (this.holder === null) {
			return;
		}
		const grid = this.holder.grid;
		this.pixiApp.resize(grid.cols * GridConfig.CELL_SIZE, grid.rows * GridConfig.CELL_SIZE);
	}

	private createSeed(): number {
		return Math.floor(Math.random() * 2147483647);
	}

	// ============================== КЛАВИАТУРА ==============================

	private bindKeyboard(): void {
		this.keyDownHandler = (event: KeyboardEvent): void => {
			this.handleKeyDown(event);
		};
		window.addEventListener('keydown', this.keyDownHandler);
	}

	private handleKeyDown(event: KeyboardEvent): void {
		this.unlockAudio();

		const direction = KEY_TO_DIRECTION[event.code];
		if (direction !== undefined) {
			event.preventDefault();
			const state = this.getDirectorState();
			if (state === DirectorState.MENU || state === DirectorState.PAUSED) {
				if (this.director !== null) {
					this.director.transitionTo(DirectorState.PLAYING);
				}
			}
			if (this.isState(DirectorState.PLAYING) && this.inputSystem !== null) {
				this.inputSystem.pressDirection(direction);
			}
			return;
		}

		if (event.code === HOTKEYS.PAUSE || event.code === HOTKEYS.PAUSE_ALT) {
			event.preventDefault();
			this.togglePause();
			return;
		}
		if (event.code === HOTKEYS.CONFIRM) {
			event.preventDefault();
			this.onEnterPressed();
			return;
		}
		if (event.code === HOTKEYS.MUTE) {
			event.preventDefault();
			this.toggleMute();
			return;
		}
	}

	// ============================== ТАЧ / СВАЙПЫ ==============================

	private bindTouch(): void {
		this.pointerDownHandler = (event: PointerEvent): void => {
			this.unlockAudio();
			// Обрабатываем только один палец.
			if (this.activePointerId !== null) {
				return;
			}
			this.activePointerId = event.pointerId;
			this.pointerStartX = event.clientX;
			this.pointerStartY = event.clientY;
		};
		this.pointerUpHandler = (event: PointerEvent): void => {
			if (event.pointerId !== this.activePointerId) {
				return;
			}
			this.activePointerId = null;
			this.handleSwipeOrTap(event);
		};
		this.canvasParent.addEventListener('pointerdown', this.pointerDownHandler);
		this.canvasParent.addEventListener('pointerup', this.pointerUpHandler);
		this.canvasParent.addEventListener('pointercancel', this.pointerUpHandler);
	}

	private handleSwipeOrTap(event: PointerEvent): void {
		const dx = event.clientX - this.pointerStartX;
		const dy = event.clientY - this.pointerStartY;
		const absX = Math.abs(dx);
		const absY = Math.abs(dy);

		if (absX >= SWIPE_THRESHOLD_PX || absY >= SWIPE_THRESHOLD_PX) {
			let direction: Direction;
			if (absX > absY) {
				direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
			} else {
				direction = dy > 0 ? Direction.DOWN : Direction.UP;
			}
			this.pressDirectionInternal(direction);
			return;
		}
		this.handleTap(event);
	}

	private handleTap(event: PointerEvent): void {
		const state = this.getDirectorState();
		if (state === DirectorState.MENU || state === DirectorState.GAME_OVER) {
			this.onEnterPressed();
			return;
		}
		if (state === DirectorState.PAUSED) {
			this.togglePause();
			return;
		}
		if (state !== DirectorState.PLAYING) {
			return;
		}
		// Двойной тап по верхней полосе — пауза (аналог пробела).
		const rect = this.canvasParent.getBoundingClientRect();
		const y = event.clientY - rect.top;
		const now = Date.now();
		if (y < rect.height * 0.18 && now - this.lastTapAt < 350) {
			this.lastTapAt = 0;
			this.togglePause();
			return;
		}
		this.lastTapAt = now;
	}

	// ================= ПУБЛИЧНЫЙ ТАЧ-ИНТЕРФЕЙС (для GameStage) =================

	public touchDirection(dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): void {
		this.unlockAudio();
		this.pressDirectionInternal(Direction[dir]);
	}

	public touchPause(): void {
		this.unlockAudio();
		const state = this.getDirectorState();
		if (state === DirectorState.MENU || state === DirectorState.GAME_OVER) {
			this.onEnterPressed();
			return;
		}
		this.togglePause();
	}

	public touchMute(): void {
		this.unlockAudio();
		this.toggleMute();
	}

	private pressDirectionInternal(direction: Direction): void {
		const state = this.getDirectorState();
		if (state === DirectorState.MENU || state === DirectorState.PAUSED) {
			if (this.director !== null) {
				this.director.transitionTo(DirectorState.PLAYING);
			}
		}
		if (this.isState(DirectorState.PLAYING) && this.inputSystem !== null) {
			this.inputSystem.pressDirection(direction);
		}
	}

	// ============================== ОБЩЕЕ ==============================

	private isState(state: DirectorStateType): boolean {
		if (this.director === null) {
			return false;
		}
		return this.director.getState() === state;
	}

	private getDirectorState(): DirectorStateType {
		if (this.director === null) {
			return DirectorState.MENU;
		}
		return this.director.getState();
	}

	private togglePause(): void {
		if (this.director === null) {
			return;
		}
		const state = this.director.getState();
		if (state === DirectorState.PLAYING) {
			this.director.transitionTo(DirectorState.PAUSED);
			return;
		}
		if (state === DirectorState.PAUSED) {
			this.director.transitionTo(DirectorState.PLAYING);
		}
	}

	private onEnterPressed(): void {
		if (this.director === null) {
			return;
		}
		const state = this.director.getState();
		if (state === DirectorState.MENU || state === DirectorState.PAUSED) {
			this.director.transitionTo(DirectorState.PLAYING);
			return;
		}
		if (state === DirectorState.GAME_OVER) {
			this.restart();
		}
	}

	private restart(): void {
		this.setupRun();
		if (this.director !== null) {
			this.director.transitionTo(DirectorState.PLAYING);
		}
	}

	private unlockAudio(): void {
		if (this.music !== null) {
			this.music.unlock();
		}
	}

	private toggleMute(): void {
		this.muted = !this.muted;
		if (this.music !== null) {
			this.music.setMuted(this.muted);
		}
	}

	public destroy(): void {
		if (this.keyDownHandler !== null) {
			window.removeEventListener('keydown', this.keyDownHandler);
			this.keyDownHandler = null;
		}
		if (this.pointerDownHandler !== null) {
			this.canvasParent.removeEventListener('pointerdown', this.pointerDownHandler);
			this.pointerDownHandler = null;
		}
		if (this.pointerUpHandler !== null) {
			this.canvasParent.removeEventListener('pointerup', this.pointerUpHandler);
			this.canvasParent.removeEventListener('pointercancel', this.pointerUpHandler);
			this.pointerUpHandler = null;
		}
		if (this.gameLoop !== null) {
			this.gameLoop.stop();
			this.gameLoop = null;
		}
		if (this.renderSystem !== null) {
			this.renderSystem.dispose();
			this.renderSystem = null;
		}
		if (this.music !== null) {
			this.music.dispose();
			this.music = null;
		}
		if (this.world !== null) {
			this.world.clear();
			this.world = null;
		}
		if (this.pixiApp !== undefined) {
			this.pixiApp.destroy();
		}
	}
}