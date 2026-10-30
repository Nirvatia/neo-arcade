import { GhostView } from '../../actors/GhostView';
import type { GridLayout } from '../../maze/GridView';
import type { SharedLayers } from '../../SharedLayers';
import type { LevelRenderer, PreviewFrame, RenderFrame, WorldPreview } from '../../RenderFrame';
import type { GridMatrix } from '../../../config/gridConfig';
import type { SeasonData } from '../../../logic/level/SeasonCatalog';
import { MeadowWorld } from './MeadowWorld';
import type { MeadowTheme } from './MeadowTheme';
import type { PacmanFx } from '../../../core/Events';
import { LevelFx } from '../../fx/LevelFx';

/** Share of eaten dots at which the season's weather rises, then the night falls. */
const WEATHER_AT = 0.5;
const NIGHT_AT = 0.75;

/**
 * Meadow seasons (spring, summer, autumn, winter) from the owner's mock-ups: the baked
 * world and its live layer, the atmosphere under the actors (so they stay readable), then
 * the weather and the vignette on top. Weather and night follow the level's progress.
 */
export class MeadowLevelRenderer implements LevelRenderer, WorldPreview {
	private readonly shared: SharedLayers;
	private readonly themeFor: (season: string) => MeadowTheme | null;
	private readonly ghostView = new GhostView();
	/** The current level's world and the next one (the season turn needs both at once). */
	private worlds: Array<{ grid: GridMatrix; theme: MeadowTheme; world: MeadowWorld }> = [];
	/** Gameplay effects, styled by the season on screen; cleared when the world changes. */
	private readonly fx = new LevelFx();
	private fxWorld: MeadowWorld | null = null;
	private fxTheme: MeadowTheme | null = null;

	constructor(shared: SharedLayers, themeFor: (season: string) => MeadowTheme | null) {
		this.shared = shared;
		this.themeFor = themeFor;
	}

	/** A gameplay moment to show (`fx:event`), in the current season's style. */
	spawnFx(event: PacmanFx): void {
		const theme = this.fxTheme;
		if (!theme) {
			return;
		}
		this.fx.spawn(event, {
			accent: theme.live.energizer.glow,
			particle: (i) => theme.live.drift.texture(i)
		});
	}

	/** True when this renderer draws the frame's season. */
	handles(season: string): boolean {
		return this.themeFor(season) !== null;
	}

	render(frame: RenderFrame): GridLayout {
		const { ctx, state, level, progress } = frame;
		const world = this.worldFor(frame.season);
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const ratio = progress.collectionRatio;
		world.setMood(ratio >= WEATHER_AT ? 1 : 0, ratio >= NIGHT_AT ? 1 : 0);
		if (!frame.paused) {
			world.update(frame.dt);
		}
		const layout = world.layout;
		if (this.fxWorld !== world) {
			this.fx.reset();
			this.fxWorld = world;
		}
		this.fxTheme = this.themeFor(frame.season.name);
		if (!frame.paused) {
			this.fx.update(frame.dt);
		}

		// the effects' shake moves the world and the actors, never the vignette
		const amp = this.fx.shake ** 2 * layout.tileSize * 0.3;
		ctx.save();
		if (amp > 0 && !frame.paused) {
			ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
		}
		world.setLairGate(level.egg?.doorOpen ?? 0);
		world.drawWorld(ctx, (x, y) => progress.isCollected(x, y));
		world.drawMood(ctx);
		// on level clear only the world: the season turn flips it over, actors stay out
		if (state !== 'level-clear') {
			this.fx.drawUnder(ctx, layout);
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
				const vanish = level.egg?.vanishProgress ?? 0;
				this.ghostView.draw(ctx, ghosts, layout, ghostTimer, overdrive, vanish);
			}
			if (state !== 'death') {
				// while dying, the pipeline draws Pac-Man over the level decay
				this.shared.drawPlayer(frame, layout);
			}
			this.fx.drawOver(ctx, layout);
		}
		ctx.restore();
		world.drawOverlay(ctx);
		this.fx.drawScreen(ctx, frame.width, frame.height);
		return layout;
	}

	/** The next level's world, untouched and in its morning mood, for the season turn. */
	preview(frame: PreviewFrame): GridLayout {
		const world = this.worldFor(frame.season);
		world.resize(frame.width, frame.height, frame.pixelRatio);
		world.setMood(0, 0);
		world.setLairGate(0);
		if (!frame.paused) {
			world.update(frame.dt);
		}
		world.drawWorld(frame.ctx, () => false);
		world.drawMood(frame.ctx);
		world.drawOverlay(frame.ctx);
		return world.layout;
	}

	/**
	 * The world of a season and grid, kept for the next frames. A previewed world becomes
	 * the level's world when that level starts, so nothing jumps at the hand-over; only the
	 * two most recent worlds are kept (each holds a large baked background).
	 */
	private worldFor(season: SeasonData): MeadowWorld {
		const theme = this.themeFor(season.name);
		if (!theme) {
			throw new Error(`MeadowLevelRenderer: no theme for ${season.name}`);
		}
		const i = this.worlds.findIndex((w) => w.grid === season.grid && w.theme === theme);
		if (i >= 0) {
			const [hit] = this.worlds.splice(i, 1);
			this.worlds.unshift(hit);
			return hit.world;
		}
		const world = new MeadowWorld(season.grid, theme);
		this.worlds.unshift({ grid: season.grid, theme, world });
		this.worlds.length = Math.min(this.worlds.length, 2);
		return world;
	}
}
