import type { GridService } from '../../logic/grid/GridService.js';
import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import { GridView } from './GridView.js';
import { FoodView } from './FoodView.js';
import { SnakeView } from './SnakeView.js';
import { TokenView } from './TokenView.js';
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
	
	private readonly zonesBuffer: SnakeZoneStyle[] = [];
	
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
		
		this.tokenView.render(ctx, this.world, this.time);
		this.renderSnake(ctx);
		
		this.lightView.render(ctx, width, height, this.time);
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
			throw new Error('WorldRenderer: snakeMotion entity missing.');
		}
		
		const motion = this.world.getComponent(motionEntity, 'snakeMotion');
		if (motion === undefined) {
			throw new Error('WorldRenderer: snakeMotion component missing.');
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
		
		const entities = this.world.query(['snakeSegment']).entities;
		let maxOrder = -1;
		
		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			if (segment === undefined) continue;
			if (segment.snakeId !== this.snakeId) continue;
			if (segment.order > maxOrder) maxOrder = segment.order;
		}
		
		if (maxOrder === -1) {
			throw new Error('WorldRenderer: no snake segments found.');
		}
		
		const zoneCount = maxOrder + 1;
		
		while (this.zonesBuffer.length < zoneCount) {
			this.zonesBuffer.push({ bit: 0, active: false });
		}
		
		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			if (segment === undefined) continue;
			if (segment.snakeId !== this.snakeId) continue;
			
			const zone = this.zonesBuffer[segment.order];
			if (zone !== undefined) {
				zone.bit = segment.bit;
				zone.active = segment.order < this.activeLength;
			}
		}
		
		this.snakeView.render(ctx, motion, this.zonesBuffer, zoneCount, deathProgress, this.time);
	}

	private onBiomeChanged = (_next: Biome, _prev: Biome): void => {
		this.cachedWallGrid = null;
		this.gridView.invalidate();
		this.lightView.invalidate();
	};
}