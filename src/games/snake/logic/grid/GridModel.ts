import { wordCount } from '../math/BitMath.js';

/**
 * GridModel — только данные.
 * Хранит битовые маски и размеры поля.
 * Не содержит логики чтения/записи отдельных клеток.
 */
export class GridModel {
	public readonly cols: number;
	public readonly rows: number;

	/**
	 * Режим без рамок.
	 *
	 * Если включён, границы поля не являются стенами,
	 * а координаты заворачиваются на противоположную сторону.
	 */
	public readonly wrap: boolean;

	public readonly walls: Uint32Array;
	public readonly foodBits: Uint32Array;
	public readonly foodExists: Uint32Array;
	public readonly occupancy: Uint32Array;
	public readonly exit: Uint32Array;

	constructor(cols: number, rows: number, wrap = false) {
		if (cols <= 0 || rows <= 0) {
			throw new Error(`GridModel: invalid dimensions ${cols}x${rows}`);
		}

		this.cols = cols;
		this.rows = rows;
		this.wrap = wrap;

		const words = wordCount(cols, rows);

		this.walls = new Uint32Array(words);
		this.foodBits = new Uint32Array(words);
		this.foodExists = new Uint32Array(words);
		this.occupancy = new Uint32Array(words);
		this.exit = new Uint32Array(words);
	}

	/**
	 * Заворачивает координаты, если включён режим без рамок.
	 */
	public wrapPosition(col: number, row: number): { col: number; row: number } {
		if (!this.wrap) {
			return { col, row };
		}

		let c = col % this.cols;

		if (c < 0) {
			c += this.cols;
		}

		let r = row % this.rows;

		if (r < 0) {
			r += this.rows;
		}

		return { col: c, row: r };
	}

	public clearAllFood(): void {
		this.foodBits.fill(0);
		this.foodExists.fill(0);
	}
}