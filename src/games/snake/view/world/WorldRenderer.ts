import type { World } from '../../core/ecs/World.js';
import type { EntityId } from '../../core/ecs/types.js';
import type { GridService } from '../../logic/grid/GridService.js';
import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import { GridView } from './GridView.js';
import { FoodView } from './FoodView.js';
import { SnakeView } from './SnakeView.js';
import { TokenView, type TokenRender } from './TokenView.js';
import type { Biome, BiomeManager, SnakeZoneStyle } from '../../biomes/index.js';
import type { Container } from 'pixi.js';

export class WorldRenderer {
	private readonly world: World;
	private readonly service: GridService;
	private readonly snakeId: EntityId;
	private readonly cellSize: number;
	private readonly biomeManager: BiomeManager;

	private readonly gridView: GridView;
	private readonly foodView: FoodView;
	private readonly tokenView: TokenView;
	private readonly snakeView: SnakeView;
	private readonly shakeLayer: Container;

	private cachedWallGrid: GridBitmask | null = null;
	private level = 1;
	private time = 0;

	constructor(
		shakeLayer: Container,
		world: World,
		service: GridService,
		snakeId: EntityId,
		cellSize: number,
		biomeManager: BiomeManager
	) {
		this.shakeLayer = shakeLayer;
		this.world = world;
		this.service = service;
		this.snakeId = snakeId;
		this.cellSize = cellSize;
		this.biomeManager = biomeManager;

		const biome = biomeManager.biome;

		this.gridView = new GridView(cellSize, biomeManager);
		this.foodView = new FoodView(cellSize, biomeManager);
		this.foodView.setWorld(world);
		this.tokenView = new TokenView(cellSize, biomeManager);
		this.snakeView = new SnakeView(cellSize, biomeManager);

		this.shakeLayer.addChild(this.gridView.container);
		this.shakeLayer.addChild(biome.getAmbientContainer());
		this.shakeLayer.addChild(this.foodView.container);
		this.shakeLayer.addChild(this.tokenView.container);
		this.shakeLayer.addChild(this.snakeView.container);

		this.biomeManager.addBiomeChangedListener(this.onBiomeChanged);
	}

	private get grid(): GridBitmask {
		return this.service.grid;
	}

	public setLevel(level: number): void {
		this.level = level;
		this.biomeManager.setLevel(level);
	}

	public update(deltaMS: number, activeLength: number): void {
		this.time = this.time + deltaMS;

		if (this.cachedWallGrid !== this.grid) {
			this.gridView.renderBackground(this.grid);
			this.cachedWallGrid = this.grid;
		}

		this.gridView.renderExit(this.grid, this.time);

		this.biomeManager.biome.updateAmbient(
			deltaMS,
			this.time,
			this.cellSize,
			this.grid.cols,
			this.grid.rows
		);

		this.foodView.render(this.time);
		this.renderSnake(activeLength);
		this.renderTokens();
	}

	private renderSnake(activeLength: number): void {
		const motionEntities = this.world.query(['snakeMotion']).entities;
		const motionEntity = motionEntities[0];

		if (motionEntity === undefined) {
			return;
		}

		const motion = this.world.getComponent(motionEntity, 'snakeMotion');

		if (motion === undefined) {
			return;
		}

		let deathProgress = 0;

		const heads = this.world.query(['snakeHead']).entities;
		const headEntity = heads[0];

		if (headEntity !== undefined) {
			const death = this.world.getComponent(headEntity, 'deathAnimation');

			if (death !== undefined && death.active) {
				deathProgress = death.progress;
			}
		}

		const zones: SnakeZoneStyle[] = [];

		const entities = this.world.query(['snakeSegment']).entities;

		const segments: { order: number; bit: 0 | 1 }[] = [];

		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');

			if (segment === undefined) {
				continue;
			}

			if (segment.snakeId !== this.snakeId) {
				continue;
			}

			segments.push({
				order: segment.order,
				bit: segment.bit
			});
		}

		segments.sort((a, b) => a.order - b.order);

		for (const segment of segments) {
			zones.push({
				bit: segment.bit,
				active: segment.order < activeLength
			});
		}

		this.snakeView.render(
			motion,
			zones,
			deathProgress,
			this.time
		);
	}

	private renderTokens(): void {
		const tokens: TokenRender[] = [];

		const entities = this.world.query(['bitPowerUp', 'gridPosition']).entities;

		for (const entity of entities) {
			const tokenPos = this.world.getComponent(entity, 'gridPosition');
			const token = this.world.getComponent(entity, 'bitPowerUp');

			if (tokenPos === undefined || token === undefined) {
				continue;
			}

			tokens.push({
				col: tokenPos.col,
				row: tokenPos.row,
				op: token.op
			});
		}

		this.tokenView.render(tokens, this.time);
	}

	private onBiomeChanged = (next: Biome, prev: Biome): void => {
		const prevAmbient = prev.getAmbientContainer();
		const nextAmbient = next.getAmbientContainer();

		if (this.shakeLayer.children.includes(prevAmbient)) {
			const index = this.shakeLayer.getChildIndex(prevAmbient);

			this.shakeLayer.removeChild(prevAmbient);
			this.shakeLayer.addChildAt(nextAmbient, index);
		} else {
			this.shakeLayer.addChild(nextAmbient);
		}

		this.cachedWallGrid = null;
	};

	public dispose(): void {
		this.biomeManager.removeBiomeChangedListener(this.onBiomeChanged);
		this.tokenView.destroy();
	}
}