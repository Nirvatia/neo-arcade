import type { GridService } from '../GridService';

export interface DoomTile {
	readonly x: number;
	readonly y: number;
}

export type DoomDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export function doomTileKey(tile: DoomTile): string {
	return `${tile.x},${tile.y}`;
}

export function adjacentTile(from: DoomTile, direction: DoomDirection): DoomTile {
	switch (direction) {
		case 'UP': return { x: from.x, y: from.y - 1 };
		case 'DOWN': return { x: from.x, y: from.y + 1 };
		case 'LEFT': return { x: from.x - 1, y: from.y };
		case 'RIGHT': return { x: from.x + 1, y: from.y };
	}
}

export function oppositeDirection(direction: DoomDirection): DoomDirection {
	switch (direction) {
		case 'UP': return 'DOWN';
		case 'DOWN': return 'UP';
		case 'LEFT': return 'RIGHT';
		case 'RIGHT': return 'LEFT';
	}
}

export function doomDistanceSq(a: DoomTile, b: DoomTile): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

export function bfsDistanceFrom(
	grid: GridService,
	origin: DoomTile
): Map<string, number> {
	const distances = new Map<string, number>();
	const queue: Array<{ tile: DoomTile; distance: number }> = [];
	let head = 0;
	const originKey = doomTileKey(origin);
	distances.set(originKey, 0);
	queue.push({ tile: origin, distance: 0 });
	while (head < queue.length) {
		const current = queue[head++];
		const neighbors = grid.walkableNeighbors(current.tile.x, current.tile.y);
		for (const neighbor of neighbors) {
			const key = doomTileKey(neighbor);
			if (!distances.has(key)) {
				distances.set(key, current.distance + 1);
				queue.push({ tile: neighbor, distance: current.distance + 1 });
			}
		}
	}
	return distances;
}