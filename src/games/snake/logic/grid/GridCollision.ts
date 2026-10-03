import type { GridModel } from './GridModel.js';
import { cellIndex, testBit } from '../BitMath.js';

/**
 * GridCollision — только чтение коллизий.
 * Не мутирует данные.
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

	public isWall(col: number, row: number): boolean {
		if (!this.withinBounds(col, row)) {
			return true;
		}
		return testBit(this.model.walls, cellIndex(col, row, this.model.cols));
	}

	public isOccupied(col: number, row: number): boolean {
		if (!this.withinBounds(col, row)) {
			return false;
		}
		return testBit(this.model.occupancy, cellIndex(col, row, this.model.cols));
	}

	public isFood(col: number, row: number): boolean {
		if (!this.withinBounds(col, row)) {
			return false;
		}
		return testBit(this.model.foodExists, cellIndex(col, row, this.model.cols));
	}

	public getFoodBit(col: number, row: number): 0 | 1 {
		if (!this.withinBounds(col, row)) {
			return 0;
		}
		return testBit(this.model.foodBits, cellIndex(col, row, this.model.cols)) ? 1 : 0;
	}

	public isExit(col: number, row: number): boolean {
		if (!this.withinBounds(col, row)) {
			return false;
		}
		return testBit(this.model.exit, cellIndex(col, row, this.model.cols));
	}
}