import type { Director } from './Director';
import type { LevelLoader } from '../logic/LevelLoader';
import type { GridService } from '../logic/GridService';
import { GridView } from '../render/GridView';
import type { GridLayout, DisintegrationMask } from '../render/GridView';
import { PlayerView } from '../render/PlayerView';
import type { PlayerDrawOptions } from '../render/PlayerView';
import { DoomFxView } from '../render/doom/DoomFxView';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from './Events';
import { GhostView } from '../render/GhostView';
import { FruitView } from '../render/FruitView';
import { GoldenEggView } from '../render/GoldenEggView';
import { EchoCloneView } from '../render/EchoCloneView';
import { LampreyBossView } from '../render/LampreyBossView';
import type { BossSnapshot } from '../render/LampreyBossView';
import type { DoomBossService } from '../logic/doom/DoomBossService';
import { DoomCombatView } from '../render/DoomCombatView';
import { DoomWorld } from '../render/doom/DoomWorld';
import type { DoomLight } from '../render/doom/DoomWorld';
import { pickupSprite } from '../render/doom/DoomSprites';
import { DeathWaveView, deathWaveEase, deathWaveMaxRadius } from '../render/DeathWaveView';
import { LevelClearView } from '../render/LevelClearView';
import { OverlayView } from '../render/OverlayView';
import type { OverlayMode, OverlaySnapshot } from '../render/OverlayView';
import { lerpHex } from '../render/contracts/MazePalette';
import { seasonRenderBundleFor } from '../render/seasons/seasonRenderBundleFactory';
import type { SeasonData } from '../logic/SeasonCatalog';
import type { SeasonRenderBundle, RenderBoard } from '../render/contracts/SeasonRenderBundle';

export class RenderPipeline {
	private readonly container: HTMLElement;
	private readonly director: Director;
	private readonly level: LevelLoader;
	private readonly gridView: GridView;
	private readonly playerView: PlayerView;
	private readonly fxView: DoomFxView;
	private readonly unsubscribeCues: () => void;
	private readonly ghostView: GhostView;
	private readonly fruitView: FruitView;
	private readonly goldenEggView: GoldenEggView;
	private readonly echoCloneView: EchoCloneView;
	private readonly bossView: LampreyBossView;
	private readonly echoBossView: LampreyBossView;
	private bossHitFlash = 0;
	private readonly doomCombatView: DoomCombatView;
	private readonly deathWaveView: DeathWaveView;
	private readonly levelClearView: LevelClearView;
	private readonly overlayView: OverlayView;
	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private width = 0;
	private height = 0;
	private pixelRatio = 1;
	private bundle: SeasonRenderBundle | null = null;
	private doomWorld: DoomWorld | null = null;
	private doomWorldGrid: GridService | null = null;
	private lastPlayerPos: { x: number; y: number } | null = null;
	private bundleKey = '';
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
		this.gridView = new GridView();
		this.playerView = new PlayerView();
		this.fxView = new DoomFxView();
		this.unsubscribeCues = events
			? events.on('audio:cue', (payload) => this.playerView.trigger(payload.cue))
			: () => {};
		this.ghostView = new GhostView();
		this.fruitView = new FruitView();
		this.goldenEggView = new GoldenEggView();
		this.echoCloneView = new EchoCloneView();
		this.bossView = new LampreyBossView();
		this.echoBossView = new LampreyBossView();
		this.doomCombatView = new DoomCombatView();
		this.deathWaveView = new DeathWaveView();
		this.levelClearView = new LevelClearView();
		this.overlayView = new OverlayView();
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
		const combat = this.level.combat;
		if (!season || !grid || !progress) {
			return;
		}

		this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
		this.ctx.globalAlpha = 1;
		this.ctx.globalCompositeOperation = 'source-over';
		this.ctx.imageSmoothingEnabled = true;

		if (this.level.hellMode) {
			this.renderHell(dt, season, grid);
			return;
		}

		const ratio = this.dayNightRatio();
		this.ctx.fillStyle = lerpHex(season.palette.background, season.palette.backgroundNight, ratio);
		this.ctx.fillRect(0, 0, this.width, this.height);

