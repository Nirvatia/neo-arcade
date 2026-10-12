// src/games/tetris/logic/grid/GridService.ts
import { GRID_COLS, GRID_ROWS } from '../../config/GridConfig';
import type { PieceMatrix } from '../../config/PiecesConfig';
import type { GridModel } from './GridModel';
import type { PieceModel } from '../piece/PieceModel';

export class GridService {
	static isValidPosition(grid: GridModel, matrix: PieceMatrix, x: number, y: number): boolean {
		for (let row = 0; row < matrix.length; row++) {
			const matrixRow = matrix[row];

			for (let col = 0; col < matrixRow.length; col++) {
				const cell = matrixRow[col];

				if (cell === 0) {
					continue;
				}

				const boardX = x + col;
				const boardY = y + row;

				if (boardX < 0 || boardX >= GRID_COLS || boardY >= GRID_ROWS) {
					return false;
				}

				if (boardY >= 0 && grid.cells[boardY][boardX] !== 0) {
					return false;
				}
			}
		}

		return true;
	}

	static getGhostY(grid: GridModel, piece: PieceModel): number {
		let y = piece.y;

		while (this.isValidPosition(grid, piece.matrix, piece.x, y + 1)) {
			y += 1;
		}

		return y;
	}

	static lockPiece(grid: GridModel, piece: PieceModel): boolean {
		const matrix = piece.matrix;
		let aboveVisibleField = false;

		for (let row = 0; row < matrix.length; row++) {
			const matrixRow = matrix[row];

			for (let col = 0; col < matrixRow.length; col++) {
				const colorId = matrixRow[col];

				if (colorId === 0) {
					continue;
				}

				const boardX = piece.x + col;
				const boardY = piece.y + row;

				if (boardX < 0 || boardX >= GRID_COLS || boardY >= GRID_ROWS) {
					throw new Error('[GridService] Attempt to lock piece outside the grid');
				}

				if (boardY < 0) {
					aboveVisibleField = true;
					continue;
				}

				grid.cells[boardY][boardX] = colorId;
			}
		}

		return aboveVisibleField;
	}

	static findFullRows(grid: GridModel): number[] {
		const fullRows: number[] = [];

		for (let y = 0; y < GRID_ROWS; y++) {
			const row = grid.cells[y];
			let isFull = true;

			for (let x = 0; x < row.length; x++) {
				if (row[x] === 0) {
					isFull = false;
					break;
				}
			}

			if (isFull) {
				fullRows.push(y);
			}
		}

		return fullRows;
	}

	static clearRows(grid: GridModel, rows: number[]): void {
		if (rows.length === 0) {
			return;
		}

		const rowsToClear: boolean[] = new Array(GRID_ROWS).fill(false);

		for (const row of rows) {
			rowsToClear[row] = true;
		}

		const remaining: number[][] = [];

		for (let y = 0; y < GRID_ROWS; y++) {
			if (!rowsToClear[y]) {
				remaining.push(grid.cells[y]);
			}
		}

		while (remaining.length < GRID_ROWS) {
			remaining.unshift(new Array(GRID_COLS).fill(0));
		}

		grid.cells = remaining;
	}
}