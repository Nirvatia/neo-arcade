import type { GridService } from '../maze/GridService';
import type { GridPoint } from '../maze/GridModel';
import type { DoomDirection } from './DoomGraph';
import { adjacentTile, doomTileKey } from './DoomGraph';

export type DoomHazardKind = 'rift' | 'eruption';

/** A set of tiles that is first marked (warn) and then deadly for a short window (active). */
export interface DoomHazard {
	readonly kind: DoomHazardKind;
	readonly tiles: readonly GridPoint[];
	readonly keys: ReadonlySet<string>;
	/** Rift only: the corridor axis, used to draw one continuous beam. */
	readonly axis: 'x' | 'y' | null;
	/** Seconds the warning is shown before detonation (may be shorter than warn). */
	readonly warnVisible: number;
	readonly warnTotal: number;
	readonly activeTotal: number;
	warn: number;
	active: number;
	hit: boolean;
}

export interface DoomSegment {
	readonly tiles: readonly GridPoint[];
	readonly axis: 'x' | 'y';
}

const DIRECTIONS: readonly DoomDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];

export class DoomHazardField {
	private readonly hazards: DoomHazard[] = [];
	private detonationsValue = 0;

	get list(): readonly DoomHazard[] {
		return this.hazards;
	}

	add(
		kind: DoomHazardKind,
		tiles: readonly GridPoint[],
		warn: number,
		active: number,
		axis: 'x' | 'y' | null = null,
		warnVisible = warn
	): void {
		if (tiles.length === 0) {
			return;
		}
		this.hazards.push({
			kind,
			tiles,
			keys: new Set(tiles.map(doomTileKey)),
			axis,
			warnVisible: Math.min(warn, warnVisible),
			warnTotal: warn,
			activeTotal: active,
			warn,
			active,
			hit: false
		});
	}

	/** Returns true when the player was caught by a hazard this step. */
	update(dt: number, playerTile: GridPoint, playerProtected: boolean): boolean {
		let caught = false;
		const playerKey = doomTileKey(playerTile);
		for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
			const hazard = this.hazards[i];
			if (hazard.warn > 0) {
				hazard.warn -= dt;
				if (hazard.warn <= 0) {
					this.detonationsValue += 1;
				} else {
					continue;
				}
			}
			if (!hazard.hit && !playerProtected && hazard.keys.has(playerKey)) {
				hazard.hit = true;
				caught = true;
			}
			hazard.active -= dt;
			if (hazard.active <= 0) {
				this.hazards.splice(i, 1);
			}
		}
		return caught;
	}

	consumeDetonations(): number {
		const value = this.detonationsValue;
		this.detonationsValue = 0;
		return value;
	}

	clear(): void {
		this.hazards.length = 0;
		this.detonationsValue = 0;
	}
}

/** The longest straight run of walkable tiles through `tile` along one axis. */
export function straightSegment(grid: GridService, tile: GridPoint, axis: 'x' | 'y'): DoomSegment {
	const back: DoomDirection = axis === 'x' ? 'LEFT' : 'UP';
	const forward: DoomDirection = axis === 'x' ? 'RIGHT' : 'DOWN';
	let start = tile;
	for (
		let next = adjacentTile(start, back);
		grid.isWalkable(next.x, next.y);
		next = adjacentTile(next, back)
	) {
		start = next;
	}
	const tiles: GridPoint[] = [];
	for (let cur = start; grid.isWalkable(cur.x, cur.y); cur = adjacentTile(cur, forward)) {
		tiles.push(cur);
	}
	return { tiles, axis };
}

/**
 * Can the player leave every threatened tile before it fires? Uses 80% of the
 * distance a player could cover, so a fair attack still asks for a reaction.
 */
export function canEscape(
	grid: GridService,
	from: GridPoint,
	threat: ReadonlySet<string>,
	seconds: number,
	playerSpeed: number
): boolean {
	if (!threat.has(doomTileKey(from))) {
		return true;
	}
	const reach = Math.floor(seconds * playerSpeed * 0.8);
	const visited = new Set<string>([doomTileKey(from)]);
	const queue: Array<{ tile: GridPoint; depth: number }> = [{ tile: from, depth: 0 }];
	for (let head = 0; head < queue.length; head += 1) {
		const { tile, depth } = queue[head];
		if (depth >= reach) {
			continue;
		}
		for (const dir of DIRECTIONS) {
			const next = adjacentTile(tile, dir);
			const key = doomTileKey(next);
			if (visited.has(key) || !grid.isPlayerWalkable(next.x, next.y)) {
				continue;
			}
			if (!threat.has(key)) {
				return true;
			}
			visited.add(key);
			queue.push({ tile: next, depth: depth + 1 });
		}
	}
	return false;
}

