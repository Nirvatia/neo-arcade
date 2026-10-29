import type { GridService } from '../GridService';
import type { DoomTile, DoomDirection } from './DoomGraph';
import { adjacentTile, doomTileKey } from './DoomGraph';
import { canEscape } from './DoomHazards';

const DIRECTIONS: readonly DoomDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];

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

export function isDashFair(
	grid: GridService,
	bossTile: DoomTile,
	playerTile: DoomTile,
	direction: DoomDirection,
	telegraphSeconds: number,
	playerBaseSpeed: number,
	maxLength: number
): boolean {
	// the dash aims at the player, so the question is whether they can leave the line in time
	const threat = lineThreat(grid, bossTile, direction, maxLength);
	return canEscape(grid, playerTile, threat, telegraphSeconds, playerBaseSpeed);
}

export function isCrossFair(
	grid: GridService,
	bossTile: DoomTile,
	playerTile: DoomTile,
	telegraphSeconds: number,
	playerBaseSpeed: number
): boolean {
	const threat = crossThreat(grid, bossTile);
	return canEscape(grid, playerTile, threat, telegraphSeconds, playerBaseSpeed);
}
