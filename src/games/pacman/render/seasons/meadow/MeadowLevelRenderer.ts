import { GhostView } from '../../actors/GhostView';
import type { GridLayout } from '../../maze/GridView';
import type { SharedLayers } from '../../SharedLayers';
import type { LevelRenderer, RenderFrame } from '../../RenderFrame';
import type { GridService } from '../../../logic/maze/GridService';
import { MeadowWorld } from './MeadowWorld';
import type { MeadowTheme } from './MeadowTheme';

/** Share of eaten dots at which the season's weather rises, then the night falls. */
const WEATHER_AT = 0.5;
const NIGHT_AT = 0.75;

/**
 * Meadow seasons (spring, summer, autumn, winter) from the owner's mock-ups: the baked
 * world and its live layer, the atmosphere under the actors (so they stay readable), then
 * the weather and the vignette on top. Weather and night follow the level's progress.
 */
export class MeadowLevelRenderer implements LevelRenderer {
	private readonly shared: SharedLayers;
	private readonly themeFor: (season: string) => MeadowTheme | null;
	private readonly ghostView = new GhostView();
	private world: MeadowWorld | null = null;
	private worldGrid: GridService | null = null;
	private worldTheme: MeadowTheme | null = null;

	constructor(shared: SharedLayers, themeFor: (season: string) => MeadowTheme | null) {
		this.shared = shared;
		this.themeFor = themeFor;
	}

	/** True when this renderer draws the frame's season. */
	handles(season: string): boolean {
		return this.themeFor(season) !== null;
	}

	render(frame: RenderFrame): GridLayout {
		const { ctx, state, level, progress } = frame;
		const world = this.worldFor(frame);
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const ratio = progress.collectionRatio;
		world.setMood(ratio >= WEATHER_AT ? 1 : 0, ratio >= NIGHT_AT ? 1 : 0);
		if (!frame.paused) {
			world.update(frame.dt);
		}
		const layout = world.layout;

		world.drawWorld(ctx, (x, y) => progress.isCollected(x, y));
		world.drawMood(ctx);
		if (state === 'level-clear') {
			this.shared.drawLevelClear(frame, layout);
		} else {
			this.shared.drawCollectibles(frame, layout);
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
				this.ghostView.draw(ctx, ghosts, layout, ghostTimer, overdrive);
			}
			if (state !== 'death') {
				// while dying, the pipeline draws Pac-Man over the level decay
				this.shared.drawPlayer(frame, layout);
			}
		}
		world.drawOverlay(ctx);
		return layout;
	}

	/** The baked world is rebuilt only when a new level (grid) or season starts. */
	private worldFor(frame: RenderFrame): MeadowWorld {
		const theme = this.themeFor(frame.season.name);
		if (!theme) {
			throw new Error(`MeadowLevelRenderer: no theme for ${frame.season.name}`);
		}
		if (!this.world || this.worldGrid !== frame.grid || this.worldTheme !== theme) {
			this.world = new MeadowWorld(frame.season.grid, theme);
			this.worldGrid = frame.grid;
			this.worldTheme = theme;
		}
		return this.world;
	}
}
