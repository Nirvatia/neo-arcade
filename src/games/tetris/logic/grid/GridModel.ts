// src/games/tetris/logic/grid/GridModel.ts
import { GRID_COLS, GRID_ROWS } from '../../config/GridConfig';

export class GridModel {
	public cells: number[][];

	constructor() {
		this.cells = this.createEmptyGrid();
	}

	reset(): void {
		this.cells = this.createEmptyGrid();
	}

	private createEmptyGrid(): number[][] {
		const grid: number[][] = [];

		for (let y = 0; y < GRID_ROWS; y++) {
			grid.push(new Array(GRID_COLS).fill(0));
		}

		return grid;
	}
}