import type { GameModule } from '$shared/core/types.js';
import type { World } from './ecs/World.js';
import { GameLoop } from './GameLoop.js';
import { Director } from './Director.js';
import { GridConfig, GameplayConfig } from '../config/index.js';
import { PixiApp } from '../view/PixiApp.js';
import { InputController, type InputCallbacks } from './InputController.js';
import { LevelLoader, type WorldContext, type SystemsContext } from './LevelLoader.js';
import { CanvasManager } from './CanvasManager.js';
import type { RenderPipeline } from './RenderPipeline.js';
import type { MusicPlayer } from '../audio/MusicPlayer.js';
import type { BiomeChangedListener, BiomeManager } from '../biomes/index.js';
import type { Direction } from '../components/index.js';

import { saveScore } from '$shared/utils/scoreStore.js';
import { DirectorState } from './Events.js';

const CANVAS_BACKGROUND = 0x0a1008;

export class SnakeGame implements GameModule {
	private canvasParent!: HTMLDivElement;
	private pixiApp!: PixiApp;
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

		this.pixiApp = new PixiApp();

		const width = GridConfig.START_COLS * GridConfig.CELL_SIZE;
		const height = GridConfig.START_ROWS * GridConfig.CELL_SIZE;

		await this.pixiApp.init(canvasParent, width, height);

		this.pixiApp.addTickerCallback((deltaMS: number) => {
			this.pixiApp.updateZoom(deltaMS);

			if (this.gameLoop !== null) {
				this.gameLoop.tick(deltaMS);
			}
		});

		this.inputController = new InputController();
		this.inputController.bind(canvasParent);

		this.setupRun();

		// Сессия 5: начинаем сразу в PLAYING, без стартового оверлея.
		// Движение стартует только после первого направления.
		if (this.director !== null) {
			this.director.startGame();
		}
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

		const gameLoop = new GameLoop(GameplayConfig.FIXED_STEP_MS, GameplayConfig.MAX_DELTA_MS);
		this.gameLoop = gameLoop;

		const director = new Director(worldCtx.world, gameLoop);
		this.director = director;

		const canvasManager = new CanvasManager(this.pixiApp, worldCtx.service);
		canvasManager.resizeToGrid();

		const systemsCtx: SystemsContext = LevelLoader.createSystems(
			worldCtx,
			director,
			this.pixiApp.stage,
			canvasManager,
			this.inputController.isMuted
		);

		this.renderPipeline = systemsCtx.renderPipeline;
		this.music = systemsCtx.music;
		this.biomeManager = systemsCtx.biomeManager;
		const biomeBackgroundListener: BiomeChangedListener = (next, _prev): void => {
			this.pixiApp.setBackground(next.palette.screenBackground);
		};
		this.biomeBackgroundListener = biomeBackgroundListener;
		this.biomeManager.addBiomeChangedListener(biomeBackgroundListener);
		this.pixiApp.setBackground(this.biomeManager.biome.palette.screenBackground);

		gameLoop.setCallbacks(
			(fixedStepMS: number) => {
				worldCtx.world.update(fixedStepMS);
			},
			(deltaMS: number, _interpolation: number) => {
				systemsCtx.renderPipeline.update(deltaMS);
			}
		);

		this.inputController.setCallbacks(this.createInputCallbacks(systemsCtx, director));

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

			startEndless: () => {
				systemsCtx.levelSystem.onEndlessStarted();
				systemsCtx.bitRegisterSystem.onEndlessStarted();
				systemsCtx.renderPipeline.setFinalMode(false);

				director.restart();
				director.startGame();
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
			if (
				payload.current === DirectorState.GAME_OVER ||
				payload.current === DirectorState.VICTORY
			) {
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

	public destroy(): void {
		this.inputController.destroy();

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

		this.pixiApp.destroy();

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
}
