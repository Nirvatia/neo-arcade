import type { Director } from './Director';
import type { LevelLoader } from '../logic/LevelLoader';
import { GridView } from '../render/GridView';
import { PlayerView } from '../render/PlayerView';
import { GhostView } from '../render/GhostView';
import { FruitView } from '../render/FruitView';
import { GoldenEggView } from '../render/GoldenEggView';
import { UltraGhostView } from '../render/UltraGhostView';

export class RenderPipeline {
	private readonly director: Director;
	private readonly level: LevelLoader;
	private readonly gridView: GridView;
	private readonly playerView: PlayerView;
	private readonly ghostView: GhostView;
	private readonly fruitView: FruitView;
	private readonly goldenEggView: GoldenEggView;
	private readonly ultraGhostView: UltraGhostView;
	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly width: number;
	private readonly height: number;
	private fps = 0;
	private frames = 0;
	private fpsTime = 0;
	private lastFrameTime = 0;

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
		const now = typeof performance === 'undefined' ? 0 : performance.now();

		if (this.lastFrameTime === 0) {
			this.lastFrameTime = now;
		}

		const delta = Math.max(0, now - this.lastFrameTime);
		this.lastFrameTime = now;
		this.frames += 1;
		this.fpsTime += delta;

		if (this.fpsTime >= 1000) {
			this.fps = Math.round((this.frames * 1000) / this.fpsTime);
			this.frames = 0;
			this.fpsTime = 0;
		}

		this.ctx.fillStyle = '#030509';
		this.ctx.fillRect(0, 0, this.width, this.height);

		const grid = this.level.grid;
		const progress = this.level.progress;
		const combat = this.level.combat;

		if (grid && progress) {
			const layout = this.gridView.draw(this.ctx, grid, progress, this.width, this.height);
			const fruit = this.level.fruit;

			if (fruit) {
				this.fruitView.draw(this.ctx, fruit, layout);
			}

			const egg = this.level.egg;

			if (egg) {
				this.goldenEggView.draw(this.ctx, egg, layout);
			}

			const ultra = this.level.ultra;
			const gameplayVisible =
				this.director.stateName === 'playing' || this.director.stateName === 'paused';

			if (ultra && gameplayVisible) {
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

			const player = this.level.player;

			if (player) {
				this.playerView.draw(this.ctx, player, layout);
			}
		}

		const score = progress ? progress.score : 0;
		const dots = progress ? progress.remainingDots : 0;
		const lives = combat ? combat.lives : 0;
		const isMs = this.level.profile === 'ms-pacman';
		const hypnosis = this.level.hypnosis;

		const power = isMs
			? hypnosis && hypnosis.overdriveActive
				? hypnosis.overdriveTimer.toFixed(1)
				: '--'
			: combat && combat.isPowerActive
				? combat.powerTimer.toFixed(1)
				: '--';

		const egg = this.level.egg;

		let golden = 'EGG --';

		if (combat?.goldenExit) {
			golden = 'GOLDEN EXIT';
		} else if (egg?.exitOpen) {
			golden = 'EXIT OPEN';
		} else if (egg && egg.phase === 'egg') {
			golden = `EGG ${egg.eggTimer.toFixed(1)}`;
		} else if (egg?.phase === 'spent') {
			golden = 'EGG MISSED';
		}

		const modeLabel = isMs ? 'MS PAC-MAN' : 'PAC-MAN';

		this.ctx.fillStyle = 'rgba(3, 5, 9, 0.72)';
		this.ctx.fillRect(8, 8, 320, 208);

		this.ctx.fillStyle = '#e8efff';
		this.ctx.font = '16px monospace';
		this.ctx.textAlign = 'left';
		this.ctx.textBaseline = 'top';
		this.ctx.fillText(`STATE ${this.director.stateName.toUpperCase()}`, 16, 16);
		this.ctx.fillText(`SCORE ${score.toString().padStart(6, '0')}`, 16, 40);
		this.ctx.fillText(`DOTS ${dots.toString().padStart(3, '0')}`, 16, 64);
		this.ctx.fillText(`LIVES ${lives.toString().padStart(2, '0')}`, 16, 88);
		this.ctx.fillText(`POWER ${power}`, 16, 112);
		this.ctx.fillText(`FPS ${this.fps.toString().padStart(3, '0')}`, 16, 136);

		this.ctx.fillStyle = '#ffd93b';
		this.ctx.fillText(golden, 16, 160);

		this.ctx.fillStyle = '#79ff6f';
		this.ctx.fillText(`MODE ${modeLabel}`, 16, 184);

		this.ctx.fillStyle = '#7585a3';
		this.ctx.fillText('ARROWS move · M mode · ENTER start · SPACE pause', 16, 224);
	}

	destroy(): void {
		this.canvas.remove();
	}
}