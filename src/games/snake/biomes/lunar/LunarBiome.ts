import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import type { BitOp } from '../../components/index.js';
import type { Biome, BiomePalette, BiomeTheme } from '../contract/Biome.js';
import type {
	FoodRender,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from '../contract/renderData.js';
import type { BiomeVariant } from './LunarPalette.js';
import { LunarFieldRenderer } from './LunarFieldRenderer.js';
import { LunarExitRenderer } from './LunarExitRenderer.js';
import { LunarFoodRenderer } from './LunarFoodRenderer.js';
import { LunarSnakeRenderer } from './LunarSnakeRenderer.js';
import { LunarTokenFactory } from './LunarTokenFactory.js';
import { LunarAmbient } from './LunarAmbient.js';
import { LunarParticleRenderer } from './LunarParticleRenderer.js';

/**
 * LunarBiome теперь параметризуется вариантом.
 *
 * Это позволяет иметь несколько биомов на одной арт-базе,
 * но с разными палитрами, темами и идентификаторами.
 */
export class LunarBiome implements Biome {
	public readonly id: string;
	public readonly palette: BiomePalette;
	public readonly theme: BiomeTheme;
	public readonly particleRenderer = new LunarParticleRenderer();

	private readonly fieldRenderer = new LunarFieldRenderer();
	private readonly exitRenderer = new LunarExitRenderer();
	private readonly foodRenderer = new LunarFoodRenderer();
	private readonly snakeRenderer = new LunarSnakeRenderer();
	private readonly tokenFactory = new LunarTokenFactory();
	private readonly ambient = new LunarAmbient();

	constructor(variant: BiomeVariant) {
		this.id = variant.id;
		this.palette = variant.palette;
		this.theme = variant.theme;
	}

	public renderField(ctx: CanvasRenderingContext2D, grid: GridBitmask, cellSize: number): void {
		this.fieldRenderer.render(ctx, grid, cellSize);
	}

	public renderExit(
		ctx: CanvasRenderingContext2D,
		grid: GridBitmask,
		timeMS: number,
		cellSize: number
	): void {
		this.exitRenderer.render(ctx, grid, timeMS, cellSize);
	}

	public renderFood(
		ctx: CanvasRenderingContext2D,
		foods: FoodRender[],
		timeMS: number,
		cellSize: number
	): void {
		this.foodRenderer.render(ctx, foods, timeMS, cellSize);
	}

	public renderSnake(
		ctx: CanvasRenderingContext2D,
		chain: SnakeChainPoint[],
		zones: SnakeZoneStyle[],
		head: SnakeHeadRender,
		timeMS: number,
		cellSize: number
	): void {
		this.snakeRenderer.render(ctx, chain, zones, head, timeMS, cellSize);
	}

	public renderToken(
		ctx: CanvasRenderingContext2D,
		op: BitOp,
		x: number,
		y: number,
		cellSize: number
	): void {
		this.tokenFactory.render(ctx, op, x, y, cellSize);
	}

	public updateAmbient(
		deltaMS: number,
		timeMS: number,
		cellSize: number,
		cols: number,
		rows: number
	): void {
		this.ambient.update(deltaMS, timeMS, cellSize, cols, rows);
	}

	public renderAmbient(ctx: CanvasRenderingContext2D): void {
		this.ambient.render(ctx);
	}

	public renderAmbientForeground(ctx: CanvasRenderingContext2D): void {
		this.ambient.renderForeground(ctx);
	}

	public destroy(): void {
		this.snakeRenderer.destroy?.();
		this.ambient.destroy();
	}
}

export function createLunarBiome(variant: BiomeVariant): LunarBiome {
	return new LunarBiome(variant);
}