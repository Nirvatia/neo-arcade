import { GridView } from '../maze/GridView';
import type { GridLayout } from '../maze/GridView';
import { GhostView } from '../actors/GhostView';
import { lerpHex } from '../contracts/MazePalette';
import type { SeasonRenderBundle, RenderBoard } from '../contracts/SeasonRenderBundle';
import { seasonRenderBundleFor } from './seasonRenderBundleFactory';
import type { SharedLayers } from '../SharedLayers';
import type { LevelRenderer, RenderFrame } from '../RenderFrame';

/**
 * Seasonal and secret levels: backdrop scene, the maze with dots, bonuses, ghosts,
 * Pac-Man, night dimming that grows as dots are eaten, then the season's weather.
 */
export class SeasonLevelRenderer implements LevelRenderer {
	private readonly shared: SharedLayers;
	private readonly gridView = new GridView();
	private readonly ghostView = new GhostView();
	private bundle: SeasonRenderBundle | null = null;
	private bundleKey = '';

	constructor(shared: SharedLayers) {
		this.shared = shared;
	}

	render(frame: RenderFrame): void {
		const { ctx, width, height, dt, time, state, level, season, grid, progress } = frame;
		const ratio = progress.collectionRatio;
		ctx.fillStyle = lerpHex(season.palette.background, season.palette.backgroundNight, ratio);
		ctx.fillRect(0, 0, width, height);

		const bundle = this.currentBundle(frame);
		const layout = this.gridView.computeLayout(grid, width, height, level.mazeScale);
		this.drawScene(frame, bundle, layout);

		if (state === 'level-clear') {
			this.shared.drawLevelClear(frame, layout);
			this.shared.drawOverlay(frame, layout);
			return;
		}

		const mask = this.shared.disintegrationMask(frame);
		const drawnLayout = this.gridView.draw(
			ctx,
			grid,
			progress,
			width,
			height,
			season.palette,
			ratio,
			bundle,
			time,
			mask,
			level.mazeScale
		);

		this.shared.drawCollectibles(frame, drawnLayout, mask);

		const ghosts = level.ghosts;
		if (ghosts) {
			const isMs = level.profile === 'ms-pacman';
			const hypnosis = level.hypnosis;
			const combat = level.combat;
			const ghostTimer = isMs
				? hypnosis
					? hypnosis.overdriveTimer
					: 0
				: combat
					? combat.powerTimer
					: 0;
			const overdrive = Boolean(isMs && hypnosis && hypnosis.overdriveActive);
			this.ghostView.draw(ctx, ghosts, drawnLayout, ghostTimer, overdrive, mask);
		}

		if (state === 'death') {
			this.shared.drawDeathWave(frame, drawnLayout);
			this.shared.drawPlayer(frame, drawnLayout);
			this.shared.drawOverlay(frame, drawnLayout);
			return;
		}

		this.shared.drawPlayer(frame, drawnLayout);
		this.drawDimming(frame, drawnLayout, ratio);

		if (state !== 'menu' && state !== 'paused') {
			bundle.weather.draw(ctx, drawnLayout, width, height, dt, time);
		}

		this.shared.drawOverlay(frame, drawnLayout);
	}

	// Bundles keep animation state (weather particles), so they must survive between frames.
	private currentBundle(frame: RenderFrame): SeasonRenderBundle {
		const { level, season } = frame;
		const key = `${season.name}:${level.secretMode}:${level.level}`;
		if (!this.bundle || key !== this.bundleKey) {
			this.bundle = seasonRenderBundleFor({
				season,
				secret: level.secretMode,
				level: level.level
			});
			this.bundleKey = key;
		}
		return this.bundle;
	}

	private drawScene(frame: RenderFrame, bundle: SeasonRenderBundle, layout: GridLayout): void {
		const board: RenderBoard = {
			x: layout.offsetX,
			y: layout.offsetY,
			width: frame.grid.width * layout.tileSize,
			height: frame.grid.height * layout.tileSize
		};
		bundle.scene.draw(frame.ctx, frame.width, frame.height, this.sceneSeed(frame), board);
	}

	/** Stable per level, so the backdrop layout only changes when the level does. */
	private sceneSeed(frame: RenderFrame): number {
		const { level } = frame;
		const number = Number.isFinite(level.level) && level.level >= 1 ? Math.floor(level.level) : 1;
		let seed = number * 7919;
		if (level.secretMode) {
			seed += 104729;
		}
		return Math.abs(seed % 2147483647);
	}

	private drawDimming(frame: RenderFrame, layout: GridLayout, ratio: number): void {
		if (!(ratio > 0)) {
			return;
		}
		frame.ctx.fillStyle = `rgba(2,4,12,${Math.min(0.28, ratio * 0.28)})`;
		frame.ctx.fillRect(
			layout.offsetX,
			layout.offsetY,
			frame.grid.width * layout.tileSize,
			frame.grid.height * layout.tileSize
		);
	}
}
