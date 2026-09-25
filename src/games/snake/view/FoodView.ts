import { Container, Graphics } from 'pixi.js';
import type { World } from '../core/ecs/World.js';
import type { BiomeManager, FoodRender } from '../biomes/index.js';

export class FoodView {
	public readonly container: Container;
	private readonly graphics: Graphics;
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;
	private world: World | null = null;
	/** Последний угол движения по сущностям: добыча не «крутится» в простое. */
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
			const wander = this.world.getComponent(entityId, 'foodWander');

			if (pos === undefined || food === undefined) {
				continue;
			}

			let x = pos.col * this.cellSize + this.cellSize / 2;
			let y = pos.row * this.cellSize + this.cellSize / 2;

			// По умолчанию — стабильное псевдослучайное направление.
			let angle = this.lastAngles.get(entityId) ?? (entityId * 2.39996) % (Math.PI * 2);

			if (wander !== undefined) {
				x += wander.offsetX * this.cellSize;
				y += wander.offsetY * this.cellSize;

				// Пока добыча в переходе — смотрит на целевую клетку.
				if (wander.progress < 1) {
					const tx = wander.targetCol * this.cellSize + this.cellSize / 2;
					const ty = wander.targetRow * this.cellSize + this.cellSize / 2;
					if (Math.hypot(tx - x, ty - y) > 0.5) {
						angle = Math.atan2(ty - y, tx - x);
					}
				}
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