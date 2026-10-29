import type { GridService } from '../GridService';
import type { PlayerService } from '../PlayerService';
import type { DoomTile, DoomDirection } from './DoomGraph';
import { adjacentTile, doomTileKey, bfsDistanceFrom } from './DoomGraph';
import { aheadTile } from './DoomAttackCore';

export type DoomMinionKind = 'pinky' | 'inky' | 'clyde';

export interface DoomMinion {
	readonly kind: DoomMinionKind;
	tile: DoomTile;
	target: DoomTile | null;
	facing: DoomDirection | null;
	moveProgress: number;
	lifetime: number;
}

const MINION_SPEED = 5.2;
const MINION_LIFETIME = 14;
const MAX_MINIONS = 3;

const DIRECTION_PRIORITY: Record<DoomDirection, number> = {
	UP: 1,
	LEFT: 2,
	DOWN: 3,
	RIGHT: 4
};

export function createMinion(kind: DoomMinionKind, spawn: DoomTile): DoomMinion {
	return {
		kind,
		tile: spawn,
		target: null,
		facing: null,
		moveProgress: 0,
		lifetime: MINION_LIFETIME
	};
}

export function minionPosition(minion: DoomMinion): { x: number; y: number } {
	if (minion.target) {
		return {
			x: minion.tile.x + (minion.target.x - minion.tile.x) * minion.moveProgress,
			y: minion.tile.y + (minion.target.y - minion.tile.y) * minion.moveProgress
		};
	}
	return { x: minion.tile.x, y: minion.tile.y };
}

export function updateMinion(
	minion: DoomMinion,
	grid: GridService,
	player: PlayerService,
	bossTile: DoomTile,
	dt: number
): void {
	minion.lifetime = Math.max(0, minion.lifetime - dt);
	if (minion.lifetime <= 0) return;
	if (minion.target) {
		minion.moveProgress = Math.min(1, minion.moveProgress + dt * MINION_SPEED);
		if (minion.moveProgress >= 1) {
			minion.tile = minion.target;
			minion.target = null;
			minion.moveProgress = 0;
		}
	}
	if (!minion.target) {
		const targetTile = minionTargetTile(minion.kind, player, bossTile, grid);
		const direction = chooseMinionDirection(grid, minion.tile, minion.facing, targetTile);
		if (direction) {
			minion.facing = direction;
			minion.target = adjacentTile(minion.tile, direction);
			minion.moveProgress = 0;
		}
	}
}

function minionTargetTile(
	kind: DoomMinionKind,
	player: PlayerService,
	bossTile: DoomTile,
	grid: GridService
): DoomTile {
	const playerTile: DoomTile = {
		x: Math.floor(player.position.x),
		y: Math.floor(player.position.y)
	};
	const facing = player.facing;
	if (kind === 'pinky') {
		return aheadTile(playerTile, facing, 4);
	}
	if (kind === 'inky') {
		const pivot = aheadTile(playerTile, facing, 2);
		return {
			x: pivot.x * 2 - bossTile.x,
			y: pivot.y * 2 - bossTile.y
		};
	}
	const dist = Math.abs(playerTile.x - bossTile.x) + Math.abs(playerTile.y - bossTile.y);
	if (dist > 8) {
		return playerTile;
	}
	return nearestCorner(grid, bossTile);
}

function nearestCorner(grid: GridService, from: DoomTile): DoomTile {
	const corners: DoomTile[] = [
		{ x: 1, y: 1 },
		{ x: 1, y: grid.height - 2 },
		{ x: grid.width - 2, y: 1 },
		{ x: grid.width - 2, y: grid.height - 2 }
	];
	let best = corners[0];
	let bestDist = Number.POSITIVE_INFINITY;
	for (const corner of corners) {
		const d = Math.abs(corner.x - from.x) + Math.abs(corner.y - from.y);
		if (d < bestDist) {
			bestDist = d;
			best = corner;
		}
	}
	return best;
}

function chooseMinionDirection(
	grid: GridService,
	from: DoomTile,
	facing: DoomDirection | null,
	target: DoomTile
): DoomDirection | null {
	const distances = bfsDistanceFrom(grid, target);
	const directions: DoomDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
	let bestDirection: DoomDirection | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	let bestPriority = Number.POSITIVE_INFINITY;
	for (const direction of directions) {
		const next = adjacentTile(from, direction);
		if (!grid.isInside(next.x, next.y)) continue;
		if (!grid.isWalkable(next.x, next.y)) continue;
		const distance = distances.get(doomTileKey(next)) ?? Number.POSITIVE_INFINITY;
		const priority = facing === direction ? 0 : DIRECTION_PRIORITY[direction];
		if (distance < bestDistance || (distance === bestDistance && priority < bestPriority)) {
			bestDistance = distance;
			bestPriority = priority;
			bestDirection = direction;
		}
	}
	return bestDirection;
}

export function maxMinions(): number {
	return MAX_MINIONS;
}