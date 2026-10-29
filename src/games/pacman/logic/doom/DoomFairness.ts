import type { GridService } from '../GridService';
import type { DoomTile, DoomDirection } from './DoomGraph';
import { adjacentTile, doomTileKey } from './DoomGraph';

const DIRECTIONS: readonly DoomDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
const MIN_ESCAPE_TILES = 1;

export function lineThreat(
	grid: GridService,
	from: DoomTile,
	direction: DoomDirection,
	maxLength: number
): Set<string> {
	const cells = new Set<string>();
	let current = from;
	const limit = Math.max(0, Math.floor(maxLength));
	for (let i = 0; i < limit; i++) {
		const next = adjacentTile(current, direction);
		if (!grid.isInside(next.x, next.y)) break;
		if (!grid.isWalkable(next.x, next.y)) break;
		cells.add(doomTileKey(next));
		current = next;
	}
	return cells;
}

export function crossThreat(grid: GridService, center: DoomTile): Set<string> {
	const cells = new Set<string>();
	for (const direction of DIRECTIONS) {
		for (const key of lineThreat(grid, center, direction, 32)) {
			cells.add(key);
		}
	}
	return cells;
}

export function hasEscapeRoute(
	grid: GridService,
	playerTile: DoomTile,
	threat: ReadonlySet<string>,
	telegraphSeconds: number,
	playerBaseSpeed: number
): boolean {
	if (!Number.isFinite(telegraphSeconds) || telegraphSeconds < 0) return false;
	if (!Number.isFinite(playerBaseSpeed) || playerBaseSpeed <= 0) return false;
	if (threat.has(doomTileKey(playerTile))) return false;
	const reach = Math.max(
		MIN_ESCAPE_TILES,
		Math.floor(telegraphSeconds * playerBaseSpeed - 1)
	);
	const visited = new Set<string>([doomTileKey(playerTile)]);
	const queue: Array<{ tile: DoomTile; depth: number }> = [
		{ tile: playerTile, depth: 0 }
	];
	let head = 0;
	let safeBranches = 0;
	while (head < queue.length) {
		const current = queue[head];
		head += 1;
		if (current.depth > 0 && countSafeExits(grid, current.tile, threat) >= 2) {
			safeBranches += 1;
		}
		if (current.depth >= reach) continue;
		for (const direction of DIRECTIONS) {
			const next = adjacentTile(current.tile, direction);
			const key = doomTileKey(next);
			if (visited.has(key)) continue;
			if (!grid.isInside(next.x, next.y)) continue;
			if (!grid.isPlayerWalkable(next.x, next.y)) continue;
			if (threat.has(key)) continue;
			visited.add(key);
			queue.push({ tile: next, depth: current.depth + 1 });
		}
	}
	return safeBranches >= 1;
}

export function isDashFair(
	grid: GridService,
	bossTile: DoomTile,
	playerTile: DoomTile,
	direction: DoomDirection,
	telegraphSeconds: number,
	playerBaseSpeed: number,
	maxLength: number
): boolean {
	const threat = lineThreat(grid, bossTile, direction, maxLength);
	return hasEscapeRoute(grid, playerTile, threat, telegraphSeconds, playerBaseSpeed);
}

export function isCrossFair(
	grid: GridService,
	bossTile: DoomTile,
	playerTile: DoomTile,
	telegraphSeconds: number,
	playerBaseSpeed: number
): boolean {
	const threat = crossThreat(grid, bossTile);
	return hasEscapeRoute(grid, playerTile, threat, telegraphSeconds, playerBaseSpeed);
}

function countSafeExits(
	grid: GridService,
	tile: DoomTile,
	threat: ReadonlySet<string>
): number {
	let exits = 0;
	for (const direction of DIRECTIONS) {
		const next = adjacentTile(tile, direction);
		if (!grid.isInside(next.x, next.y)) continue;
		if (!grid.isPlayerWalkable(next.x, next.y)) continue;
		if (threat.has(doomTileKey(next))) continue;
		exits += 1;
	}
	return exits;
}