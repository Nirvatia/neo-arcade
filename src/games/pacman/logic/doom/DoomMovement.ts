import type { GridService } from '../GridService';
import type { DoomTile, DoomDirection } from './DoomGraph';
import { adjacentTile, doomTileKey, bfsDistanceFrom, oppositeDirection } from './DoomGraph';

const DIRECTION_PRIORITY: Record<DoomDirection, number> = {
	UP: 1,
	LEFT: 2,
	DOWN: 3,
	RIGHT: 4
};

const ALL_DIRECTIONS: DoomDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];

interface DirectionCandidate {
	direction: DoomDirection;
	distance: number;
	priority: number;
}

export function chooseChaseDirection(
	grid: GridService,
	from: DoomTile,
	facing: DoomDirection | null,
	target: DoomTile,
	reverseLocked: boolean
): DoomDirection | null {
	const distances = bfsDistanceFrom(grid, target);
	const candidates: DirectionCandidate[] = [];
	for (const direction of ALL_DIRECTIONS) {
		if (reverseLocked && facing && direction === oppositeDirection(facing)) continue;
		const next = adjacentTile(from, direction);
		if (!grid.isInside(next.x, next.y)) continue;
		if (!grid.isWalkable(next.x, next.y)) continue;
		const distance = distances.get(doomTileKey(next)) ?? Number.POSITIVE_INFINITY;
		const priority = facing === direction ? 0 : DIRECTION_PRIORITY[direction];
		candidates.push({ direction, distance, priority });
	}
	if (candidates.length === 0) return null;
	candidates.sort((a, b) => {
		if (a.distance !== b.distance) return a.distance - b.distance;
		return a.priority - b.priority;
	});
	return candidates[0].direction;
}
