import type { Director } from './Director';
import type { LevelLoader } from '../logic/LevelLoader';
import { GridView } from '../render/GridView';
import type { GridLayout } from '../render/GridView';
import { PlayerView } from '../render/PlayerView';
import { GhostView } from '../render/GhostView';
import { FruitView } from '../render/FruitView';
import { GoldenEggView } from '../render/GoldenEggView';
import { UltraGhostView } from '../render/UltraGhostView';
import { DeathWaveView } from '../render/DeathWaveView';
import { WeatherView } from '../render/WeatherView';
import { SpeedBoltView } from '../render/SpeedBoltView';

const DEATH_TOTAL_DURATION = 1.35;

export class RenderPipeline {
	private readonly director: Director;
	private readonly level: LevelLoader;
	private readonly gridView: GridView;
	private readonly playerView: PlayerView;
	private readonly ghostView: GhostView;
	private readonly fruitView: FruitView;
	private readonly goldenEggView: GoldenEggView;
	private readonly ultraGhostView: UltraGhostView;
	private readonly deathWaveView: DeathWaveView;
	private readonly weatherView: WeatherView;
	private readonly speedBoltView: SpeedBoltView;
	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly width: number;
	private readonly height: number;
	private lastRenderTime = 0;

	constructor(container: HTMLElement, director: Director, level: LevelLoader, width = 560, height = 620) {
		if (typeof document === 'undefined') {
			console.error('RenderPipeline.constructor', 'document is unavailable');
			throw new Error('RenderPipeline.constructor: document is unavailable');
		}
		if (!container) {
			console.error('RenderPipeline.constructor', 'missing container');
			throw new Error('RenderPipeline.constructor: missing container');
		}
		if (!director) {
			console.error('RenderPipeline.constructor', 'missing director');
			throw new Error('RenderPipeline.constructor: missing director');
		}
		if (!level) {
			console.error('RenderPipeline.constructor', 'missing level loader');
			throw new Error('RenderPipeline.constructor: missing level loader');
		}
		if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
			console.error('RenderPipeline.constructor', 'invalid canvas size', { width, height });
			throw new Error('RenderPipeline.constructor: canvas size must be positive');
		}
		this.director = director;
		this.level = level;
		this.gridView = new GridView();
		this.playerView = new PlayerView();
		this.ghostView = new GhostView();
		this.fruitView = new FruitView();
		this.goldenEggView = new GoldenEggView();
		this.ultraGhostView = new UltraGhostView();
		this.deathWaveView = new DeathWaveView();
		this.weatherView = new WeatherView();
		this.speedBoltView = new SpeedBoltView();
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
		const now = typeof performance !== 'undefined' ? performance.now() : 0;
		const dt = this.lastRenderTime > 0 ? Math.min(0.1, (now - this.lastRenderTime) / 1000) : 0;
		this.lastRenderTime = now;
		const season = this.level.season;
		const background = season
			? this.lerpHex(season.palette.background, season.palette.backgroundNight, this.dayNightRatio())
			: '#030509';
		this.ctx.fillStyle = background;
		this.ctx.fillRect(0, 0, this.width, this.height);
		const grid = this.level.grid;
		const progress = this.level.progress;
		const combat = this.level.combat;
		if (!grid || !progress) {
			return;
		}
		const palette = season ? season.palette : null;
		const ratio = this.dayNightRatio();
		const layout = this.gridView.draw(this.ctx, grid, progress, this.width, this.height, palette, ratio);
		const fruit = this.level.fruit;
		if (fruit) {
			this.fruitView.draw(this.ctx, fruit, layout);
		}
		const egg = this.level.egg;
		if (egg) {
			this.goldenEggView.draw(this.ctx, egg, layout);
		}
		const bolt = this.level.bolt;
		const worldVisible = this.director.stateName !== 'menu';
		if (bolt && worldVisible) {
			this.speedBoltView.draw(this.ctx, bolt, layout);
		}
		const ultra = this.level.ultra;
		if (ultra && worldVisible) {
			this.ultraGhostView.draw(this.ctx, ultra, layout);
		}
		const ghosts = this.level.ghosts;
		if (ghosts && !(ultra && ultra.contractActive)) {
			const isMs = this.level.profile === 'ms-pacman';
			const hypnosis = this.level.hypnosis;
			const ghostTimer = isMs
				? hypnosis
					? hypnosis.overdriveTimer
					: 0
				: combat
					? combat.powerTimer
					: 0;
			const msOverdrive = Boolean(isMs && hypnosis && hypnosis.overdriveActive);
			this.ghostView.draw(this.ctx, ghosts, layout, ghostTimer, msOverdrive);
		}
		const state = this.director.stateName;
		if (state === 'death') {
			this.drawDeathWave(grid.width, grid.height, layout);
			return;
		}
		const player = this.level.player;
		if (player) {
			this.playerView.draw(this.ctx, player, layout);
		}
		if (season && worldVisible) {
			this.weatherView.draw(this.ctx, layout, grid.width, grid.height, season.name, dt);
		}
	}

	destroy(): void {
		this.canvas.remove();
	}

	private dayNightRatio(): number {
		const progress = this.level.progress;
		if (!progress) {
			return 0;
		}
		return progress.collectionRatio;
	}

	private drawDeathWave(gridWidth: number, gridHeight: number, layout: GridLayout): void {
		const player = this.level.player;
		if (!player) {
			return;
		}
		const remaining = this.director.overlayTimer;
		const linear = 1 - Math.min(1, Math.max(0, remaining / DEATH_TOTAL_DURATION));
		const position = player.position;
		this.deathWaveView.draw(
			this.ctx,
			layout,
			gridWidth,
			gridHeight,
			position.x,
			position.y,
			linear
		);
	}

	private lerpHex(dayHex: string, nightHex: string, t: number): string {
		const d = this.parseHex(dayHex);
		const n = this.parseHex(nightHex);
		if (!d || !n) {
			return dayHex;
		}
		const ratio = Math.min(1, Math.max(0, t));
		const r = Math.round(d.r + (n.r - d.r) * ratio);
		const g = Math.round(d.g + (n.g - d.g) * ratio);
		const b = Math.round(d.b + (n.b - d.b) * ratio);
		return `rgb(${r},${g},${b})`;
	}

	private parseHex(hex: string): { r: number; g: number; b: number } | null {
		if (!hex || hex.length !== 7 || hex[0] !== '#') {
			return null;
		}
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
			return null;
		}
		return { r, g, b };
	}
}