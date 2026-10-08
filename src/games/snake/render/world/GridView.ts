import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import type { BiomeManager } from '../../biomes/index.js';

export class GridView {
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;

	private readonly backgroundCanvas: HTMLCanvasElement;
	private readonly backgroundCtx: CanvasRenderingContext2D;

	private cachedGrid: GridBitmask | null = null;
	private logicalWidth = 0;
	private logicalHeight = 0;

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;

		this.backgroundCanvas = document.createElement('canvas');

		const ctx = this.backgroundCanvas.getContext('2d', { alpha: false });
		if (ctx === null) {
			throw new Error('GridView: cannot create 2D background context.');
		}

		this.backgroundCtx = ctx;
	}

	public invalidate(): void {
		this.cachedGrid = null;
	}

	public renderBackground(grid: GridBitmask): void {
		if (this.cachedGrid === grid) {
			return;
		}

		const width = grid.cols * this.cellSize;
		const height = grid.rows * this.cellSize;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		this.logicalWidth = width;
		this.logicalHeight = height;

		this.backgroundCanvas.width = Math.max(1, Math.round(width * dpr));
		this.backgroundCanvas.height = Math.max(1, Math.round(height * dpr));

		this.backgroundCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.backgroundCtx.clearRect(0, 0, width, height);

		this.biomes.biome.renderField(this.backgroundCtx, grid, this.cellSize);

		this.cachedGrid = grid;
	}

	public drawBackground(ctx: CanvasRenderingContext2D): void {
		if (this.cachedGrid === null) {
			return;
		}

		ctx.drawImage(
			this.backgroundCanvas,
			0,
			0,
			this.logicalWidth,
			this.logicalHeight
		);
	}

	public renderExit(
		ctx: CanvasRenderingContext2D,
		grid: GridBitmask,
		timeMS: number
	): void {
		this.biomes.biome.renderExit(ctx, grid, timeMS, this.cellSize);
	}

	public destroy(): void {
		this.cachedGrid = null;
	}
}