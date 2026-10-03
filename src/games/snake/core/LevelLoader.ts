import { World } from './ecs/World.js';
import type { EntityId } from './ecs/types.js';
import type { Director } from './Director.js';
import { GridService } from '../logic/grid/GridService.js';
import { SeededRNG } from '../logic/SeededRNG.js';
import { spawnSnake } from '../logic/SnakeFactory.js';
import { Direction } from '../components/index.js';
import { GridConfig, GameplayConfig, getLevelTuning, AudioConfig } from '../config/index.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { BitRegisterSystem } from '../systems/BitRegisterSystem.js';
import { BitTokenSystem } from '../systems/BitTokenSystem.js';
import { LevelSystem } from '../systems/LevelSystem.js';
import { FoodWanderSystem } from '../systems/FoodWanderSystem.js';
import { DeathAnimationSystem } from '../systems/DeathAnimationSystem.js';
import { RenderPipeline } from './RenderPipeline.js';
import { MusicPlayer } from '../audio/MusicPlayer.js';
import { BIOME_REGISTRY, BiomeManager } from '../biomes/index.js';
import { SvelteHudAdapter } from '../view/hud/SvelteHudAdapter.js';
import type { CanvasManager } from './CanvasManager.js';
import type { Container } from 'pixi.js';


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

		const service = new GridService(GridConfig.START_COLS, GridConfig.START_ROWS);
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
		stage: Container,
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
			GridConfig.GROWTH_COLS,
			GridConfig.GROWTH_ROWS,
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
			GameplayConfig.POINTS_FINAL_SEQUENCE,
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
			levelsPerBiome: GameplayConfig.LEVELS_PER_BIOME,
			initialLevel: 1
		});

		const hud = new SvelteHudAdapter();

		const renderPipeline = new RenderPipeline(
			world,
			service,
			snakeId,
			stage,
			GridConfig.CELL_SIZE,
			biomeManager,
			hud
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
			fx: renderPipeline.fx,
			director
		});

		bitTokenSystem.setBitRegister(bitRegisterSystem);

		spawnSystem.setFoodWander(foodWanderSystem);

		levelSystem.setDependencies({
			movement: movementSystem,
			bitRegister: bitRegisterSystem,
			bitToken: bitTokenSystem,
			spawn: spawnSystem,
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