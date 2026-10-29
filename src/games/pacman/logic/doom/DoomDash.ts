import type { GridService } from '../maze/GridService';
import type { DoomTile, DoomDirection } from './DoomGraph';
import { adjacentTile } from './DoomGraph';
import { directionBetween, sameRowOrCol, tileDistance } from './DoomAttackCore';
import { DASH_MAX_DISTANCE, DASH_MIN_DISTANCE } from './DoomBalance';

export interface DoomDashCheckResult {
	readonly canStart: boolean;
	readonly direction: DoomDirection | null;
}

export function canStartDash(
	grid: GridService,
	bossTile: DoomTile,
	playerTile: DoomTile
): DoomDashCheckResult {
	if (!sameRowOrCol(bossTile, playerTile)) {
		return { canStart: false, direction: null };
	}
	const dist = tileDistance(bossTile, playerTile);
	if (dist < DASH_MIN_DISTANCE || dist > DASH_MAX_DISTANCE) {
		return { canStart: false, direction: null };
	}
	const direction = directionBetween(bossTile, playerTile);
	if (!direction) {
		return { canStart: false, direction: null };
	}
	if (!hasLineOfSight(grid, bossTile, playerTile, direction)) {
		return { canStart: false, direction: null };
	}
	return { canStart: true, direction };
}

function hasLineOfSight(
	grid: GridService,
	from: DoomTile,
	to: DoomTile,
	direction: DoomDirection
): boolean {
	let current = adjacentTile(from, direction);
	let steps = 0;
	const maxSteps = 28;
	while ((current.x !== to.x || current.y !== to.y) && steps < maxSteps) {
		if (!grid.isInside(current.x, current.y)) return false;
		if (!grid.isWalkable(current.x, current.y)) return false;
		current = adjacentTile(current, direction);
		steps += 1;
	}
	return steps < maxSteps;
}
