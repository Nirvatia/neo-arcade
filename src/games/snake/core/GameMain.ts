import type { GameModule } from '$shared/core/types.js';
import { GameLoop } from '../engine/GameLoop.js';
import { Director } from './Director.js';
import { GridConfig, GameplayConfig } from '../config/index.js';
import { CanvasSurface } from '../canvas/CanvasSurface.js';
import { InputController, type InputCallbacks } from './InputController.js';
import { LevelLoader, type WorldContext, type SystemsContext } from './LevelLoader.js';
import { CanvasManager } from '../canvas/CanvasManager.js';
import type { RenderPipeline } from './RenderPipeline.js';
import type { MusicPlayer } from '../audio/MusicPlayer.js';
import type { BiomeChangedListener, BiomeManager } from '../biomes/index.js';
import type { Direction } from '../components/index.js';
import { saveScore } from '$shared/utils/scoreStore.js';
import { DirectorState } from './Events.js';
import type { World } from '../engine/ecs/World.js';
import { snakeGameActions } from '../ui/actions/gameActionsStore.js';

export class SnakeGame implements GameModule {
	private canvasParent!: HTMLDivElement;
	private surface!: CanvasSurface;
	private inputController!: InputController;
	private world: World | null = null;
	private gameLoop: GameLoop | null = null;
	private director: Director | null = null;
	private renderPipeline: RenderPipeline | null = null;
	private music: MusicPlayer | null = null;
	private biomeManager: BiomeManager | null = null;
	private lastSavedScore = -1;
	private biomeBackgroundListener: BiomeChangedListener | null = null;

	public async init(canvasParent: HTMLDivElement): Promise<void> {
		this.canvasParent = canvasParent;

		const width = GridConfig.START_COLS * GridConfig.CELL_SIZE;
		const height = GridConfig.START_ROWS * GridConfig.CELL_SIZE;

		this.surface = new CanvasSurface(canvasParent, width, height);
		this.surface.onFrame((deltaMS: number) => {
			if (this.gameLoop !== null) {
				this.gameLoop.tick(deltaMS);
			}
		});

		this.inputController = new InputController();
		this.inputController.bind(canvasParent);

		this.setupRun();

		if (this.director !== null) {
			this.director.startGame();
		}
	}

	public destroy(): void {
		this.inputController.destroy();
		snakeGameActions.set(null);

		if (this.gameLoop !== null) {
			this.gameLoop.stop();
			this.gameLoop = null;
		}

		if (this.renderPipeline !== null) {
			this.renderPipeline.dispose();
			this.renderPipeline = null;
		}

		if (this.music !== null) {
			this.music.dispose();
			this.music = null;
		}

		if (this.biomeManager !== null) {
			if (this.biomeBackgroundListener !== null) {
				this.biomeManager.removeBiomeChangedListener(this.biomeBackgroundListener);
				this.biomeBackgroundListener = null;
			}

			this.biomeManager.destroy();
			this.biomeManager = null;
		}

		if (this.world !== null) {
			this.world.clear();
			this.world = null;
		}

		this.director = null;
		this.surface.destroy();

		if (typeof document !== 'undefined') {
			document.documentElement.style.removeProperty('--stage-bg');
		}
	}

	public touchDirection(dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): void {
		this.inputController.touchDirection(dir);
	}

	public touchPause(): void {
		this.inputController.touchPause();
	}

	public touchMute(): void {
		this.inputController.touchMute();
	}

