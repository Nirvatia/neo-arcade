import type { Container, Graphics } from 'pixi.js';
import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import type { BitOp } from '../../components/index.js';
import type { Biome, BiomePalette, BiomeTheme } from '../Biome.js';
import type {
	FoodRender,
	OverlayPalette,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from '../renderData.js';
import { LUNAR_PALETTE, LUNAR_THEME, LUNAR_OVERLAY } from './LunarPalette.js';
import { LunarFieldRenderer } from './LunarFieldRenderer.js';
import { LunarExitRenderer } from './LunarExitRenderer.js';
import { LunarFoodRenderer } from './LunarFoodRenderer.js';
import { LunarSnakeRenderer } from './LunarSnakeRenderer.js';
import { LunarTokenFactory } from './LunarTokenFactory.js';
import { LunarAmbient } from './LunarAmbient.js';
import { LunarOverlayRenderer } from './LunarOverlayRenderer.js';
import { LunarParticleRenderer } from './LunarParticleRenderer.js';

export class LunarBiome implements Biome {
	public readonly id = 'lunar';
	public readonly palette: BiomePalette = LUNAR_PALETTE;
	public readonly theme: BiomeTheme = LUNAR_THEME;
	public readonly overlay: OverlayPalette = LUNAR_OVERLAY;
	public readonly particleRenderer = new LunarParticleRenderer();

	private readonly overlayRenderer = new LunarOverlayRenderer();
	private readonly fieldRenderer = new LunarFieldRenderer();
	private readonly exitRenderer = new LunarExitRenderer();
	private readonly foodRenderer = new LunarFoodRenderer();
	private readonly snakeRenderer = new LunarSnakeRenderer();
	private readonly tokenFactory = new LunarTokenFactory();
	private readonly ambient = new LunarAmbient();

	public renderField(g: Graphics, grid: GridBitmask, cellSize: number): void {
		this.fieldRenderer.render(g, grid, cellSize);
	}

	public renderExit(
		g: Graphics,
		grid: GridBitmask,
		timeMS: number,
		cellSize: number
	): void {
		this.exitRenderer.render(g, grid, timeMS, cellSize);
	}

	public renderFood(
		g: Graphics,
		foods: FoodRender[],
		timeMS: number,
		cellSize: number
	): void {
		this.foodRenderer.render(g, foods, timeMS, cellSize);
	}

	public renderSnake(
		g: Graphics,
		chain: SnakeChainPoint[],
		zones: SnakeZoneStyle[],
		head: SnakeHeadRender,
		timeMS: number,
		cellSize: number
	): void {
		this.snakeRenderer.render(g, chain, zones, head, timeMS, cellSize);
	}

	public createTokenVisual(op: BitOp, cellSize: number): Container {
		return this.tokenFactory.create(op, cellSize);
	}

	public getAmbientContainer(): Container {
		return this.ambient.container;
	}

	public renderOverlay(
		g: Graphics,
		width: number,
		height: number,
		timeMS: number,
		cellSize: number
	): void {
		this.overlayRenderer.render(g, width, height, timeMS, cellSize);
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

	public destroy(): void {
		this.snakeRenderer.destroy?.();
		this.ambient.destroy();
	}
}