import { Container, Graphics } from 'pixi.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import type { BiomeManager } from '../biomes/index.js';

export class GridView {
	public readonly container: Container;
	private readonly backgroundGraphics: Graphics;
	private readonly exitGraphics: Graphics;
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;
		this.container = new Container();
		this.backgroundGraphics = new Graphics();
		this.exitGraphics = new Graphics();
		this.container.addChild(this.backgroundGraphics);
		this.container.addChild(this.exitGraphics);
	}

	public renderBackground(grid: GridBitmask): void {
		this.backgroundGraphics.clear();
		this.biomes.biome.renderField(this.backgroundGraphics, grid, this.cellSize);
	}

	public renderExit(grid: GridBitmask, timeMS: number): void {
		this.exitGraphics.clear();
		this.biomes.biome.renderExit(this.exitGraphics, grid, timeMS, this.cellSize);
	}
}