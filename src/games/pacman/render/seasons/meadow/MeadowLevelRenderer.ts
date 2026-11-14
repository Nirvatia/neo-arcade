import { GhostView, type GhostStyle } from '../../actors/GhostView';
import type { GridLayout } from '../../maze/GridView';
import type { SharedLayers } from '../../SharedLayers';
import type { LevelRenderer, PreviewFrame, RenderFrame, WorldPreview } from '../../RenderFrame';
import type { GridMatrix } from '../../../config/gridConfig';
import type { SeasonData } from '../../../logic/level/SeasonCatalog';
import { MeadowWorld } from './MeadowWorld';
import type { MeadowTheme } from './MeadowTheme';
import type { PacmanFx } from '../../../core/Events';
import { LevelFx } from '../../fx/LevelFx';
import type { GridService } from '../../../logic/maze/GridService';
import type { GhostModel } from '../../../logic/actors/GhostModel';
import type { DebugRenderFlags } from '../../debug/DebugOverlayView';

/** Share of eaten dots at which the season's weather rises, then the night falls. */
const WEATHER_AT = 0.5;
const NIGHT_AT = 0.75;
/** A ghost leaving the lair or coming home this close (tiles) to the gate opens it. */
const GATE_REACH = 1.6;
/** Gate speed, share of the full slide per second, opening and closing. */
/** The ghost shape of each season; the others keep the plain disc. */
const GHOST_STYLES: Readonly<Record<string, GhostStyle>> = {
	spring: 'tulip',
	summer: 'turtle',
	autumn: 'hedgehog',
	winter: 'bunny'
};
const GATE_OPEN_RATE = 7;
const GATE_CLOSE_RATE = 3;

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
	/** How far the ghosts' traffic holds the lair gate open, 0..1 (eased). */
	private ghostGate = 0;
	private gateTiles: { grid: GridService; tiles: Array<{ x: number; y: number }> } | null = null;
	private debugFlags: DebugRenderFlags | null = null;

	constructor(shared: SharedLayers, themeFor: (season: string) => MeadowTheme | null) {
		this.shared = shared;
		this.themeFor = themeFor;
	}

	/** Dev build: share the panel's layer switches with every current and future world. */
	setDebugFlags(flags: DebugRenderFlags): void {
		this.debugFlags = flags;
		for (const entry of this.worlds) {
			entry.world.setDebugFlags(flags);
		}
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
		if (!frame.paused) {
			this.updateGhostGate(level.grid, level.ghosts?.list ?? [], frame.dt);
		}
		world.setLairGate(Math.max(level.egg?.doorOpen ?? 0, this.ghostGate));
		world.drawWorld(ctx);
		world.drawMood(ctx);
		world.drawFood(ctx, (x, y) => progress.isCollected(x, y), this.shared.attract(frame));
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
				this.ghostView.style = GHOST_STYLES[frame.season.name] ?? 'disc';
				this.ghostView.time = frame.time;
				this.ghostView.draw(
					ctx,
					ghosts,
					layout,
					ghostTimer,
					overdrive,
					vanish,
					isMs ? (hypnosis?.mode ?? null) : null
				);
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

	/** Opens the gate for a ghost leaving the lair or coming home as eyes, then shuts it. */
	private updateGhostGate(
		grid: GridService | null,
		ghosts: readonly GhostModel[],
		dt: number
	): void {
		let wanted = 0;
		if (grid) {
			if (this.gateTiles?.grid !== grid) {
				const tiles: Array<{ x: number; y: number }> = [];
				for (let y = 0; y < grid.height; y += 1) {
					for (let x = 0; x < grid.width; x += 1) {
						if (grid.tileAt(x, y) === 'LE') {
							tiles.push({ x: x + 0.5, y: y + 0.5 });
						}
					}
				}
				this.gateTiles = { grid, tiles };
			}
			const tiles = this.gateTiles.tiles;
			const near = ghosts.some((ghost) => {
				if (ghost.state !== 'exiting' && ghost.state !== 'eyes') {
					return false;
				}
				const p = ghost.position;
				return tiles.some((t) => Math.hypot(p.x - t.x, p.y - t.y) < GATE_REACH);
			});
			wanted = near ? 1 : 0;
		}
		const rate = wanted > this.ghostGate ? GATE_OPEN_RATE : GATE_CLOSE_RATE;
		const step = Math.min(1, dt * rate);
		this.ghostGate += (wanted - this.ghostGate) * step;
		if (Math.abs(wanted - this.ghostGate) < 0.002) {
			this.ghostGate = wanted;
		}
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
		world.drawWorld(frame.ctx);
		world.drawMood(frame.ctx);
		world.drawFood(frame.ctx, () => false);
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
		if (this.debugFlags) {
			world.setDebugFlags(this.debugFlags);
		}
		this.worlds.unshift({ grid: season.grid, theme, world });
		this.worlds.length = Math.min(this.worlds.length, 2);
		return world;
	}
}
