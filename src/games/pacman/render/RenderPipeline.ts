import type { Director } from '../core/Director';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';
import type { LevelLoader } from '../logic/level/LevelLoader';
import { SharedLayers } from './SharedLayers';
import { SeasonLevelRenderer } from './seasons/SeasonLevelRenderer';
import { DoomLevelRenderer } from './doom/DoomLevelRenderer';
import type { LevelRenderer } from './RenderFrame';

/**
 * Owns the canvas (HiDPI sizing, render clock) and hands each frame to the renderer of the
 * current level kind. Renderers live as long as the pipeline so their animation state
 * (weather, effects, the baked hell world) survives between frames.
 */
export class RenderPipeline {
	private readonly container: HTMLElement;
	private readonly director: Director;
	private readonly level: LevelLoader;
	private readonly unsubscribeCues: () => void;
	private readonly seasonRenderer: LevelRenderer;
	private readonly doomRenderer: LevelRenderer;
	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private width = 0;
	private height = 0;
	private pixelRatio = 1;
	private lastRenderTime = 0;
	private timeValue = 0;

	constructor(
		container: HTMLElement,
		director: Director,
		level: LevelLoader,
		events?: EventBus<PacmanEventMap>
	) {
		if (typeof document === 'undefined') {
			throw new Error('RenderPipeline.constructor: document is unavailable');
		}
		if (!container || !director || !level) {
			console.error('RenderPipeline.constructor', 'missing dependency');
			throw new Error('RenderPipeline.constructor: missing dependency');
		}
		this.container = container;
		this.director = director;
		this.level = level;
		const shared = new SharedLayers();
		this.unsubscribeCues = events
			? events.on('audio:cue', (payload) => shared.playerView.trigger(payload.cue))
			: () => {};
		this.seasonRenderer = new SeasonLevelRenderer(shared);
		this.doomRenderer = new DoomLevelRenderer(shared);
		this.canvas = document.createElement('canvas');
		this.canvas.style.display = 'block';
		container.appendChild(this.canvas);
		const ctx = this.canvas.getContext('2d', { alpha: false });
		if (!ctx) {
			throw new Error('RenderPipeline.constructor: 2d context unavailable');
		}
		this.ctx = ctx;
	}

	render(): void {
		const now = typeof performance !== 'undefined' ? performance.now() : 0;
		const dt = this.lastRenderTime > 0 ? Math.min(0.1, (now - this.lastRenderTime) / 1000) : 0;
		this.lastRenderTime = now;
		this.timeValue += dt;

		if (!this.syncSize()) {
			return;
		}

		const season = this.level.season;
		const grid = this.level.grid;
		const progress = this.level.progress;
		if (!season || !grid || !progress) {
			return;
		}

		this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
		this.ctx.globalAlpha = 1;
		this.ctx.globalCompositeOperation = 'source-over';
		this.ctx.imageSmoothingEnabled = true;

		const renderer = this.level.hellMode ? this.doomRenderer : this.seasonRenderer;
		renderer.render({
			ctx: this.ctx,
			width: this.width,
			height: this.height,
			pixelRatio: this.pixelRatio,
			dt,
			time: this.timeValue,
			state: this.director.stateName,
			director: this.director,
			level: this.level,
			season,
			grid,
			progress
		});
	}

	destroy(): void {
		this.unsubscribeCues();
		this.canvas.remove();
	}

	private syncSize(): boolean {
		const rectWidth = this.container.clientWidth;
		const rectHeight = this.container.clientHeight;
		if (!(rectWidth > 0) || !(rectHeight > 0)) {
			return false;
		}
		const width = Math.floor(rectWidth);
		const height = Math.floor(rectHeight);
		const deviceRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
		const pixelRatio = Math.min(
			2,
			Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1
		);
		if (width === this.width && height === this.height && pixelRatio === this.pixelRatio) {
			return true;
		}
		this.width = width;
		this.height = height;
		this.pixelRatio = pixelRatio;
		this.canvas.width = Math.round(width * pixelRatio);
		this.canvas.height = Math.round(height * pixelRatio);
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		return true;
	}
}
