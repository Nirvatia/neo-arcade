import type { GridService } from '../../logic/grid/GridService.js';
import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import { GridView } from './GridView.js';
import { FoodView } from './FoodView.js';
import { SnakeView } from './SnakeView.js';
import { TokenView, type TokenRender } from './TokenView.js';
import { LightView } from './LightView.js';
import type { Biome, BiomeManager, SnakeZoneStyle } from '../../biomes/index.js';
import type { EntityId } from '$games/snake/engine/ecs/types.js';
import type { World } from '$games/snake/engine/ecs/World.js';

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
	private readonly lightView: LightView;

	private cachedWallGrid: GridBitmask | null = null;
	private level = 1;
	private time = 0;
	private activeLength = 0;

	constructor(
		world: World,
		service: GridService,
		snakeId: EntityId,
		cellSize: number,
		biomeManager: BiomeManager
	) {
		this.world = world;
		this.service = service;
		this.snakeId = snakeId;
		this.cellSize = cellSize;
		this.biomeManager = biomeManager;

		this.gridView = new GridView(cellSize, biomeManager);
		this.foodView = new FoodView(cellSize, biomeManager);
		this.tokenView = new TokenView(cellSize, biomeManager);
		this.snakeView = new SnakeView(cellSize, biomeManager);
		this.lightView = new LightView(world, service, cellSize, biomeManager);

		this.foodView.setWorld(world);
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
		this.activeLength = activeLength;

		if (this.cachedWallGrid !== this.grid) {
			this.gridView.renderBackground(this.grid);
			this.cachedWallGrid = this.grid;
		}

		this.biomeManager.biome.updateAmbient(
			deltaMS,
			this.time,
			this.cellSize,
			this.grid.cols,
			this.grid.rows
		);
	}

	public draw(ctx: CanvasRenderingContext2D): void {
		const width = this.grid.cols * this.cellSize;
		const height = this.grid.rows * this.cellSize;

		this.gridView.drawBackground(ctx);
		this.gridView.renderExit(ctx, this.grid, this.time);

		this.biomeManager.biome.renderAmbient(ctx);

		this.foodView.render(ctx, this.time);
		this.renderTokens(ctx);
		this.renderSnake(ctx);

		// Динамический свет рисуем после змейки, но перед передним планом амбиента.
		this.lightView.render(ctx, width, height, this.time);

		// Передний план амбиента рисуем поверх змейки и света.
		this.biomeManager.biome.renderAmbientForeground?.(ctx);
	}

	public dispose(): void {
		this.biomeManager.removeBiomeChangedListener(this.onBiomeChanged);
		this.gridView.destroy();
		this.tokenView.destroy();
		this.lightView.dispose();
	}

	private renderSnake(ctx: CanvasRenderingContext2D): void {
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
				active: segment.order < this.activeLength
			});
		}

		this.snakeView.render(ctx, motion, zones, deathProgress, this.time);
	}

	private renderTokens(ctx: CanvasRenderingContext2D): void {
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

		this.tokenView.render(ctx, tokens, this.time);
	}

	private onBiomeChanged = (_next: Biome, _prev: Biome): void => {
		this.cachedWallGrid = null;
		this.gridView.invalidate();
		this.lightView.invalidate();
	};
}
