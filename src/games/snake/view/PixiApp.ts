import { Application, Container } from 'pixi.js';

const ZOOM_DURATION_MS = 420;

interface ZoomState {
	fromScaleX: number;
	fromScaleY: number;
	toWidth: number;
	toHeight: number;
	elapsedMS: number;
}

export class PixiApp {
	public readonly app: Application;
	private zoom: ZoomState | null = null;
	private lastWidth = 0;
	private lastHeight = 0;

	constructor() {
		this.app = new Application();
	}

	public async init(
		canvasParent: HTMLDivElement,
		width: number,
		height: number,
		background: number
	): Promise<void> {
		await this.app.init({
			width,
			height,
			background,
			antialias: true,
			// Резкий рендер на retina/HiDPI.
			resolution: Math.min(window.devicePixelRatio || 1, 2),
			autoDensity: true
		});
		this.lastWidth = width;
		this.lastHeight = height;
		canvasParent.appendChild(this.app.canvas);
		this.app.canvas.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.6)';
		this.app.canvas.style.borderRadius = '6px';
	}

	public get stage(): Container {
		return this.app.stage;
	}

	public addTickerCallback(callback: (deltaMS: number) => void): void {
		this.app.ticker.add((ticker) => {
			callback(ticker.deltaMS);
		});
	}

	// Мгновенный ресайз: старт и рестарт.
	public resize(width: number, height: number): void {
		this.resetZoom();
		this.lastWidth = width;
		this.lastHeight = height;
		this.app.renderer.resize(width, height);
		this.app.canvas.style.width = `${width}px`;
		this.app.canvas.style.height = `${height}px`;
	}

	// Плавное расширение: поле «вдыхает» от старого размера к новому (easeOutCubic).
	public animateResize(width: number, height: number): void {
		if (width === this.lastWidth && height === this.lastHeight && this.zoom === null) {
			return;
		}
		const oldWidth = this.lastWidth || width;
		const oldHeight = this.lastHeight || height;
		this.lastWidth = width;
		this.lastHeight = height;
		this.app.renderer.resize(width, height);
		this.app.canvas.style.width = `${width}px`;
		this.app.canvas.style.height = `${height}px`;
		this.zoom = {
			fromScaleX: oldWidth / width,
			fromScaleY: oldHeight / height,
			toWidth: width,
			toHeight: height,
			elapsedMS: 0
		};
		this.applyZoom(0);
	}

	// Вызывать из тикера каждый кадр.
	public updateZoom(deltaMS: number): void {
		if (this.zoom === null) {
			return;
		}
		this.zoom.elapsedMS = this.zoom.elapsedMS + deltaMS;
		const progress = Math.min(1, this.zoom.elapsedMS / ZOOM_DURATION_MS);
		this.applyZoom(progress);
		if (progress >= 1) {
			this.resetZoom();
		}
	}

	private applyZoom(progress01: number): void {
		const zoom = this.zoom;
		if (zoom === null) {
			return;
		}
		const eased = 1 - Math.pow(1 - progress01, 3);
		const scaleX = zoom.fromScaleX + (1 - zoom.fromScaleX) * eased;
		const scaleY = zoom.fromScaleY + (1 - zoom.fromScaleY) * eased;
		this.app.stage.scale.set(scaleX, scaleY);
		this.app.stage.x = Math.round((zoom.toWidth * (1 - scaleX)) / 2);
		this.app.stage.y = Math.round((zoom.toHeight * (1 - scaleY)) / 2);
	}

	private resetZoom(): void {
		this.zoom = null;
		this.app.stage.scale.set(1);
		this.app.stage.x = 0;
		this.app.stage.y = 0;
	}

	public destroy(): void {
		this.zoom = null;
		this.app.destroy(true, { children: true });
	}
}