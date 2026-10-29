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
