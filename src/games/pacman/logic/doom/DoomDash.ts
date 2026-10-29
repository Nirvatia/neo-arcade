import type { GridService } from '../GridService';
import type { DoomTile, DoomDirection } from './DoomGraph';
import { adjacentTile } from './DoomGraph';
import { directionBetween, sameRowOrCol, tileDistance } from './DoomAttackCore';

export interface DoomDashConfig {
	readonly telegraph: number;
	readonly speed: number;
	readonly maxLength: number;
	readonly recover: number;
	readonly minDist: number;
	readonly maxDist: number;
}

export function dashConfigForPhase(phase: number): DoomDashConfig {
	if (phase === 1) return { telegraph: 0.7, speed: 11.2, maxLength: 14, recover: 0.8, minDist: 3, maxDist: 12 };
	if (phase === 2) return { telegraph: 0.6, speed: 12.0, maxLength: 14, recover: 0.7, minDist: 3, maxDist: 12 };
	return { telegraph: 0.5, speed: 12.8, maxLength: 14, recover: 0.6, minDist: 3, maxDist: 12 };
}

export interface DoomDashCheckResult {
	readonly canStart: boolean;
	readonly direction: DoomDirection | null;
}

export function canStartDash(
	grid: GridService,
	bossTile: DoomTile,
	playerTile: DoomTile,
	phase: number
): DoomDashCheckResult {
	const config = dashConfigForPhase(phase);
	if (!sameRowOrCol(bossTile, playerTile)) {
		return { canStart: false, direction: null };
	}
	const dist = tileDistance(bossTile, playerTile);
	if (dist < config.minDist || dist > config.maxDist) {
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