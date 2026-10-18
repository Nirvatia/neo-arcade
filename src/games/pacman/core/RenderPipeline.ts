import type { Director } from './Director';

export class RenderPipeline {
	private readonly director: Director;
	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly width: number;
	private readonly height: number;

	constructor(container: HTMLElement, director: Director, width = 560, height = 620) {
		if (typeof document === 'undefined') {
			console.error('RenderPipeline.constructor', 'document is unavailable');
			throw new Error('RenderPipeline.constructor: document is unavailable');
		}
		if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
			console.error('RenderPipeline.constructor', 'invalid canvas size', { width, height });
			throw new Error('RenderPipeline.constructor: canvas size must be positive');
		}
		this.director = director;
		this.width = Math.floor(width);
		this.height = Math.floor(height);
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.canvas.style.display = 'block';
		this.canvas.style.imageRendering = 'pixelated';
		container.appendChild(this.canvas);
		const ctx = this.canvas.getContext('2d');
		if (!ctx) {
			console.error('RenderPipeline.constructor', '2d context unavailable');
			throw new Error('RenderPipeline.constructor: 2d context unavailable');
		}
		this.ctx = ctx;
		this.ctx.imageSmoothingEnabled = false;
	}

	render(): void {
		this.ctx.fillStyle = '#030509';
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.ctx.fillStyle = '#e8efff';
		this.ctx.font = '16px monospace';
		this.ctx.textAlign = 'left';
		this.ctx.textBaseline = 'top';
		this.ctx.fillText(`STATE ${this.director.stateName.toUpperCase()}`, 16, 16);
		this.ctx.fillStyle = '#7585a3';
		this.ctx.fillText('ENTER start · SPACE pause · ESC menu', 16, 40);
	}

	destroy(): void {
		this.canvas.remove();
	}
}