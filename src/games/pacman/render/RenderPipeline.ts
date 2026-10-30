import type { Director } from '../core/Director';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';
import type { LevelLoader } from '../logic/level/LevelLoader';
import { SharedLayers } from './SharedLayers';
import { SeasonLevelRenderer } from './seasons/SeasonLevelRenderer';
import { DoomLevelRenderer } from './doom/DoomLevelRenderer';
import { MeadowLevelRenderer } from './seasons/meadow/MeadowLevelRenderer';
import { meadowThemeFor } from './seasons/meadow/meadowThemes';
import { EMBER_PALETTE, ICE_PALETTE, LevelDecay } from './transitions/decay/LevelDecay';
import type { LevelRenderer, RenderFrame, WorldPreview } from './RenderFrame';
import { SeasonTurn } from './transitions/seasonTurn/SeasonTurn';
import type { SeasonTurnRequest } from './transitions/seasonTurn/SeasonTurn';
import { glowTexture } from './common/textures';
import { FLOW } from '../config/flowConfig';
import type { NextLevel } from '../logic/level/LevelLoader';
import type { DecayPalette } from './transitions/decay/DecayPass';

/** Same as the page background, so a full fade reads as an empty stage. */
const FADE_COLOR = '#030509';

/** Light of the season turn into a season; into a boss world it takes the boss palette. */
const SEASON_LIGHT = { light: 0xffe3a0, gap: 0xfff4d6 };

/**
 * Owns the canvas (HiDPI sizing, render clock) and hands each frame to the renderer of the
 * current level kind. Renderers live as long as the pipeline so their animation state
 * (weather, effects, the baked worlds) survives between frames. While Pac-Man dies, the
 * level is rendered offscreen and shattered by the decay pass; when a level is cleared,
 * it and the next level's world are rendered offscreen and the season turn flips one into
 * the other. Pac-Man, the overlay and the screen fade are drawn over both.
 */
export class RenderPipeline {
	private readonly container: HTMLElement;
	private readonly director: Director;
	private readonly level: LevelLoader;
	private readonly unsubscribeCues: () => void;
	private readonly shared: SharedLayers;
	private readonly seasonRenderer: LevelRenderer;
	private readonly meadowRenderer: MeadowLevelRenderer;
	private readonly doomRenderer: DoomLevelRenderer;
	private readonly decay = new LevelDecay();
	private readonly turn = new SeasonTurn();
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
		this.shared = shared;
		this.unsubscribeCues = events
			? events.on('audio:cue', (payload) => shared.trigger(payload.cue))
			: () => {};
		this.seasonRenderer = new SeasonLevelRenderer(shared);
		this.meadowRenderer = new MeadowLevelRenderer(shared, meadowThemeFor);
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

