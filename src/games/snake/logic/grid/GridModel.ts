import { wordCount } from '../BitMath.js';

/**
 * GridModel — только данные.
 * Хранит битовые маски и размеры поля.
 * Не содержит логики чтения/записи отдельных клеток.
 */
export class GridModel {
	public readonly cols: number;
	public readonly rows: number;
	public readonly walls: Uint32Array;
	public readonly foodBits: Uint32Array;
	public readonly foodExists: Uint32Array;
	public readonly occupancy: Uint32Array;
	public readonly exit: Uint32Array;

	constructor(cols: number, rows: number) {
		if (cols <= 0 || rows <= 0) {
			throw new Error(`GridModel: invalid dimensions ${cols}x${rows}`);
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

	public clearAll(): void {
		this.walls.fill(0);
		this.foodBits.fill(0);
		this.foodExists.fill(0);
		this.occupancy.fill(0);
		this.exit.fill(0);
	}

	public clearAllFood(): void {
		this.foodBits.fill(0);
		this.foodExists.fill(0);
	}
}