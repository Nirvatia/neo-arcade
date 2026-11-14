import type { GridService } from '../maze/GridService';
import type { PlayerService } from './PlayerService';
import type { LevelProgress } from '../level/LevelProgress';
import { GhostModel } from './GhostModel';
import type { GhostDirection, GhostKind, GhostState, GhostTile } from './GhostModel';
import { isLairTile, resolveExitTarget } from '../maze/LairExit';
import type { ArcadeRoundTuning } from '../../config/arcadeConfig';
import { HYPNOSIS } from '../../config/hypnosisConfig';
import type { RouteWorld } from './ghostRoutes';
import { arcadeChaseTarget } from './arcadeTargets';
import {
	DIRECTIONS,
	SCATTER_TARGETS,
	ahead,
	chaseTarget,
	distanceSq,
	fleeTarget,
	nearestDotTarget,
	oppositeDirection
} from './ghostTargets';

const FALLBACK_EXIT_TARGET: GhostTile = { x: 12, y: 9 };
const EXIT_DELAYS: Record<GhostKind, number> = {
	BLINKY: 0,
	PINKY: 3,
	INKY: 6,
	CLYDE: 9
};
const GHOST_SPEED = 5.4;
const SCATTER_TIME = 7;
const CHASE_TIME = 20;
const EPSILON = 1e-6;
const EMPTY_GHOST_LIST: readonly GhostModel[] = [];

export type GhostMode = 'scatter' | 'chase';

/** What the hypnosis service tells the ghosts (see `HypnosisService`). */
export interface HypnosisGuide {
	/** The hypnotised ghost's next step; null: it steers by the old rule. */
	direction(ghost: GhostModel): GhostDirection | null;
	/** The tile a frightened ghost runs from instead of the player (a hunter near it), or null. */
	threatFor(ghost: GhostModel): GhostTile | null;
	/** How fast the hypnotised ghost goes, against its own speed (a feeder and a hunter differ). */
	speedFactor(ghost: GhostModel): number;
}

export class GhostService {
	private readonly grid: GridService;
	private readonly player: PlayerService;
	private readonly progress: LevelProgress;
	private readonly ghosts: GhostModel[];
	private hypnosisGuide: HypnosisGuide | null = null;
	private readonly exitTargetValue: GhostTile;
	private mode: GhostMode = 'scatter';
	private modeTimer = SCATTER_TIME;
	private powerActiveValue = false;
	private msOverdriveValue = false;
	private speedModifierValue = 1;
	/** The level's waves (seconds) and how much faster the ghosts leave the lair (the ramp). */
	private scatterTime = SCATTER_TIME;
	private chaseTime = CHASE_TIME;
	private exitScale = 1;
	private visibleValue = true;
	/** Sent away by the lair code: frozen where they were, out of play until the reset. */
	private banishedValue = false;
	/** The arcade round's waves and characters; null outside the secret level. */
	private arcade: ArcadeRoundTuning | null = null;
	private waveIndex = 0;

	constructor(grid: GridService, player: PlayerService, progress: LevelProgress) {
		if (!grid) {
			console.error('GhostService.constructor', 'missing grid service');
			throw new Error('GhostService.constructor: missing grid service');
		}
		if (!player) {
			console.error('GhostService.constructor', 'missing player service');
			throw new Error('GhostService.constructor: missing player service');
		}
		if (!progress) {
			console.error('GhostService.constructor', 'missing level progress');
			throw new Error('GhostService.constructor: missing level progress');
		}
		const spawns = grid.ghostSpawns;
		if (!spawns.BLINKY || !spawns.PINKY || !spawns.INKY || !spawns.CLYDE) {
			console.error('GhostService.constructor', 'missing ghost spawns');
			throw new Error('GhostService.constructor: missing ghost spawns');
		}
		this.grid = grid;
		this.player = player;
		this.progress = progress;
		this.ghosts = [
			new GhostModel('BLINKY', spawns.BLINKY, GHOST_SPEED, EXIT_DELAYS.BLINKY),
			new GhostModel('PINKY', spawns.PINKY, GHOST_SPEED, EXIT_DELAYS.PINKY),
			new GhostModel('INKY', spawns.INKY, GHOST_SPEED, EXIT_DELAYS.INKY),
			new GhostModel('CLYDE', spawns.CLYDE, GHOST_SPEED, EXIT_DELAYS.CLYDE)
		];
		const resolved = resolveExitTarget(grid, spawns.BLINKY);
		if (resolved) {
			this.exitTargetValue = resolved;
		} else {
			console.error('GhostService.constructor', 'exit target not resolved, using fallback', {
				fallback: FALLBACK_EXIT_TARGET
			});
			this.exitTargetValue = FALLBACK_EXIT_TARGET;
		}
	}

