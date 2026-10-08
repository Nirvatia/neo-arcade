import type { World } from '$games/snake/engine/ecs/World.js';
import type { BiomeManager, FoodRender } from '../../biomes/index.js';

export class FoodView {
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;
	private world: World | null = null;
	
	private readonly lastAngles = new Map<number, number>();
	private lastAnglesVersion = -1;
	private readonly foodBuffer: FoodRender[] = [];

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;
	}

	public setWorld(world: World): void {
		this.world = world;
	}

	public render(ctx: CanvasRenderingContext2D, timeMS: number): void {
		if (this.world === null) return;
		
		const currentVersion = this.world.components.version;
		if (this.lastAnglesVersion !== currentVersion) {
			this.lastAngles.clear();
			this.lastAnglesVersion = currentVersion;
		}

		let count = 0;
		const entities = this.world.query(['food', 'gridPosition']).entities;
		
		for (let e = 0; e < entities.length; e++) {
			const entityId = entities[e];
			if (entityId === undefined) continue;
			
			const pos = this.world.getComponent(entityId, 'gridPosition');
			const food = this.world.getComponent(entityId, 'food');
			if (pos === undefined || food === undefined) continue;
			
			const wander = this.world.getComponent(entityId, 'foodWander');
			let x: number;
			let y: number;
			let angle: number;
			
			if (wander !== undefined && Number.isFinite(wander.x) && Number.isFinite(wander.y)) {
				x = wander.x;
				y = wander.y;
				const speed = Math.hypot(wander.vx, wander.vy);
				if (speed > 5) {
					angle = Math.atan2(wander.vy, wander.vx);
				} else {
					angle = this.lastAngles.get(entityId) ?? (entityId * 2.39996) % (Math.PI * 2);
				}
			} else {
				x = pos.col * this.cellSize + this.cellSize / 2;
				y = pos.row * this.cellSize + this.cellSize / 2;
				angle = this.lastAngles.get(entityId) ?? (entityId * 2.39996) % (Math.PI * 2);
			}
			
			this.lastAngles.set(entityId, angle);
			
			if (count >= this.foodBuffer.length) {
				this.foodBuffer.push({ x: 0, y: 0, bit: 0, phase: 0, angle: 0 });
			}
			
			const f = this.foodBuffer[count];
			if (f !== undefined) {
				f.x = x;
				f.y = y;
				f.bit = food.bit;
				f.phase = wander !== undefined ? wander.phase : 0;
				f.angle = angle;
			}
			count++;
		}
		
		this.biomes.biome.renderFood(ctx, this.foodBuffer, count, timeMS, this.cellSize);
	}
}