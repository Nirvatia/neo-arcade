import type { BitOp } from '../../components/index.js';
import type { BiomeManager } from '../../biomes/index.js';

export interface TokenRender {
	col: number;
	row: number;
	op: BitOp;
}

export class TokenView {
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;
	}

	public render(
		ctx: CanvasRenderingContext2D,
		tokens: TokenRender[],
		timeMS: number
	): void {
		for (const token of tokens) {
			const x = token.col * this.cellSize;
			const y = token.row * this.cellSize;

			this.biomes.biome.renderToken(
				ctx,
				token.op,
				x,
				y,
				this.cellSize,
				timeMS
			);
		}
	}

	public destroy(): void {
		// Сейчас TokenView не хранит разрушаемых ресурсов.
	}
}