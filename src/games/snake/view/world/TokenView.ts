import { Container } from 'pixi.js';
import type { BitOp } from '../../components/index.js';
import type { BiomeManager } from '../../biomes/index.js';
import { RenderConfig } from '../../config/RenderConfig.js';

export interface TokenRender {
	col: number;
	row: number;
	op: BitOp;
}

class TokenVisual {
	public readonly container: Container;

	private readonly biomes: BiomeManager;
	private readonly cellSize: number;

	private currentVisual: Container | null = null;
	private currentOp: BitOp | null = null;
	private currentBiomeId: string | null = null;

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;
		this.container = new Container();
		this.container.visible = false;
	}

	public show(token: TokenRender): void {
		this.container.visible = true;
		this.container.x = token.col * this.cellSize;
		this.container.y = token.row * this.cellSize;

		const biome = this.biomes.biome;

		if (this.currentOp !== token.op || this.currentBiomeId !== biome.id) {
			if (this.currentVisual !== null) {
				this.container.removeChild(this.currentVisual);
				this.currentVisual.destroy({ children: true });
			}

			this.currentVisual = biome.createTokenVisual(token.op, this.cellSize);
			this.container.addChild(this.currentVisual);

			this.currentOp = token.op;
			this.currentBiomeId = biome.id;
		}
	}

	public hide(): void {
		this.container.visible = false;
	}

	public destroy(): void {
		if (this.currentVisual !== null) {
			this.currentVisual.destroy({ children: true });
		}
		this.container.destroy();
	}
}

export class TokenView {
	public readonly container: Container;
	private readonly visuals: TokenVisual[] = [];

	constructor(cellSize: number, biomes: BiomeManager) {
		this.container = new Container();

		for (let i = 0; i < RenderConfig.MAX_TOKEN_VISUALS; i++) {
			const visual = new TokenVisual(cellSize, biomes);
			this.visuals.push(visual);
			this.container.addChild(visual.container);
		}
	}

	public render(tokens: TokenRender[], _timeMS: number): void {
		for (let i = 0; i < this.visuals.length; i++) {
			const visual = this.visuals[i];
			if (visual === undefined) {
				continue;
			}

			const token = tokens[i];
			if (token === undefined) {
				visual.hide();
			} else {
				visual.show(token);
			}
		}
	}

	public destroy(): void {
		for (const visual of this.visuals) {
			visual.destroy();
		}
		this.container.destroy();
	}
}