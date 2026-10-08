import type { GridModel } from './GridModel.js';
import type { GridCollision } from './GridCollision.js';
import type { GridWriter } from './GridWriter.js';

/**
 * GridBitmask — фасад для чтения и ограниченной записи.
 *
 * Все методы делегируют в GridModel / GridCollision / GridWriter.
 */
export class GridBitmask {
	private readonly model: GridModel;
	private readonly collision: GridCollision;
	private readonly writer: GridWriter;

	constructor(model: GridModel, collision: GridCollision, writer: GridWriter) {
		this.model = model;
		this.collision = collision;
		this.writer = writer;
	}

	public get cols(): number {
		return this.model.cols;
	}

	public get rows(): number {
		return this.model.rows;
	}

	public get wrap(): boolean {
		return this.model.wrap;
	}

	public wrapPosition(col: number, row: number): { col: number; row: number } {
		return this.model.wrapPosition(col, row);
	}

	// === Чтение ===

	public withinBounds(col: number, row: number): boolean {
		return this.collision.withinBounds(col, row);
	}

	public isWall(col: number, row: number): boolean {
		return this.collision.isWall(col, row);
	}

	public isOccupied(col: number, row: number): boolean {
		return this.collision.isOccupied(col, row);
	}

	public isFood(col: number, row: number): boolean {
		return this.collision.isFood(col, row);
	}

	public getFoodBit(col: number, row: number): 0 | 1 {
		return this.collision.getFoodBit(col, row);
	}

	public isExit(col: number, row: number): boolean {
		return this.collision.isExit(col, row);
	}

	// === Запись ===

	public clearFood(col: number, row: number): void {
		this.writer.clearFood(col, row);
	}

	public setOccupied(col: number, row: number): void {
		this.writer.setOccupied(col, row);
	}

	public clearOccupied(col: number, row: number): void {
		this.writer.clearOccupied(col, row);
	}
}
