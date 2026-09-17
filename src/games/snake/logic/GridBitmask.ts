import { cellIndex, wordCount, setBit, clearBit, testBit } from './BitMath.js';

export class GridBitmask {
	public readonly cols: number;
	public readonly rows: number;
	public readonly walls: Uint32Array;
	public readonly foodBits: Uint32Array; // Биты еды (0 или 1)
	public readonly foodExists: Uint32Array; // Наличие еды
	public readonly occupancy: Uint32Array;
	public readonly exit: Uint32Array;

	constructor(cols: number, rows: number) {
		if (cols <= 0 || rows <= 0) {
			throw new Error(`GridBitmask: invalid dimensions ${cols}x${rows}`);
		}
		this.cols = cols;
		this.rows = rows;
		const words = wordCount(cols, rows);
		this.walls = new Uint32Array(words);
		this.foodBits = new Uint32Array(words);
		this.foodExists = new Uint32Array(words);
		this.occupancy = new Uint32Array(words);
		this.exit = new Uint32Array(words);
	}

	public withinBounds(col: number, row: number): boolean {
		return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
	}

	private indexAt(col: number, row: number): number {
		return cellIndex(col, row, this.cols);
	}

	// За пределами поля всегда стена
	public isWall(col: number, row: number): boolean {
		if (!this.withinBounds(col, row)) {
			return true;
		}
		return testBit(this.walls, this.indexAt(col, row));
	}

	public isOccupied(col: number, row: number): boolean {
		if (!this.withinBounds(col, row)) {
			return false;
		}
		return testBit(this.occupancy, this.indexAt(col, row));
	}

	public isFood(col: number, row: number): boolean {
		if (!this.withinBounds(col, row)) {
			return false;
		}
		return testBit(this.foodExists, this.indexAt(col, row));
	}

	public getFoodBit(col: number, row: number): 0 | 1 {
		if (!this.withinBounds(col, row)) {
			return 0;
		}
		return testBit(this.foodBits, this.indexAt(col, row)) ? 1 : 0;
	}

	public isExit(col: number, row: number): boolean {
		if (!this.withinBounds(col, row)) {
			return false;
		}
		return testBit(this.exit, this.indexAt(col, row));
	}

	public setWall(col: number, row: number): void {
		setBit(this.walls, this.indexAt(col, row));
	}

	public setFood(col: number, row: number, bit: 0 | 1): void {
		setBit(this.foodExists, this.indexAt(col, row));
		if (bit === 1) {
			setBit(this.foodBits, this.indexAt(col, row));
		} else {
			clearBit(this.foodBits, this.indexAt(col, row));
		}
	}

	public clearFood(col: number, row: number): void {
		clearBit(this.foodExists, this.indexAt(col, row));
		clearBit(this.foodBits, this.indexAt(col, row));
	}

	public setOccupied(col: number, row: number): void {
		setBit(this.occupancy, this.indexAt(col, row));
	}

	public clearOccupied(col: number, row: number): void {
		clearBit(this.occupancy, this.indexAt(col, row));
	}

	public setExit(col: number, row: number): void {
		setBit(this.exit, this.indexAt(col, row));
	}

	public clearExit(col: number, row: number): void {
		clearBit(this.exit, this.indexAt(col, row));
	}

	public buildPerimeter(): void {
		for (let col = 0; col < this.cols; col++) {
			this.setWall(col, 0);
			this.setWall(col, this.rows - 1);
		}
		for (let row = 0; row < this.rows; row++) {
			this.setWall(0, row);
			this.setWall(this.cols - 1, row);
		}
	}

	public countFood(): number {
		let count = 0;
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				if (this.isFood(col, row)) {
					count = count + 1;
				}
			}
		}
		return count;
	}

	public clearAll(): void {
		this.walls.fill(0);
		this.foodBits.fill(0);
		this.foodExists.fill(0);
		this.occupancy.fill(0);
		this.exit.fill(0);
	}
}