	private setupRun(): void {
		this.lastSavedScore = -1;

		if (this.gameLoop !== null) {
			this.gameLoop.stop();
			this.gameLoop = null;
		}

		if (this.renderPipeline !== null) {
			this.renderPipeline.dispose();
			this.renderPipeline = null;
		}

		if (this.music !== null) {
			this.music.dispose();
			this.music = null;
		}

		if (this.biomeManager !== null) {
			if (this.biomeBackgroundListener !== null) {
				this.biomeManager.removeBiomeChangedListener(this.biomeBackgroundListener);
				this.biomeBackgroundListener = null;
			}

			this.biomeManager.destroy();
			this.biomeManager = null;
		}

		if (this.world !== null) {
			this.world.clear();
			this.world = null;
		}

		this.director = null;

		const worldCtx: WorldContext = LevelLoader.createWorld();
		this.world = worldCtx.world;

		const gameLoop = new GameLoop(GameplayConfig.MAX_DELTA_MS);
		this.gameLoop = gameLoop;

		const director = new Director(worldCtx.world, gameLoop);
		this.director = director;

		const canvasManager = new CanvasManager(this.surface, worldCtx.service);
		canvasManager.resizeToGrid();

		const systemsCtx: SystemsContext = LevelLoader.createSystems(
			worldCtx,
			director,
			this.surface,
			canvasManager,
			this.inputController.isMuted
		);

		this.renderPipeline = systemsCtx.renderPipeline;
		this.music = systemsCtx.music;
		this.biomeManager = systemsCtx.biomeManager;

		const biomeBackgroundListener: BiomeChangedListener = (next): void => {
			this.surface.setBackground(next.palette.screenBackground);
		};

		this.biomeBackgroundListener = biomeBackgroundListener;
		this.biomeManager.addBiomeChangedListener(biomeBackgroundListener);
		this.surface.setBackground(this.biomeManager.biome.palette.screenBackground);
		this.surface.clear();

		gameLoop.setCallbacks(
			(fixedStepMS: number) => {
				worldCtx.world.update(fixedStepMS);
			},
			(deltaMS: number) => {
				systemsCtx.renderPipeline.update(deltaMS);
			}
		);

		this.inputController.setCallbacks(this.createInputCallbacks(systemsCtx, director));
		this.publishUiActions();
		this.bindWorldEvents(worldCtx.world);

		worldCtx.world.update(0);
	}

	private createInputCallbacks(systemsCtx: SystemsContext, director: Director): InputCallbacks {
		return {
			getState: () => director.getState(),
			startGame: () => director.startGame(),
			pause: () => {
				if (systemsCtx.deathAnimation.isActive()) {
					return;
				}

				director.pause();
			},
			resume: () => {
				if (systemsCtx.deathAnimation.isActive()) {
					return;
				}

				director.resume();
			},
			pressDirection: (dir: Direction) => {
				systemsCtx.inputSystem.pressDirection(dir);
			},
			restart: () => {
				this.setupRun();

				if (this.director !== null) {
					this.director.startGame();
				}
			},
			unlockAudio: () => {
				systemsCtx.music.unlock();
			},
			onMuteToggle: (muted: boolean) => {
				systemsCtx.music.setMuted(muted);
			}
		};
	}

	private bindWorldEvents(world: World): void {
		world.events.on('director:stateChanged', (payload) => {
			if (payload.current === DirectorState.GAME_OVER) {
				this.saveHighScore();
			}

			if (this.renderPipeline !== null) {
				this.renderPipeline.forceRender();
			}
		});
	}

	private saveHighScore(): void {
		const score = this.readScore();

		if (score === this.lastSavedScore) {
			return;
		}

		this.lastSavedScore = score;

		const isNewRecord = saveScore('snake', score);

		if (this.renderPipeline !== null) {
			this.renderPipeline.setNewRecord(isNewRecord);
		}
	}

	private readScore(): number {
		if (this.world === null) {
			return 0;
		}

		const scoreEntities = this.world.query(['score']).entities;
		const scoreEntity = scoreEntities[0];

		if (scoreEntity === undefined) {
			return 0;
		}

		const score = this.world.getComponent(scoreEntity, 'score');

		return score === undefined ? 0 : score.value;
	}

	private publishUiActions(): void {
		snakeGameActions.set({
			direction: (dir) => this.inputController.direction(dir),
			confirm: () => this.inputController.confirm(),
			pauseToggle: () => this.inputController.pauseToggle(),
			restart: () => this.inputController.restart(),
			mute: () => this.inputController.muteToggle()
		});
	}
}