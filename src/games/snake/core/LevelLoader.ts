import { World } from '../engine/ecs/World.js';
import type { EntityId } from '../engine/ecs/types.js';
import type { Director } from './Director.js';
import { GridService } from '../logic/grid/GridService.js';
import { SeededRNG } from '../logic/math/SeededRNG.js';
import { spawnSnake } from '../logic/snake/SnakeFactory.js';
import { Direction } from '../components/index.js';
import {
	GridConfig,
	GameplayConfig,
	getLevelTuning,
	AudioConfig,
	progressionResolver
} from '../config/index.js';
import { MovementSystem } from '../systems//movement/MovementSystem.js';
import { InputSystem } from '../systems//movement/InputSystem.js';
import { SpawnSystem } from '../systems/spawn/SpawnSystem.js';
import { ScoreSystem } from '../systems/progression/ScoreSystem.js';
import { RenderPipeline } from './RenderPipeline.js';
import { MusicPlayer } from '../audio/MusicPlayer.js';
import { BIOME_REGISTRY, BiomeManager } from '../biomes/index.js';
import type { CanvasManager } from '../canvas/CanvasManager.js';
import type { CanvasSurface } from '../canvas/CanvasSurface.js';
import { BitRegisterSystem } from '../systems/puzzle/BitRegisterSystem.js';
import { BitTokenSystem } from '../systems/puzzle/BitTokenSystem.js';
import { DeathAnimationSystem } from '../systems/death/DeathAnimationSystem.js';
import { FoodWanderSystem } from '../systems/food/FoodWanderSystem.js';
import { LevelSystem } from '../systems/progression/LevelSystem.js';
import { SvelteHudAdapter } from '../ui/hud/SvelteHudAdapter.js';
import { SvelteOverlayAdapter } from '../ui/overlay/SvelteOverlayAdapter.js';

export interface WorldContext {
	world: World;
	service: GridService;
	rng: SeededRNG;
	snakeId: EntityId;
}

export interface SystemsContext {
	inputSystem: InputSystem;
	renderPipeline: RenderPipeline;
	music: MusicPlayer;
	biomeManager: BiomeManager;
	levelSystem: LevelSystem;
	bitRegisterSystem: BitRegisterSystem;
	deathAnimation: DeathAnimationSystem;
}

export class LevelLoader {
	public static createWorld(): WorldContext {
		const world = new World();

		const service = new GridService(
			GridConfig.START_COLS,
			GridConfig.START_ROWS
		);

		service.writer.buildPerimeter();

		const rng = new SeededRNG(LevelLoader.createSeed());

		const startCol = Math.floor(GridConfig.START_COLS / 2);
		const startRow = Math.floor(GridConfig.START_ROWS / 2);

		const snakeId = spawnSnake(
			world,
			service.grid,
			startCol,
			startRow,
			Direction.RIGHT,
			GameplayConfig.INITIAL_SNAKE_LENGTH
		);

		const scoreEntity = world.createEntity();
		world.addComponent(scoreEntity, 'score', { value: 0 });

		return { world, service, rng, snakeId };
	}

	public static createSystems(
		worldCtx: WorldContext,
		director: Director,
		surface: CanvasSurface,
		canvasManager: CanvasManager,
		muted: boolean
	): SystemsContext {
		const { world, service, rng, snakeId } = worldCtx;

		const tuning = getLevelTuning(1);

		const inputSystem = new InputSystem(
			world,
			snakeId,
			GameplayConfig.MAX_INPUT_QUEUE
		);

		const movementSystem = new MovementSystem(
			world,
			service,
			snakeId,
			tuning.stepIntervalMS
		);

		const bitRegisterSystem = new BitRegisterSystem(
			world,
			service,
			rng,
			snakeId
		);

		const bitTokenSystem = new BitTokenSystem(
			world,
			service,
			rng,
			snakeId,
			tuning.maxActiveTokens
		);

		const levelSystem = new LevelSystem(
			world,
			service,
			rng,
			snakeId,
			GridConfig.MAX_COLS,
			GridConfig.MAX_ROWS
		);

		const spawnSystem = new SpawnSystem(
			world,
			service,
			rng,
			GameplayConfig.TARGET_FOOD_COUNT
		);

		const scoreSystem = new ScoreSystem(
			world,
			GameplayConfig.POINTS_PER_SEQUENCE,
			GameplayConfig.POINTS_FLAWLESS_BONUS,
			GameplayConfig.POINTS_BIOME_BONUS,
			GameplayConfig.COMBO_MAX_MULTIPLIER
		);

		const foodWanderSystem = new FoodWanderSystem(
			world,
			service,
			rng,
			snakeId
		);

		const biomeManager = new BiomeManager({
			biomes: BIOME_REGISTRY,
			initialLevel: 1,
			resolveIndex: progressionResolver
		});

		const hud = new SvelteHudAdapter();
		const overlay = new SvelteOverlayAdapter();

		const renderPipeline = new RenderPipeline(
			world,
			service,
			snakeId,
			surface,
			GridConfig.CELL_SIZE,
			biomeManager,
			hud,
			overlay
		);

		const music = new MusicPlayer(world.events, AudioConfig.MUSIC_SRC);
		music.setMuted(muted);

		const deathAnimationSystem = new DeathAnimationSystem(world, snakeId);

		deathAnimationSystem.setDependencies({
			director,
			fx: renderPipeline.fx,
			movement: movementSystem,
			input: inputSystem
		});

		inputSystem.setOnFirstInput(() => {
			movementSystem.notifyInput();
		});

		movementSystem.setDependencies({
			bitRegister: bitRegisterSystem,
			level: levelSystem,
			fx: renderPipeline.fx,
			death: deathAnimationSystem
		});

		bitRegisterSystem.setDependencies({
			movement: movementSystem,
			level: levelSystem,
			score: scoreSystem,
			fx: renderPipeline.fx
		});

		bitTokenSystem.setBitRegister(bitRegisterSystem);

		spawnSystem.setFoodWander(foodWanderSystem);

		levelSystem.setDependencies({
			movement: movementSystem,
			bitRegister: bitRegisterSystem,
			bitToken: bitTokenSystem,
			spawn: spawnSystem,
			score: scoreSystem,
			input: inputSystem,
			fx: renderPipeline.fx,
			canvasManager,
			renderPipeline
		});

		spawnSystem.refillFood();

		world.addSystem(inputSystem);
		world.addSystem(movementSystem);
		world.addSystem(bitTokenSystem);
		world.addSystem(bitRegisterSystem);
		world.addSystem(levelSystem);
		world.addSystem(spawnSystem);
		world.addSystem(scoreSystem);
		world.addSystem(foodWanderSystem);
		world.addSystem(deathAnimationSystem);

		return {
			inputSystem,
			renderPipeline,
			music,
			biomeManager,
			levelSystem,
			bitRegisterSystem,
			deathAnimation: deathAnimationSystem
		};
	}

	private static createSeed(): number {
		return Math.floor(Math.random() * 2147483647);
	}
}