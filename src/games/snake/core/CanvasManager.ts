import type { PixiApp } from '../view/PixiApp.js';
import { GridConfig } from '../config/index.js';
import type { GridService } from '../logic/grid/GridService.js';

export class CanvasManager {
	private readonly pixiApp: PixiApp;
	private readonly service: GridService;
	private firstResizeDone = false;

	constructor(pixiApp: PixiApp, service: GridService) {
		this.pixiApp = pixiApp;
		this.service = service;
	}

	/**
	 * Приводит канвас к текущему размеру поля.
	 * Первый вызов после старта/рестарта — мгновенный.
	 * Дальше (при расширении) — плавный через PixiApp.animateResize.
	 */
	public resizeToGrid(): void {
		const grid = this.service.grid;
		const width = grid.cols * GridConfig.CELL_SIZE;
		const height = grid.rows * GridConfig.CELL_SIZE;

		if (!this.firstResizeDone) {
			this.firstResizeDone = true;
			this.pixiApp.resize(width, height);
			return;
		}

		this.pixiApp.animateResize(width, height);
	}
}