	/** The ghosts in play: they move, collide and are drawn. */
	get list(): readonly GhostModel[] {
		return this.visibleValue && !this.banishedValue ? this.ghosts : EMPTY_GHOST_LIST;
	}

	/** The ghosts the lair code sent away, frozen where they were (drawn while they vanish). */
	get banishedList(): readonly GhostModel[] {
		return this.visibleValue && this.banishedValue ? this.ghosts : EMPTY_GHOST_LIST;
	}

	get banished(): boolean {
		return this.banishedValue;
	}

	/** The wave in force: the ghosts head for their corners or hunt Pac-Man. */
	get currentMode(): GhostMode {
		return this.mode;
	}

	/** The lair code is solved: every ghost stops and leaves play for the rest of the level. */
	banish(): void {
		this.banishedValue = true;
	}

	setVisible(value: boolean): void {
		this.visibleValue = value;
	}

	setSpeedModifier(value: number): void {
		if (!Number.isFinite(value) || value <= 0) {
			console.error('GhostService.setSpeedModifier', 'invalid modifier', value);
			return;
		}
		this.speedModifierValue = value;
	}

	/** The level's scatter and chase waves (seconds) and the scale of the lair-exit delays. */
	setTuning(scatter: number, chase: number, exitScale: number): void {
		if (!(scatter > 0) || !(chase > 0) || !(exitScale > 0)) {
			console.error('GhostService.setTuning', 'invalid tuning', { scatter, chase, exitScale });
			return;
		}
		this.scatterTime = scatter;
		this.chaseTime = chase;
		this.exitScale = exitScale;
		this.resetWaves();
	}

	get speedModifier(): number {
		return this.speedModifierValue;
	}

	/** The ghosts' own speed, tiles a second, before any modifier. */
	get baseSpeed(): number {
		return GHOST_SPEED;
	}

	/** The seconds a ghost waits before it leaves the lair (with the ramp). */
	exitDelay(kind: GhostKind): number {
		return EXIT_DELAYS[kind] * this.exitScale;
	}

	/** The scatter and chase waves now in force, seconds. */
	get waves(): { readonly scatter: number; readonly chase: number } {
		return { scatter: this.scatterTime, chase: this.chaseTime };
	}

	setPowerActive(value: boolean): void {
		this.powerActiveValue = value;
	}

	/**
	 * The secret level's arcade round: its scatter / chase waves (then chase for good) and
	 * the arcade characters in chase (`arcadeTargets`). Null returns to the main rules.
	 */
	setArcade(tuning: ArcadeRoundTuning | null): void {
		this.arcade = tuning;
		this.resetWaves();
	}

	setMsOverdrive(value: boolean): void {
		if (this.msOverdriveValue === value) {
			return;
		}
		this.msOverdriveValue = value;
		for (const ghost of this.ghosts) {
			if (value) {
				if (ghost.state === 'active' || ghost.state === 'frightened') {
					ghost.setState('frightened');
				}
			} else {
				if (ghost.state === 'frightened') {
					ghost.setState('active');
				}
			}
		}
	}

	setGhostState(kind: GhostKind, state: GhostState): void {
		const ghost = this.ghosts.find((item) => item.kind === kind);
		if (!ghost) {
			console.error('GhostService.setGhostState', 'missing ghost', { kind });
			return;
		}
		ghost.setState(state);
		ghost.setForceReverse(false);
	}

	frightenActive(): void {
		for (const ghost of this.ghosts) {
			if (ghost.state === 'active') {
				ghost.setState('frightened');
				ghost.setForceReverse(true);
			} else if (ghost.state === 'frightened') {
				ghost.setForceReverse(true);
			}
		}
	}

	endFrightened(): void {
		for (const ghost of this.ghosts) {
			if (ghost.state === 'frightened') {
				ghost.setState('active');
			}
		}
	}

	toEyes(ghost: GhostModel): void {
		ghost.setState('eyes');
		ghost.setForceReverse(false);
	}

	reset(): void {
		const spawns = this.grid.ghostSpawns;
		for (const ghost of this.ghosts) {
			const spawn = spawns[ghost.kind];
			if (!spawn) {
				console.error('GhostService.reset', 'missing spawn', { kind: ghost.kind });
				continue;
			}
			ghost.reset(spawn, EXIT_DELAYS[ghost.kind] * this.exitScale);
		}
		this.resetWaves();
		this.powerActiveValue = false;
		this.msOverdriveValue = false;
		this.banishedValue = false;
	}