		const bundle = this.currentBundle(season);
		const layout = this.gridView.computeLayout(grid, this.width, this.height, this.level.mazeScale);
		this.drawSeasonScene(bundle, layout, grid);

		const state = this.director.stateName;
		if (state === 'level-clear') {
			const clear = this.director.levelClear;
			if (clear && clear.phase === 'cutscene') {
				this.levelClearView.draw(this.ctx, clear, grid, layout, this.level.profile);
			}
			this.drawOverlay(layout, grid);
			return;
		}

		const mask = this.disintegrationMask(grid);
		const drawnLayout = this.gridView.draw(
			this.ctx, grid, progress, this.width, this.height,
			season.palette, ratio, bundle, this.timeValue, mask, this.level.mazeScale
		);

		this.drawCollectibles(drawnLayout, mask);

		const ghosts = this.level.ghosts;
		if (ghosts) {
			const isMs = this.level.profile === 'ms-pacman';
			const hypnosis = this.level.hypnosis;
			const ghostTimer = isMs
				? (hypnosis ? hypnosis.overdriveTimer : 0)
				: (combat ? combat.powerTimer : 0);
			const overdrive = Boolean(isMs && hypnosis && hypnosis.overdriveActive);
			this.ghostView.draw(this.ctx, ghosts, drawnLayout, ghostTimer, overdrive, mask);
		}

		if (state === 'death') {
			const wave = this.director.deathWave;
			if (wave) {
				this.deathWaveView.draw(
					this.ctx, drawnLayout, grid.width, grid.height,
					wave.x, wave.y, wave.progress
				);
			}
			const dead = this.level.player;
			if (dead) {
				this.playerView.draw(
					this.ctx, dead, drawnLayout, this.level.profile, this.timeValue, this.playerOptions(state)
				);
			}
			this.drawOverlay(drawnLayout, grid);
			return;
		}

		const player = this.level.player;
		if (player) {
			this.playerView.draw(
				this.ctx, player, drawnLayout, this.level.profile, this.timeValue, this.playerOptions(state)
			);
		}

		this.drawDimming(drawnLayout, grid, ratio);

		if (state !== 'menu' && state !== 'paused') {
			bundle.weather.draw(
				this.ctx, drawnLayout, this.width, this.height, dt, this.timeValue
			);
		}

