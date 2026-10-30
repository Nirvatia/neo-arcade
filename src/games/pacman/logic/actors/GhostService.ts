import type { GridService } from '../maze/GridService';
import type { PlayerService } from './PlayerService';
import type { LevelProgress } from '../level/LevelProgress';
import { GhostModel } from './GhostModel';
import type { GhostDirection, GhostKind, GhostState, GhostTile } from './GhostModel';
import { isLairTile, resolveExitTarget } from '../maze/LairExit';
import type { ArcadeRoundTuning } from '../../config/arcadeConfig';
import { arcadeChaseTarget } from './arcadeTargets';

const VECTORS: Record<GhostDirection, { x: number; y: number }> = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 }
};
const DIRECTIONS: readonly GhostDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
const SCATTER_TARGETS: Record<GhostKind, GhostTile> = {
	BLINKY: { x: 22, y: 2 },
	PINKY: { x: 2, y: 2 },
	INKY: { x: 22, y: 23 },
	CLYDE: { x: 2, y: 23 }
};
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

type GhostMode = 'scatter' | 'chase';

export class GhostService {
	private readonly grid: GridService;
	private readonly player: PlayerService;
	private readonly progress: LevelProgress;
	private readonly ghosts: GhostModel[];
	private readonly exitTargetValue: GhostTile;
	private mode: GhostMode = 'scatter';
	private modeTimer = SCATTER_TIME;
	private powerActiveValue = false;
	private msOverdriveValue = false;
	private speedModifierValue = 1;
	private visibleValue = true;
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

	get list(): readonly GhostModel[] {
		return this.visibleValue ? this.ghosts : EMPTY_GHOST_LIST;
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
				if (ghost.state === 'active' || ghost.state === 'exiting' || ghost.state === 'frightened') {
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
			ghost.reset(spawn, EXIT_DELAYS[ghost.kind]);
		}
		this.resetWaves();
		this.powerActiveValue = false;
		this.msOverdriveValue = false;
	}

	private resetWaves(): void {
		this.mode = 'scatter';
		this.waveIndex = 0;
		this.modeTimer = this.arcade ? (this.arcade.waves[0] ?? Infinity) : SCATTER_TIME;
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('GhostService.update', 'invalid delta time', dt);
			return;
		}
		if (!this.visibleValue) {
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
			this.modeTimer = CHASE_TIME;
		} else {
			this.mode = 'scatter';
			this.modeTimer = SCATTER_TIME;
		}
		for (const ghost of this.ghosts) {
			if (ghost.state === 'active' || ghost.state === 'frightened' || ghost.state === 'exiting') {
				ghost.setForceReverse(true);
			}
		}
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
				const target = this.targetFor(ghost.tile, direction);
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
			return ghost.speed * 0.8;
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
		const opposite = facing ? this.oppositeDirection(facing) : null;
		const candidates: GhostDirection[] = [];
		for (const direction of DIRECTIONS) {
			const target = this.targetFor(ghost.tile, direction);
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
		const targetTile = this.currentTargetTile(ghost);
		let best: GhostDirection | null = null;
		let bestScore = Number.POSITIVE_INFINITY;
		for (const direction of choices) {
			const candidate = this.targetFor(ghost.tile, direction);
			const score = this.distanceSq(candidate, targetTile);
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
			return this.nearestDotTarget(ghost) ?? SCATTER_TARGETS[ghost.kind];
		}
		if (ghost.state === 'enraged') {
			return this.player.tile;
		}
		if (ghost.state === 'frightened') {
			return this.fleeTarget(ghost);
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
		if (ghost.kind === 'BLINKY') {
			return playerTile;
		}
		if (ghost.kind === 'PINKY') {
			return this.ahead(playerTile, playerFacing, 4);
		}
		if (ghost.kind === 'INKY') {
			const pivot = this.ahead(playerTile, playerFacing, 2);
			const blinky = this.ghostById('BLINKY');
			if (!blinky) {
				return pivot;
			}
			return {
				x: pivot.x + (pivot.x - blinky.tile.x),
				y: pivot.y + (pivot.y - blinky.tile.y)
			};
		}
		const distance = this.distanceSq(ghost.tile, playerTile);
		if (distance > 64) {
			return playerTile;
		}
		return SCATTER_TARGETS.CLYDE;
	}

	private fleeTarget(ghost: GhostModel): GhostTile {
		const playerTile = this.player.tile;
		const dx = ghost.tile.x - playerTile.x;
		const dy = ghost.tile.y - playerTile.y;
		if (dx === 0 && dy === 0) {
			return SCATTER_TARGETS[ghost.kind];
		}
		return {
			x: ghost.tile.x + dx * 2,
			y: ghost.tile.y + dy * 2
		};
	}

	private nearestDotTarget(ghost: GhostModel): GhostTile | null {
		let best: GhostTile | null = null;
		let bestScore = Number.POSITIVE_INFINITY;
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (this.grid.tileAt(x, y) !== 'DT') {
					continue;
				}
				if (this.progress.isCollected(x, y)) {
					continue;
				}
				const candidate: GhostTile = { x, y };
				const score = this.distanceSq(ghost.tile, candidate);
				if (score < bestScore) {
					bestScore = score;
					best = candidate;
				}
			}
		}
		return best;
	}

	private ahead(point: GhostTile, direction: GhostDirection | null, steps: number): GhostTile {
		if (!direction) {
			return point;
		}
		const vector = VECTORS[direction];
		return {
			x: point.x + vector.x * steps,
			y: point.y + vector.y * steps
		};
	}

	private targetFor(tile: GhostTile, direction: GhostDirection): GhostTile {
		const vector = VECTORS[direction];
		return {
			x: tile.x + vector.x,
			y: tile.y + vector.y
		};
	}

	private oppositeDirection(direction: GhostDirection): GhostDirection {
		if (direction === 'UP') {
			return 'DOWN';
		}
		if (direction === 'DOWN') {
			return 'UP';
		}
		if (direction === 'LEFT') {
			return 'RIGHT';
		}
		return 'LEFT';
	}

	private distanceSq(a: GhostTile, b: GhostTile): number {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		return dx * dx + dy * dy;
	}

	private ghostById(kind: GhostKind): GhostModel | undefined {
		return this.ghosts.find((ghost) => ghost.kind === kind);
	}

	private spawnFor(ghost: GhostModel): GhostTile | null {
		return this.grid.ghostSpawns[ghost.kind] ?? null;
	}
}
