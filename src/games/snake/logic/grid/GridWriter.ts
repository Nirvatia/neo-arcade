import type { GridModel } from './GridModel.js';
import { cellIndex, setBit, clearBit } from '../math/BitMath.js';

/**
 * GridWriter — только запись в битовые маски.
 * Не читает данные.
 */
export class GridWriter {
	private model: GridModel;

	constructor(model: GridModel) {
		this.model = model;
	}

	public setModel(model: GridModel): void {
		this.model = model;
	}

	public setWall(col: number, row: number): void {
		setBit(this.model.walls, cellIndex(col, row, this.model.cols));
	}

	public setFood(col: number, row: number, bit: 0 | 1): void {
		const idx = cellIndex(col, row, this.model.cols);
		setBit(this.model.foodExists, idx);

		if (bit === 1) {
			setBit(this.model.foodBits, idx);
		} else {
			clearBit(this.model.foodBits, idx);
		}
	}

	public clearFood(col: number, row: number): void {
		const idx = cellIndex(col, row, this.model.cols);
		clearBit(this.model.foodExists, idx);
		clearBit(this.model.foodBits, idx);
	}

	public setOccupied(col: number, row: number): void {
		setBit(this.model.occupancy, cellIndex(col, row, this.model.cols));
	}

	public clearOccupied(col: number, row: number): void {
		clearBit(this.model.occupancy, cellIndex(col, row, this.model.cols));
	}

	public setExit(col: number, row: number): void {
		setBit(this.model.exit, cellIndex(col, row, this.model.cols));
	}

	public clearExit(col: number, row: number): void {
		clearBit(this.model.exit, cellIndex(col, row, this.model.cols));
	}

	/**
	 * Строит периметр только если поле не находится
	 * в режиме без рамок.
	 */
	public buildPerimeter(): void {
		if (this.model.wrap) {
			return;
		}

		const cols = this.model.cols;
		const rows = this.model.rows;

		for (let col = 0; col < cols; col++) {
			this.setWall(col, 0);
			this.setWall(col, rows - 1);
		}

		for (let row = 0; row < rows; row++) {
			this.setWall(0, row);
			this.setWall(cols - 1, row);
		}
	}
}