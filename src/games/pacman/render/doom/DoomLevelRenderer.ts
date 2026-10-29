import type { GridService } from '../../logic/maze/GridService';
import type { LevelLoader } from '../../logic/level/LevelLoader';
import type { DoomBossService } from '../../logic/doom/DoomBossService';
import type { PacmanStateName } from '../../core/Events';
import { DoomFxView } from './DoomFxView';
import { DoomCombatView } from './DoomCombatView';
import { LampreyBossView } from './LampreyBossView';
import type { BossSnapshot } from './LampreyBossView';
import { DoomWorld } from './DoomWorld';
import type { DoomLight } from './DoomWorld';
import { pickupSprite } from './DoomSprites';
import { erased } from '../SharedLayers';
import type { SharedLayers } from '../SharedLayers';
import type { LevelRenderer, RenderFrame } from '../RenderFrame';

/**
 * Hell level: the CLAUDE_GRID_DOOM_v3 world (baked maze + meadow), its atmosphere (ash
 * storm in boss phase 2, night with a corridor light map in phase 3), then the actors on
 * top so they always stay readable, then embers and vignette.
 */
export class DoomLevelRenderer implements LevelRenderer {
	private readonly shared: SharedLayers;
	private readonly fxView = new DoomFxView();
	private readonly bossView = new LampreyBossView();
	private readonly echoBossView = new LampreyBossView();
	private readonly combatView = new DoomCombatView();
	private bossHitFlash = 0;
	private world: DoomWorld | null = null;
	private worldGrid: GridService | null = null;
	private lastPlayerPos: { x: number; y: number } | null = null;

	constructor(shared: SharedLayers) {
		this.shared = shared;
	}

	render(frame: RenderFrame): void {
		const { ctx, dt, time, state, level, grid } = frame;
		const world = this.worldFor(frame);
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const boss = level.doomBoss;
		const doom = level.doom;
		const phase = boss ? boss.phase : 1;
		world.setMood(phase >= 2, phase >= 3);
		world.update(dt);
		const layout = world.layout;
		const fighting = Boolean(boss && doom && !boss.defeated);

		if (doom) {
			for (const event of doom.consumeFx()) {
				this.fxView.spawn(event);
				if (event.kind === 'boss-hit' || event.kind === 'bite') {
					this.bossHitFlash = 1;
				}
				if (event.kind === 'bfg-fire') {
					this.shared.playerView.fireBurst();
				}
			}
			this.fxView.update(dt, doom.shots, doom.barrelList);
			this.bossHitFlash = Math.max(0, this.bossHitFlash - dt * 5);
		}

		// camera shake moves the world and the actors, never the screen-space overlay
		const shake = Math.max(boss ? boss.shake : 0, this.fxView.shake);
		const amp = shake * shake * layout.tileSize * 0.35;
		ctx.save();
		ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
		world.drawWorld(ctx);
		world.drawMood(ctx, this.lights(level, state));

		if (state === 'level-clear') {
			this.shared.drawLevelClear(frame, layout);
		} else {
			const mask = this.shared.disintegrationMask(frame);
			this.fxView.drawGround(ctx, layout);
			this.shared.drawCollectibles(frame, layout, mask);
			if (boss && doom && fighting) {
				this.combatView.drawGround(ctx, boss, doom, grid, layout, time);
				const echo = boss.echo;
				const echoPos = boss.echoPosition();
				if (echo && echoPos) {
					this.echoBossView.draw(
						ctx,
						this.bossSnapshot(level, boss, echoPos, true, echo.presence),
						layout,
						time
					);
				}
				if (!erased(boss.position, mask)) {
					this.bossView.draw(
						ctx,
						this.bossSnapshot(level, boss, boss.position, false, 1),
						layout,
						time
					);
				}
				this.combatView.drawAir(ctx, boss, layout, time);
			}
			const player = level.player;
			if (state === 'death') {
				this.shared.drawDeathWave(frame, layout);
			} else if (player && boss && fighting) {
				this.combatView.drawPull(ctx, boss, player.position, layout, time);
			}
			this.shared.drawPlayer(frame, layout);
			if (doom) {
				this.fxView.draw(ctx, layout, doom.shots, doom.tracerList);
			}
		}
		this.trackTeleport(frame, world);
		world.drawFx(ctx);
		ctx.restore();
		world.drawOverlay(ctx);
		this.fxView.drawHurt(ctx, frame.width, frame.height);
		this.shared.drawOverlay(frame, layout);
	}

	/** The baked world is rebuilt only when a new hell level (a new grid) starts. */
	private worldFor(frame: RenderFrame): DoomWorld {
		if (!this.world || this.worldGrid !== frame.grid) {
			const doom = frame.level.doom;
			const pickupTiles = doom ? doom.pickupList.map((pickup) => pickup.tile) : [];
			this.world = new DoomWorld(frame.season.grid, pickupTiles);
			this.fxView.reset();
			this.worldGrid = frame.grid;
		}
		return this.world;
	}

	/** A jump of several tiles between frames is a teleport: fog at both ends, Doom style. */
	private trackTeleport(frame: RenderFrame, world: DoomWorld): void {
		const player = frame.level.player;
		if (!player) {
			this.lastPlayerPos = null;
			return;
		}
		const p = player.position;
		const last = this.lastPlayerPos;
		if (last && Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > 3) {
			if (frame.state === 'playing') {
				world.teleportFog(last.x, last.y);
				world.teleportFog(p.x, p.y);
			}
		}
		this.lastPlayerPos = { x: p.x, y: p.y };
	}

	/** Light-map sources carried by the actors (tile-center coordinates, radius in tiles). */
	private lights(level: LevelLoader, state: PacmanStateName): DoomLight[] {
		const lights: DoomLight[] = [];
		const player = level.player;
		if (player && state !== 'death') {
			const p = player.position;
			lights.push({ x: p.x, y: p.y, r: 6.5, tint: 0xffe2b0, a: 1 });
		}
		const boss = level.doomBoss;
		const doom = level.doom;
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
		level: LevelLoader,
		boss: DoomBossService,
		at: { x: number; y: number },
		echo: boolean,
		presence: number
	): BossSnapshot {
		const rs = boss.renderState;
		const player = level.player;
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
}