	private resetWaves(): void {
		this.mode = 'scatter';
		this.waveIndex = 0;
		this.modeTimer = this.arcade ? (this.arcade.waves[0] ?? Infinity) : this.scatterTime;
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('GhostService.update', 'invalid delta time', dt);
			return;
		}
		if (!this.visibleValue || this.banishedValue) {
			return;
		}
		const safeDt = Math.min(0.25, Math.max(0, dt));
		this.updateMode(safeDt);
		for (const ghost of this.ghosts) {
			this.updateGhost(ghost, safeDt);
		}
	}

	private updateMode(dt: number): void {
		this.modeTimer = Math.max(0, this.modeTimer - dt);
		if (this.modeTimer > EPSILON) {
			return;
		}
		if (this.arcade) {
			// the round's waves, then chase for good
			this.waveIndex += 1;
			this.mode = this.waveIndex % 2 === 0 ? 'scatter' : 'chase';
			this.modeTimer = this.arcade.waves[this.waveIndex] ?? Infinity;
		} else if (this.mode === 'scatter') {
			this.mode = 'chase';
			this.modeTimer = this.chaseTime;
		} else {
			this.mode = 'scatter';
			this.modeTimer = this.scatterTime;
		}
		for (const ghost of this.ghosts) {
			if (ghost.state === 'active' || ghost.state === 'frightened' || ghost.state === 'exiting') {
				ghost.setForceReverse(true);
			}
		}
	}

	/** The hypnosis service guides the hypnotised ghost and tells frightened ones what to flee. */
	setHypnosisGuide(guide: HypnosisGuide | null): void {
		this.hypnosisGuide = guide;
	}

	/** The maze as a ghost walks it (for route planning): the lair is closed to it. */
	routeWorld(): RouteWorld {
		return {
			walkable: (x, y) => this.grid.isGhostWalkable(x, y, false),
			teleport: (x, y) => this.grid.teleportDestination(x, y)
		};
	}

	/** Whether an uneaten dot lies on the tile. */
	hasDot(x: number, y: number): boolean {
		return this.grid.tileAt(x, y) === 'DT' && !this.progress.isCollected(x, y);
	}

	/** Tiles per second the ghost covers now. */
	speedOf(ghost: GhostModel): number {
		return this.effectiveSpeed(ghost);
	}

	private updateGhost(ghost: GhostModel, dt: number): void {
		if (ghost.state === 'lair') {
			ghost.decreaseExitTimer(dt);
			if (ghost.exitTimer > 0) {
				return;
			}
			ghost.setState('exiting');
		}
		let remaining = dt;
		let guard = 0;
		while (remaining > EPSILON && guard < 512) {
			guard += 1;
			if (!ghost.target) {
				const direction = this.chooseDirection(ghost);
				if (!direction) {
					break;
				}
				const target = ahead(ghost.tile, direction, 1);
				if (
					!this.grid.isGhostWalkable(
						target.x,
						target.y,
						ghost.state === 'exiting' || ghost.state === 'eyes'
					)
				) {
					break;
				}
				ghost.beginMove(direction, target);
			}
			const needed = Math.max(0, 1 - ghost.progress);
			const speed = this.effectiveSpeed(ghost);
			if (needed <= EPSILON) {
				ghost.completeMove();
				if (this.handleArrival(ghost)) {
					break;
				}
				continue;
			}
			const step = speed * remaining;
			if (step < needed) {
				ghost.addProgress(step);
				remaining = 0;
			} else {
				remaining -= needed / speed;
				ghost.completeMove();
				if (this.handleArrival(ghost)) {
					break;
				}
			}
		}
		if (guard >= 512) {
			console.error('GhostService.updateGhost', 'movement guard exhausted', { kind: ghost.kind });
		}
	}

	private effectiveSpeed(ghost: GhostModel): number {
		if (ghost.state === 'eyes') {
			return ghost.speed * 1.6;
		}
		if (ghost.state === 'hypnotized') {
			return ghost.speed * (this.hypnosisGuide?.speedFactor(ghost) ?? HYPNOSIS.speedFactor);
		}
		if (ghost.state === 'enraged') {
			return ghost.speed * 1.2;
		}
		if (ghost.state === 'frightened') {
			return ghost.speed * 0.6;
		}
		return ghost.speed * this.speedModifierValue;
	}

	private handleArrival(ghost: GhostModel): boolean {
		if (ghost.state === 'eyes') {
			const spawn = this.spawnFor(ghost);
			if (spawn && ghost.tile.x === spawn.x && ghost.tile.y === spawn.y) {
				ghost.reset(spawn, 1);
				return true;
			}
			return false;
		}
		if (ghost.state === 'hypnotized') {
			const tile = ghost.tile;
			if (this.grid.tileAt(tile.x, tile.y) === 'DT' && !this.progress.isCollected(tile.x, tile.y)) {
				this.progress.collectAt(tile.x, tile.y);
			}
		}
		if (ghost.state === 'exiting' && !isLairTile(this.grid, ghost.tile.x, ghost.tile.y)) {
			ghost.setState(this.msOverdriveValue || this.powerActiveValue ? 'frightened' : 'active');
		}
		const tile = ghost.tile;
		if (!this.grid.isTeleport(tile.x, tile.y)) {
			return false;
		}
		const destination = this.grid.teleportDestination(tile.x, tile.y);
		if (!destination) {
			console.error('GhostService.handleArrival', 'missing teleport destination', {
				kind: ghost.kind,
				tile
			});
			return false;
		}
		ghost.teleportTo(destination);
		if (ghost.state === 'exiting' && !isLairTile(this.grid, destination.x, destination.y)) {
			ghost.setState(this.msOverdriveValue || this.powerActiveValue ? 'frightened' : 'active');
		}
		return true;
	}

	private chooseDirection(ghost: GhostModel): GhostDirection | null {
		const allowLair = ghost.state === 'exiting' || ghost.state === 'eyes';
		const facing = ghost.facing;
		const opposite = facing ? oppositeDirection(facing) : null;
		const candidates: GhostDirection[] = [];
		for (const direction of DIRECTIONS) {
			const target = ahead(ghost.tile, direction, 1);
			if (this.grid.isGhostWalkable(target.x, target.y, allowLair)) {
				candidates.push(direction);
			}
		}
		if (candidates.length === 0) {
			return null;
		}
		if (candidates.length === 1) {
			ghost.setForceReverse(false);
			return candidates[0];
		}
		if (ghost.forceReverse && opposite && candidates.includes(opposite)) {
			ghost.setForceReverse(false);
			return opposite;
		}
		const withoutReverse =
			facing && opposite ? candidates.filter((direction) => direction !== opposite) : candidates;
		const choices = withoutReverse.length > 0 ? withoutReverse : candidates;
		if (ghost.state === 'hypnotized') {
			const guided = this.hypnosisGuide?.direction(ghost) ?? null;
			if (guided && choices.includes(guided)) {
				ghost.setForceReverse(false);
				return guided;
			}
		}
		const targetTile = this.currentTargetTile(ghost);
		let best: GhostDirection | null = null;
		let bestScore = Number.POSITIVE_INFINITY;
		for (const direction of choices) {
			const candidate = ahead(ghost.tile, direction, 1);
			const score = distanceSq(candidate, targetTile);
			if (score < bestScore) {
				bestScore = score;
				best = direction;
			}
		}
		ghost.setForceReverse(false);
		return best ?? choices[0];
	}

	private currentTargetTile(ghost: GhostModel): GhostTile {
		if (ghost.state === 'eyes') {
			return this.spawnFor(ghost) ?? this.exitTargetValue;
		}
		if (ghost.state === 'exiting') {
			return this.exitTargetValue;
		}
		if (ghost.state === 'hypnotized') {
			return nearestDotTarget(this.grid, this.progress, ghost.tile) ?? SCATTER_TARGETS[ghost.kind];
		}
		if (ghost.state === 'enraged') {
			return this.player.tile;
		}
		if (ghost.state === 'frightened') {
			// a frightened ghost near the hypnotised hunter runs from it, else from her
			return fleeTarget(
				ghost.kind,
				ghost.tile,
				this.hypnosisGuide?.threatFor(ghost) ?? this.player.tile
			);
		}
		if (this.mode === 'scatter') {
			return SCATTER_TARGETS[ghost.kind];
		}
		return this.chaseTarget(ghost);
	}

	private chaseTarget(ghost: GhostModel): GhostTile {
		const playerTile = this.player.tile;
		const playerFacing = this.player.facing;
		if (this.arcade) {
			return arcadeChaseTarget(ghost.kind, {
				grid: this.grid,
				ghost: ghost.tile,
				player: playerTile,
				facing: playerFacing,
				hasFood: (x, y) => {
					const token = this.grid.tileAt(x, y);
					return (token === 'DT' || token === 'EU') && !this.progress.isCollected(x, y);
				}
			});
		}
		return chaseTarget(ghost.kind, ghost.tile, {
			player: playerTile,
			playerFacing,
			blinky: this.ghostById('BLINKY')?.tile ?? null
		});
	}

	private ghostById(kind: GhostKind): GhostModel | undefined {
		return this.ghosts.find((ghost) => ghost.kind === kind);
	}

	private spawnFor(ghost: GhostModel): GhostTile | null {
		return this.grid.ghostSpawns[ghost.kind] ?? null;
	}
}
