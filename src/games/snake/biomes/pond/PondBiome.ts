import type { Container, Graphics } from 'pixi.js';
import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import type { BitOp } from '../../components/index.js';
import type { Biome, BiomePalette, BiomeTheme } from '../Biome.js';
import type {
	FoodRender,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from '../renderData.js';
import { POND_PALETTE, POND_THEME } from './PondPalette.js';
import { PondFieldRenderer } from './PondFieldRenderer.js';
import { PondExitRenderer } from './PondExitRenderer.js';
import { PondFoodRenderer } from './PondFoodRenderer.js';
import { PondSnakeRenderer } from './PondSnakeRenderer.js';
import { PondTokenFactory } from './PondTokenFactory.js';
import { PondAmbient } from './PondAmbient.js';
import type { OverlayPalette } from '../renderData.js';
import {  POND_OVERLAY } from './PondPalette.js';
import { PondOverlayRenderer } from './PondOverlayRenderer.js';
import { PondParticleRenderer } from './PondParticleRenderer.js';

export class PondBiome implements Biome {
	public readonly id = 'pond';
	public readonly palette: BiomePalette = POND_PALETTE;
	public readonly theme: BiomeTheme = POND_THEME;
	public readonly overlay: OverlayPalette = POND_OVERLAY;

	private readonly overlayRenderer = new PondOverlayRenderer();
	private readonly fieldRenderer = new PondFieldRenderer();
	private readonly exitRenderer = new PondExitRenderer();
	private readonly foodRenderer = new PondFoodRenderer();
	private readonly snakeRenderer = new PondSnakeRenderer();
	private readonly tokenFactory = new PondTokenFactory();
	private readonly ambient = new PondAmbient();
	public readonly particleRenderer = new PondParticleRenderer();
	
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
	public renderOverlay(g: Graphics, width: number, height: number, timeMS: number, cellSize: number): void {
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
		//this.foodRenderer.destroy?.();
		this.snakeRenderer.destroy?.();
		this.ambient.destroy();
	}
}