/** Player-walkable tiles grouped by path distance from `from`, up to `radius`. */
export function distanceRings(grid: GridService, from: GridPoint, radius: number): GridPoint[][] {
	const rings: GridPoint[][] = [[from]];
	const visited = new Set<string>([doomTileKey(from)]);
	let frontier: GridPoint[] = [from];
	for (let d = 1; d <= radius; d += 1) {
		const next: GridPoint[] = [];
		for (const tile of frontier) {
			for (const dir of DIRECTIONS) {
				const n = adjacentTile(tile, dir);
				const key = doomTileKey(n);
				if (visited.has(key) || !grid.isPlayerWalkable(n.x, n.y) || grid.isTeleport(n.x, n.y)) {
					continue;
				}
				visited.add(key);
				next.push(n);
			}
		}
		if (next.length === 0) {
			break;
		}
		rings.push(next);
		frontier = next;
	}
	return rings;
}

/** A set of tiles deadly from `start` to `end` seconds from now. */
export interface TimedThreat {
	readonly keys: ReadonlySet<string>;
	readonly start: number;
	readonly end: number;
}

/**
 * Can the player stay alive through every threat? A search over (tile, time step) at
 * 80% of the player's speed: each step the player moves to a neighbour, and may stay
 * only where Pac-Man can stop, against a wall (not mid-corridor, not on a crossroads).
 * No tile may be occupied while it is deadly.
 */
export function canOutlast(
	grid: GridService,
	from: GridPoint,
	threats: readonly TimedThreat[],
	playerSpeed: number
): boolean {
	if (threats.length === 0) {
		return true;
	}
	if (!(playerSpeed > 0)) {
		return false;
	}
	const step = 1 / (playerSpeed * 0.8);
	const horizon = Math.max(...threats.map((threat) => threat.end));
	const deadly = (key: string, t0: number, t1: number): boolean =>
		threats.some((threat) => threat.keys.has(key) && threat.start < t1 && threat.end > t0);
	let frontier = new Map<string, GridPoint>();
	const startKey = doomTileKey(from);
	if (!deadly(startKey, 0, step)) {
		frontier.set(startKey, from);
	}
	for (let k = 1; frontier.size > 0 && (k - 1) * step <= horizon; k += 1) {
		const t0 = k * step;
		const next = new Map<string, GridPoint>();
		for (const [key, tile] of frontier) {
			if (canStop(grid, tile) && !deadly(key, t0, t0 + step)) {
				next.set(key, tile);
			}
			for (const dir of DIRECTIONS) {
				const n = adjacentTile(tile, dir);
				const nKey = doomTileKey(n);
				if (
					next.has(nKey) ||
					!grid.isPlayerWalkable(n.x, n.y) ||
					grid.isTeleport(n.x, n.y) ||
					deadly(nKey, t0, t0 + step)
				) {
					continue;
				}
				next.set(nKey, n);
			}
		}
		frontier = next;
	}
	return frontier.size > 0;
}

/** Pac-Man halts on a tile only by running into a wall: corners, T-junctions, dead ends. */
function canStop(grid: GridService, tile: GridPoint): boolean {
	const open = DIRECTIONS.map((dir) => {
		const n = adjacentTile(tile, dir);
		return grid.isPlayerWalkable(n.x, n.y);
	});
	const exits = open.filter(Boolean).length;
	// UP, LEFT, DOWN, RIGHT: a straight corridor is open on opposite sides only
	const straight = exits === 2 && open[0] === open[2];
	return exits < 4 && !straight;
}

/**
 * Eruption: the disc of tiles within `inner` path steps of the player bursts first, the
 * ring out to `outer` bursts `gap` seconds later. Run out of the disc, then keep going
 * or step back into the burnt-out disc.
 */
export function eruptionWaves(
	grid: GridService,
	from: GridPoint,
	inner: number,
	outer: number
): { disc: GridPoint[]; ring: GridPoint[] } {
	const rings = distanceRings(grid, from, outer);
	return {
		disc: rings.slice(0, inner + 1).flat(),
		ring: rings.slice(inner + 1).flat()
	};
}
