import type { CanvasSurface } from './CanvasSurface.js';
import { GridConfig } from '../config/index.js';
import type { GridService } from '../logic/grid/GridService.js';

export class CanvasManager {
	private readonly surface: CanvasSurface;
	private readonly service: GridService;

	constructor(surface: CanvasSurface, service: GridService) {
		this.surface = surface;
		this.service = service;
	}

	public resizeToGrid(): void {
		const grid = this.service.grid;

		const width = grid.cols * GridConfig.CELL_SIZE;
		const height = grid.rows * GridConfig.CELL_SIZE;

		this.surface.setSize(width, height);
	}
}