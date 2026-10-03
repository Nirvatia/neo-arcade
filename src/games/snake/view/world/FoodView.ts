import { Container, Graphics } from 'pixi.js';
import type { World } from '../../core/ecs/World.js';
import type { BiomeManager, FoodRender } from '../../biomes/index.js';

export class FoodView {
	public readonly container: Container;

	private readonly graphics: Graphics;
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;

	private world: World | null = null;

	/** Последний угол движения, чтобы добыча не дёргалась в простое. */
	private lastAngles = new Map<number, number>();

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;

		this.container = new Container();
		this.graphics = new Graphics();

		this.container.addChild(this.graphics);
	}

	public setWorld(world: World): void {
		this.world = world;
	}

	public render(timeMS: number): void {
		const g = this.graphics;
		g.clear();

		if (this.world === null) {
			return;
		}

		const foods: FoodRender[] = [];
		const seen = new Set<number>();

		const entities = this.world.query(['food', 'gridPosition']).entities;

		for (const entityId of entities) {
			const pos = this.world.getComponent(entityId, 'gridPosition');
			const food = this.world.getComponent(entityId, 'food');

			if (pos === undefined || food === undefined) {
				continue;
			}

			const wander = this.world.getComponent(entityId, 'foodWander');

			let x: number;
			let y: number;
			let angle: number;

			if (
				wander !== undefined &&
				Number.isFinite(wander.x) &&
				Number.isFinite(wander.y)
			) {
				x = wander.x;
				y = wander.y;

				const speed = Math.hypot(wander.vx, wander.vy);

				if (speed > 5) {
					angle = Math.atan2(wander.vy, wander.vx);
				} else {
					angle =
						this.lastAngles.get(entityId) ??
						(entityId * 2.39996) % (Math.PI * 2);
				}
			} else {
				x = pos.col * this.cellSize + this.cellSize / 2;
				y = pos.row * this.cellSize + this.cellSize / 2;

				angle =
					this.lastAngles.get(entityId) ??
					(entityId * 2.39996) % (Math.PI * 2);
			}

			this.lastAngles.set(entityId, angle);
			seen.add(entityId);

			foods.push({
				x,
				y,
				bit: food.bit,
				phase: wander !== undefined ? wander.phase : 0,
				angle
			});
		}

		// Кэш углов не должен расти бесконечно.
		if (this.lastAngles.size > seen.size * 2 + 16) {
			for (const key of Array.from(this.lastAngles.keys())) {
				if (!seen.has(key)) {
					this.lastAngles.delete(key);
				}
			}
		}

		this.biomes.biome.renderFood(g, foods, timeMS, this.cellSize);
	}
}