		this.drawOverlay(drawnLayout, grid);
	}

	destroy(): void {
		this.unsubscribeCues();
		this.canvas.remove();
	}

	private playerOptions(state: string): PlayerDrawOptions {
		const dying = state === 'death';
		if (this.level.hellMode) {
			const doom = this.level.doom;
			return {
				look: doom && doom.berserkActive ? 'berserk' : 'normal',
				charge: doom && doom.bfgCharging ? doom.bfgChargeProgress : 0,
				dying
			};
		}
		const combat = this.level.combat;
		const hypnosis = this.level.hypnosis;
		const powered =
			this.level.profile === 'ms-pacman'
				? Boolean(hypnosis && hypnosis.overdriveActive)
				: Boolean(combat && combat.isPowerActive);
		return { look: powered ? 'energized' : 'normal', charge: 0, dying };
	}

	// Hell level: the CLAUDE_GRID_DOOM_v3 world (baked maze + meadow), its atmosphere (ash
	// storm in boss phase 2, night with a corridor light map in phase 3), then the actors on
	// top so they always stay readable, then embers and vignette.
	private renderHell(dt: number, season: SeasonData, grid: GridService): void {
		const world = this.doomWorldFor(season, grid);
		world.resize(this.width, this.height, this.pixelRatio);
		const boss = this.level.doomBoss;
		const doom = this.level.doom;
		const phase = boss ? boss.phase : 1;
		world.setMood(phase >= 2, phase >= 3);
		world.update(dt);
		const layout = world.layout;
		const state = this.director.stateName;
		const fighting = Boolean(boss && doom && !boss.defeated);

		if (doom) {
			for (const event of doom.consumeFx()) {
				this.fxView.spawn(event);
				if (event.kind === 'boss-hit' || event.kind === 'bite') {
					this.bossHitFlash = 1;
				}
				if (event.kind === 'bfg-fire') {
					this.playerView.fireBurst();
				}
			}
			this.fxView.update(dt, doom.shots, doom.barrelList);
			this.bossHitFlash = Math.max(0, this.bossHitFlash - dt * 5);
		}

		// camera shake moves the world and the actors, never the screen-space overlay
		const shake = Math.max(boss ? boss.shake : 0, this.fxView.shake);
		const amp = shake * shake * layout.tileSize * 0.35;
		this.ctx.save();
		this.ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
		world.drawWorld(this.ctx);
		world.drawMood(this.ctx, this.hellLights(state));

		if (state === 'level-clear') {
			const clear = this.director.levelClear;
			if (clear && clear.phase === 'cutscene') {
				this.levelClearView.draw(this.ctx, clear, grid, layout, this.level.profile);
			}
		} else {
			const mask = this.disintegrationMask(grid);
			this.fxView.drawGround(this.ctx, layout);
			this.drawCollectibles(layout, mask);
			if (boss && doom && fighting) {
				this.doomCombatView.drawGround(this.ctx, boss, doom, grid, layout, this.timeValue);
				const echo = boss.echo;
				const echoPos = boss.echoPosition();
				if (echo && echoPos) {
					this.echoBossView.draw(
						this.ctx,
						this.bossSnapshot(boss, echoPos, true, echo.presence),
						layout,
						this.timeValue
					);
				}
				if (!this.erased(boss.position, mask)) {
					this.bossView.draw(
						this.ctx,
						this.bossSnapshot(boss, boss.position, false, 1),
						layout,
						this.timeValue
					);
				}
				this.doomCombatView.drawAir(this.ctx, boss, layout, this.timeValue);
			}
			const player = this.level.player;
			if (state === 'death') {
				const wave = this.director.deathWave;
				if (wave) {
					this.deathWaveView.draw(this.ctx, layout, grid.width, grid.height, wave.x, wave.y, wave.progress);
				}
			} else if (player && boss && fighting) {
				this.doomCombatView.drawPull(this.ctx, boss, player.position, layout, this.timeValue);
			}
			if (player) {
				this.playerView.draw(
					this.ctx, player, layout, this.level.profile, this.timeValue, this.playerOptions(state)
				);
			}
			if (doom) {
				this.fxView.draw(this.ctx, layout, doom.shots, doom.tracerList);
			}
		}
		this.trackTeleport(world);
		world.drawFx(this.ctx);
		this.ctx.restore();
		world.drawOverlay(this.ctx);
		this.fxView.drawHurt(this.ctx, this.width, this.height);
		this.drawOverlay(layout, grid);
	}

	/** A jump of several tiles between frames is a teleport: fog at both ends, Doom style. */
	private trackTeleport(world: DoomWorld): void {
		const player = this.level.player;
		if (!player) {
			this.lastPlayerPos = null;
			return;
		}
		const p = player.position;
		const last = this.lastPlayerPos;
		if (last && Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > 3) {
			const state = this.director.stateName;
			if (state === 'playing') {
				world.teleportFog(last.x, last.y);
				world.teleportFog(p.x, p.y);
			}
		}
		this.lastPlayerPos = { x: p.x, y: p.y };
	}

	/** Light-map sources carried by the actors (tile-center coordinates, radius in tiles). */
	private hellLights(state: string): DoomLight[] {
		const lights: DoomLight[] = [];
		const player = this.level.player;
		if (player && state !== 'death') {
			const p = player.position;
			lights.push({ x: p.x, y: p.y, r: 6.5, tint: 0xffe2b0, a: 1 });
		}
		const boss = this.level.doomBoss;
		const doom = this.level.doom;
		if (!boss || !doom || boss.defeated) {
			return lights;
		}
		lights.push({ x: boss.position.x, y: boss.position.y, r: 3.2, tint: 0xff3a2a, a: 0.85 });
		const echo = boss.echoPosition();
		if (echo) {
			lights.push({ x: echo.x, y: echo.y, r: 2.6, tint: 0x9a6aff, a: 0.7 });
		}
		for (const pickup of doom.pickupList) {
			if (pickup.visible && pickup.kind) {
				lights.push({
					x: pickup.tile.x + 0.5,
					y: pickup.tile.y + 0.5,
					r: 2.4,
					tint: pickupSprite(pickup.kind).glow,
					a: 0.75
				});
			}
		}
		for (const shot of doom.shots) {
			lights.push({ x: shot.x, y: shot.y, r: 3.5, tint: 0x60ff70, a: 1 });
		}
		for (const hazard of boss.hazardList) {
			if (hazard.warn <= 0 && hazard.tiles.length > 0) {
				const mid = hazard.tiles[Math.floor(hazard.tiles.length / 2)];
				lights.push({ x: mid.x + 0.5, y: mid.y + 0.5, r: 6, tint: 0xff6a3a, a: 1 });
			}
		}
		return lights;
	}

	private bossSnapshot(
		boss: DoomBossService,
		at: { x: number; y: number },
		echo: boolean,
		presence: number
	): BossSnapshot {
		const rs = boss.renderState;
		const player = this.level.player;
		const target = player ? player.position : { x: at.x - 1, y: at.y };
		return {
			x: at.x,
			y: at.y,
			phase: boss.phase,
			state: boss.state,
			shape: rs.shape,
			dir: rs.dir,
			progress: rs.progress,
			alpha: echo ? Math.max(0, Math.min(1, presence)) : rs.alpha,
			intro: boss.introProgress,
			look: Math.atan2(target.y - at.y, target.x - at.x),
			hit: echo ? 0 : this.bossHitFlash,
			echo
		};
	}

	private doomWorldFor(season: SeasonData, grid: GridService): DoomWorld {
		if (!this.doomWorld || this.doomWorldGrid !== grid) {
			const doom = this.level.doom;
			const pickupTiles = doom ? doom.pickupList.map((pickup) => pickup.tile) : [];
			this.doomWorld = new DoomWorld(season.grid, pickupTiles);
			this.fxView.reset();
			this.doomWorldGrid = grid;
		}
		return this.doomWorld;
	}

	private drawCollectibles(layout: GridLayout, mask: DisintegrationMask | null): void {
		const fruit = this.level.fruit;
		if (fruit && fruit.active !== null && !this.erased(fruit.position, mask)) {
			this.fruitView.draw(this.ctx, fruit, layout);
		}

		const egg = this.level.egg;
		if (egg && egg.phase === 'egg' && !this.erased(egg.eggPosition, mask)) {
			this.goldenEggView.draw(this.ctx, egg, layout);
		}

		const echo = this.level.echo;
		if (echo && (echo.phase === 'token' || echo.phase === 'clone') && !this.erased(echo.position, mask)) {
			this.echoCloneView.draw(this.ctx, echo, layout);
		}
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
		const pixelRatio = Math.min(2, Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1);
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

	// Bundles keep animation state (weather particles), so they must survive between frames.
	private currentBundle(season: SeasonData): SeasonRenderBundle {
		const key = `${season.name}:${this.level.secretMode}:${this.level.level}`;
		if (!this.bundle || key !== this.bundleKey) {
			this.bundle = seasonRenderBundleFor({
				season,
				secret: this.level.secretMode,
				level: this.level.level
			});
			this.bundleKey = key;
		}
		return this.bundle;
	}

	private dayNightRatio(): number {
		return this.level.progress ? this.level.progress.collectionRatio : 0;
	}

	private drawSeasonScene(bundle: SeasonRenderBundle, layout: GridLayout, grid: GridService): void {
		const board: RenderBoard = {
			x: layout.offsetX,
			y: layout.offsetY,
			width: grid.width * layout.tileSize,
			height: grid.height * layout.tileSize
		};
		bundle.scene.draw(this.ctx, this.width, this.height, this.sceneSeed(), board);
	}

	private sceneSeed(): number {
		const level = Number.isFinite(this.level.level) && this.level.level >= 1
			? Math.floor(this.level.level)
			: 1;
		let seed = level * 7919;
		if (this.level.secretMode) {
			seed += 104729;
		}
		if (this.level.hellMode) {
			seed += 31;
		}
		return Math.abs(seed % 2147483647);
	}

	private disintegrationMask(grid: GridService): DisintegrationMask | null {
		if (this.director.stateName !== 'death') {
			return null;
		}
		const wave = this.director.deathWave;
		if (!wave || !Number.isFinite(wave.progress) || wave.progress <= 0) {
			return null;
		}
		const radius = deathWaveEase(wave.progress) * deathWaveMaxRadius(grid.width, grid.height);
		if (!Number.isFinite(radius) || radius <= 0) {
			return null;
		}
		return { centerX: wave.x, centerY: wave.y, radius };
	}

	private erased(position: { x: number; y: number }, mask: DisintegrationMask | null): boolean {
		if (!mask) {
			return false;
		}
		const dx = position.x - mask.centerX;
		const dy = position.y - mask.centerY;
		return dx * dx + dy * dy <= mask.radius * mask.radius;
	}

	private drawDimming(layout: GridLayout, grid: GridService, ratio: number): void {
		if (!(ratio > 0)) {
			return;
		}
		this.ctx.fillStyle = `rgba(2,4,12,${Math.min(0.28, ratio * 0.28)})`;
		this.ctx.fillRect(
			layout.offsetX, layout.offsetY,
			grid.width * layout.tileSize, grid.height * layout.tileSize
		);
	}

	private drawOverlay(layout: GridLayout, grid: GridService): void {
		const snapshot = this.overlaySnapshot();
		if (snapshot.mode === 'none') {
			return;
		}
		this.overlayView.draw(
			this.ctx, snapshot, layout,
			grid.width * layout.tileSize, grid.height * layout.tileSize,
			!this.level.hellMode
		);
	}

	private overlaySnapshot(): OverlaySnapshot {
		const state = this.director.stateName;
		const combat = this.level.combat;

		let mode: OverlayMode = 'none';
		let title = '';
		let timer = 0;
		let duration = 0;

		if (state === 'ready') {
			mode = 'ready';
			title = 'READY';
			timer = this.director.overlayTimer;
		} else if (state === 'playing') {
			mode = 'playing';
		} else if (state === 'paused') {
			mode = 'paused';
			title = 'PAUSED';
		} else if (state === 'death') {
			mode = 'death';
			title = 'DEATH';
			const wave = this.director.deathWave;
			timer = wave ? wave.timer : this.director.overlayTimer;
			duration = wave ? wave.duration : 0;
		} else if (state === 'level-clear') {
			mode = 'level-clear';
			title = 'LEVEL CLEAR';
			const clear = this.director.levelClear;
			timer = clear ? clear.timer : this.director.overlayTimer;
			duration = clear ? clear.duration : 0;
		} else if (state === 'game-over') {
			mode = 'game-over';
			title = 'GAME OVER';
		}

		let powerLabel = '';
		let powerTimer = 0;
		if (state === 'playing') {
			if (this.level.profile === 'pacman' && combat && combat.isPowerActive) {
				powerLabel = 'POWER';
				powerTimer = combat.powerTimer;
			}
			const hypnosis = this.level.hypnosis;
			if (hypnosis && hypnosis.overdriveActive) {
				powerLabel = 'OVERDRIVE';
				powerTimer = hypnosis.overdriveTimer;
			}
			const echo = this.level.echo;
			if (echo && echo.phase === 'clone') {
				powerLabel = 'ECHO';
				powerTimer = echo.timer;
			}
			const doom = this.level.doom;
			if (this.level.hellMode && doom && doom.armed) {
				powerLabel = doom.armed.toUpperCase();
			}
		}

		return {
			mode,
			title,
			timer: Number.isFinite(timer) && timer >= 0 ? timer : 0,
			duration: Number.isFinite(duration) && duration >= 0 ? duration : 0,
			level: Number.isFinite(this.level.level) && this.level.level >= 1 ? Math.floor(this.level.level) : 1,
			lives: combat && combat.lives >= 0 ? Math.floor(combat.lives) : 0,
			powerLabel,
			powerTimer: Number.isFinite(powerTimer) && powerTimer >= 0 ? powerTimer : 0
		};
	}
}