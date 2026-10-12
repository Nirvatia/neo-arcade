import { prepareCanvas } from './canvasUtils';

export class CanvasManager {
	public readonly canvas: HTMLCanvasElement;
	public readonly ctx: CanvasRenderingContext2D;
	private readonly logicalWidth: number;
	private readonly logicalHeight: number;

	private readonly handleResize = (): void => {
		this.applySize();
	};

	constructor(width: number, height: number) {
		this.logicalWidth = width;
		this.logicalHeight = height;

		this.canvas = document.createElement('canvas');

		const ctx = this.canvas.getContext('2d');
		if (!ctx) {
			throw new Error('[Tetris] Failed to get 2D context');
		}

		this.ctx = ctx;
		this.applySize();
	}

	mount(parent: HTMLDivElement): void {
		parent.appendChild(this.canvas);
		window.addEventListener('resize', this.handleResize);
		window.addEventListener('orientationchange', this.handleResize);
	}

	destroy(): void {
		window.removeEventListener('resize', this.handleResize);
		window.removeEventListener('orientationchange', this.handleResize);

		if (this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas);
		}
	}

	clear(): void {
		this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
	}

	private applySize(): void {
		const prepared = prepareCanvas(this.canvas, this.logicalWidth, this.logicalHeight);
		if (!prepared) {
			throw new Error('[Tetris] Failed to prepare canvas');
		}

		prepared.imageSmoothingEnabled = false;
	}
}