	/** `frameDt`: game seconds since the last frame, from the game loop's clock. */
	render(frameDt?: number): void {
		const now = typeof performance !== 'undefined' ? performance.now() : 0;
		const wall = this.lastRenderTime > 0 ? Math.min(0.1, (now - this.lastRenderTime) / 1000) : 0;
		const dt = frameDt === undefined ? wall : Math.min(0.1, Math.max(0, frameDt));
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

		const pr = this.pixelRatio;
		const flow = this.director.flow;
		const death = flow.state === 'death' ? this.director.death : null;
		const clear = flow.state === 'level-clear' ? this.director.levelClear : null;
		const next = clear ? this.level.peekNextLevel() : null;
		const nextView = next ? this.previewFor(next) : null;
		const turning = clear && next && nextView;
		const shake = death && !flow.paused ? this.decay.shake(flow.elapsed) : { x: 0, y: 0 };
		const target = death
			? this.decay.begin(this.canvas.width, this.canvas.height)
			: turning
				? this.turn.old(this.canvas.width, this.canvas.height)
				: this.ctx;
		target.setTransform(pr, 0, 0, pr, pr * shake.x, pr * shake.y);
		target.globalAlpha = 1;
		target.globalCompositeOperation = 'source-over';
		target.imageSmoothingEnabled = true;

		const frame: RenderFrame = {
			ctx: target,
			width: this.width,
			height: this.height,
			pixelRatio: pr,
			dt,
			time: this.timeValue,
			state: flow.state,
			paused: flow.paused,
			flow,
			director: this.director,
			level: this.level,
			season,
			grid,
			progress
		};
		const layout = this.rendererFor().render(frame);
		const screen: RenderFrame = { ...frame, ctx: this.ctx };
		this.ctx.setTransform(pr, 0, 0, pr, 0, 0);
		if (death) {
			this.decay.compose(this.ctx, this.width, this.height, pr, layout, shake, this.timeValue, {
				grid: season.grid,
				deathX: death.x,
				deathY: death.y,
				spawnX: grid.playerSpawn.x,
				spawnY: grid.playerSpawn.y,
				elapsed: flow.elapsed,
				palette: this.decayPalette()
			});
			this.shared.drawPlayer(screen, layout);
		}
		if (turning) {
			const nextCtx = this.turn.next(this.canvas.width, this.canvas.height);
			nextCtx.setTransform(pr, 0, 0, pr, 0, 0);
			nextCtx.globalAlpha = 1;
			nextCtx.globalCompositeOperation = 'source-over';
			nextView.preview({
				ctx: nextCtx,
				width: this.width,
				height: this.height,
				pixelRatio: pr,
				dt,
				paused: flow.paused,
				season: next.season
			});
			this.ctx.setTransform(pr, 0, 0, pr, 0, 0);
			this.turn.compose(this.ctx, this.width, this.height, pr, layout, this.timeValue, {
				grid: season.grid,
				x: clear.x,
				y: clear.y,
				elapsed: flow.elapsed,
				...this.turnStyle(next)
			});
			// Pac-Man stays on the last dot until the world has turned
			if (flow.elapsed < FLOW.levelClear.lights + FLOW.levelClear.turn) {
				this.shared.drawPlayer(screen, layout);
			}
		}
		this.shared.drawOverlay(screen, layout);
		this.drawFade(flow.fade);
	}

	destroy(): void {
		this.unsubscribeCues();
		this.canvas.remove();
	}

	/** The renderer that can show the next level's world, or null (then no turn). */
	private previewFor(next: NextLevel): WorldPreview | null {
		if (next.hell) {
			return this.doomRenderer;
		}
		return this.meadowRenderer.handles(next.season.name) ? this.meadowRenderer : null;
	}

	/**
	 * Colours and particles of the season turn: golden light and the next season's own
	 * particles into a season; the boss world's palette and embers into a boss level, so
	 * every boss world is entered the same way.
	 */
	private turnStyle(next: NextLevel): Pick<SeasonTurnRequest, 'light' | 'gap' | 'particle'> {
		if (next.hell) {
			const ember = glowTexture(EMBER_PALETTE.wisp);
			return { light: EMBER_PALETTE.rim, gap: EMBER_PALETTE.warm, particle: () => ember };
		}
		const theme = meadowThemeFor(next.season.name);
		return {
			...SEASON_LIGHT,
			particle: (i) => (theme ? theme.live.drift.texture(i) : glowTexture(SEASON_LIGHT.light))
		};
	}

	private decayPalette(): DecayPalette {
		if (this.level.hellMode) {
			return EMBER_PALETTE;
		}
		const season = this.level.season;
		const theme = season && !this.level.secretMode ? meadowThemeFor(season.name) : null;
		return theme ? theme.decay : ICE_PALETTE;
	}

	private rendererFor(): LevelRenderer {
		if (this.level.hellMode) {
			return this.doomRenderer;
		}
		const season = this.level.season;
		if (season && !this.level.secretMode && this.meadowRenderer.handles(season.name)) {
			return this.meadowRenderer;
		}
		return this.seasonRenderer;
	}

	/** Screen fade between menu and game and between levels; covers everything. */
	private drawFade(cover: number): void {
		if (!(cover > 0)) {
			return;
		}
		this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
		this.ctx.globalAlpha = Math.min(1, cover);
		this.ctx.globalCompositeOperation = 'source-over';
		this.ctx.fillStyle = FADE_COLOR;
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.ctx.globalAlpha = 1;
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
