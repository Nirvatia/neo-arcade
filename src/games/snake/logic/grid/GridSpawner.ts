import type { GridModel } from './GridModel.js';
import type { GridCollision } from './GridCollision.js';
import type { SeededRNG } from '../math/SeededRNG.js';
import { GameplayConfig } from '../../config/GameplayConfig.js';

/**
 * GridSpawner — поиск свободных клеток и подсчёт еды.
 * Не мутирует данные.
 */
export class GridSpawner {
	private model: GridModel;
	private readonly collision: GridCollision;

	constructor(model: GridModel, collision: GridCollision) {
		this.model = model;
		this.collision = collision;
	}

	public setModel(model: GridModel): void {
		this.model = model;
	}

	/**
	 * Ищет свободную клетку: не стена, не занята, не еда, не выход.
	 * Fail-fast: бросает исключение, если поле переполнено.
	 */
	public findFreeCell(
		rng: SeededRNG,
		maxAttempts: number = GameplayConfig.MAX_FIND_ATTEMPTS
	): { col: number; row: number } {
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const col = rng.nextInt(this.model.cols);
			const row = rng.nextInt(this.model.rows);
			
			if (!this.collision.withinBounds(col, row)) continue;
			if (this.collision.isWall(col, row)) continue;
			if (this.collision.isOccupied(col, row)) continue;
			if (this.collision.isFood(col, row)) continue;
			if (this.collision.isExit(col, row)) continue;
			
			return { col, row };
		}
		throw new Error(`GridSpawner: no free cell found after ${maxAttempts} attempts.`);
	}

	public countFood(): number {
		let count = 0;
		for (let row = 0; row < this.model.rows; row++) {
			for (let col = 0; col < this.model.cols; col++) {
				if (this.collision.isFood(col, row)) {
					count = count + 1;
				}
			}
		}
		return count;
	}

	public countFoodBit(bit: 0 | 1): number {
		let count = 0;
		for (let row = 0; row < this.model.rows; row++) {
			for (let col = 0; col < this.model.cols; col++) {
				if (
					this.collision.isFood(col, row) &&
					this.collision.getFoodBit(col, row) === bit
				) {
					count = count + 1;
				}
			}
		}
		return count;
	}
}