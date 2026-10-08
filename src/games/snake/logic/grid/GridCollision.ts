import type { GridModel } from './GridModel.js';
import { cellIndex, testBit } from '../math/BitMath.js';

/**
 * GridCollision — только чтение коллизий.
 * Не мутирует данные.
 *
 * Теперь поддерживает режим без рамок:
 * если включён `wrap`, координаты заворачиваются
 * перед проверкой битовых масок.
 */
export class GridCollision {
	private model: GridModel;

	constructor(model: GridModel) {
		this.model = model;
	}

	public setModel(model: GridModel): void {
		this.model = model;
	}

	public withinBounds(col: number, row: number): boolean {
		return col >= 0 && col < this.model.cols && row >= 0 && row < this.model.rows;
	}

	private resolve(col: number, row: number): { col: number; row: number } {
		if (this.model.wrap) {
			return this.model.wrapPosition(col, row);
		}

		return { col, row };
	}

	public isWall(col: number, row: number): boolean {
		const p = this.resolve(col, row);

		if (!this.withinBounds(p.col, p.row)) {
			return true;
		}

		return testBit(this.model.walls, cellIndex(p.col, p.row, this.model.cols));
	}

	public isOccupied(col: number, row: number): boolean {
		const p = this.resolve(col, row);

		if (!this.withinBounds(p.col, p.row)) {
			return false;
		}

		return testBit(this.model.occupancy, cellIndex(p.col, p.row, this.model.cols));
	}

	public isFood(col: number, row: number): boolean {
		const p = this.resolve(col, row);

		if (!this.withinBounds(p.col, p.row)) {
			return false;
		}

		return testBit(this.model.foodExists, cellIndex(p.col, p.row, this.model.cols));
	}

	public getFoodBit(col: number, row: number): 0 | 1 {
		const p = this.resolve(col, row);

		if (!this.withinBounds(p.col, p.row)) {
			return 0;
		}

		return testBit(this.model.foodBits, cellIndex(p.col, p.row, this.model.cols)) ? 1 : 0;
	}

	public isExit(col: number, row: number): boolean {
		const p = this.resolve(col, row);

		if (!this.withinBounds(p.col, p.row)) {
			return false;
		}

		return testBit(this.model.exit, cellIndex(p.col, p.row, this.model.cols));
	}
}