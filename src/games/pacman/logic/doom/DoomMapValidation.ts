import type { GridPoint } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';
import { isLairTile } from '../maze/LairExit';

interface CornerQuadrant {
	readonly anchorX: number;
	readonly anchorY: number;
	readonly minX: number;
	readonly maxX: number;
	readonly minY: number;
	readonly maxY: number;
}

const MIN_INDEPENDENT_CYCLES = 4;
const MIN_STRAIGHT_SEGMENTS = 6;
const MIN_STRAIGHT_LENGTH = 7;
const MIN_CORNER_EXITS = 2;
const MODULE_NAME = 'DoomMapValidation';

function tileKey(x: number, y: number): string {
	return `${x}:${y}`;
}

function buildExcludedTiles(grid: GridService): Set<string> {
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (!grid.isInside(x, y)) {
				continue;
			}
			const lairToken = isLairTile(grid, x, y);
			const ghostOnly = grid.isGhostWalkable(x, y, true) && !grid.isPlayerWalkable(x, y);
			if (lairToken || ghostOnly) {
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
			}
		}
	}

	const excluded = new Set<string>();
	if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
		return excluded;
	}

	for (let y = minY; y <= maxY; y += 1) {
		for (let x = minX; x <= maxX; x += 1) {
			excluded.add(tileKey(x, y));
		}
	}
	return excluded;
}

function isArenaTile(
	grid: GridService,
	excluded: ReadonlySet<string>,
	x: number,
	y: number
): boolean {
	if (!grid.isInside(x, y)) {
		return false;
	}
	if (excluded.has(tileKey(x, y))) {
		return false;
	}
	return grid.isPlayerWalkable(x, y);
}

function arenaNeighbors(
	grid: GridService,
	excluded: ReadonlySet<string>,
	x: number,
	y: number
): GridPoint[] {
	const result: GridPoint[] = [];
	const candidates: GridPoint[] = [
		{ x, y: y - 1 },
		{ x: x - 1, y },
		{ x, y: y + 1 },
		{ x: x + 1, y }
	];
	for (const candidate of candidates) {
		if (isArenaTile(grid, excluded, candidate.x, candidate.y)) {
			result.push(candidate);
		}
	}
	if (grid.isTeleport(x, y)) {
		const destination = grid.teleportDestination(x, y);
		if (destination && isArenaTile(grid, excluded, destination.x, destination.y)) {
			result.push(destination);
		}
	}
	return result;
}

function collectArenaTiles(grid: GridService, excluded: ReadonlySet<string>): GridPoint[] {
	const tiles: GridPoint[] = [];
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (isArenaTile(grid, excluded, x, y)) {
				tiles.push({ x, y });
			}
		}
	}
	return tiles;
}

function findCornerInQuadrant(
	grid: GridService,
	excluded: ReadonlySet<string>,
	quadrant: CornerQuadrant
): GridPoint | null {
	let best: GridPoint | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (let y = quadrant.minY; y <= quadrant.maxY; y += 1) {
		for (let x = quadrant.minX; x <= quadrant.maxX; x += 1) {
			if (!isArenaTile(grid, excluded, x, y)) {
				continue;
			}
			const dx = x - quadrant.anchorX;
			const dy = y - quadrant.anchorY;
			const distance = dx * dx + dy * dy;
			if (distance < bestDistance) {
				bestDistance = distance;
				best = { x, y };
			}
		}
	}
	return best;
}

export function findDoomCorners(grid: GridService): GridPoint[] {
	const excluded = buildExcludedTiles(grid);
	const width = grid.width;
	const height = grid.height;
	const halfX = Math.floor(width / 2);
	const halfY = Math.floor(height / 2);
	const quadrants: CornerQuadrant[] = [
		{
			anchorX: 0,
			anchorY: 0,
			minX: 0,
			maxX: halfX - 1,
			minY: 0,
			maxY: halfY - 1
		},
		{
			anchorX: width - 1,
			anchorY: 0,
			minX: halfX,
			maxX: width - 1,
			minY: 0,
			maxY: halfY - 1
		},
		{
			anchorX: 0,
			anchorY: height - 1,
			minX: 0,
			maxX: halfX - 1,
			minY: halfY,
			maxY: height - 1
		},
		{
			anchorX: width - 1,
			anchorY: height - 1,
			minX: halfX,
			maxX: width - 1,
			minY: halfY,
			maxY: height - 1
		}
	];

	const corners: GridPoint[] = [];
	for (const quadrant of quadrants) {
		const corner = findCornerInQuadrant(grid, excluded, quadrant);
		if (!corner) {
			throw new Error(
				`[${MODULE_NAME}] findDoomCorners: no walkable tile in quadrant with anchor (${quadrant.anchorX}, ${quadrant.anchorY})`
			);
		}
		corners.push(corner);
	}
	return corners;
}

export function assertDoomMap(grid: GridService): void {
	const excluded = buildExcludedTiles(grid);
	assertNoWideBlocks(grid, excluded);
	assertNoDeadEnds(grid, excluded);
	assertConnected(grid, excluded);
	assertCorners(grid, excluded);
	assertCycles(grid, excluded);
	assertStraightSegments(grid, excluded);
	assertNoDots(grid, excluded);
}

function assertNoWideBlocks(grid: GridService, excluded: ReadonlySet<string>): void {
	for (let y = 0; y < grid.height - 1; y += 1) {
		for (let x = 0; x < grid.width - 1; x += 1) {
			if (
				isArenaTile(grid, excluded, x, y) &&
				isArenaTile(grid, excluded, x + 1, y) &&
				isArenaTile(grid, excluded, x, y + 1) &&
				isArenaTile(grid, excluded, x + 1, y + 1)
			) {
				throw new Error(`[${MODULE_NAME}] assertNoWideBlocks: 2x2 walkable block at (${x}, ${y})`);
			}
		}
	}
}

function assertNoDeadEnds(grid: GridService, excluded: ReadonlySet<string>): void {
	for (const tile of collectArenaTiles(grid, excluded)) {
		if (grid.isTeleport(tile.x, tile.y)) {
			continue;
		}
		const exits = arenaNeighbors(grid, excluded, tile.x, tile.y).length;
		if (exits <= 1) {
			throw new Error(
				`[${MODULE_NAME}] assertNoDeadEnds: dead end at (${tile.x}, ${tile.y}), exits=${exits}`
			);
		}
	}
}

function assertConnected(grid: GridService, excluded: ReadonlySet<string>): void {
	const spawn = grid.playerSpawn;
	if (!isArenaTile(grid, excluded, spawn.x, spawn.y)) {
		throw new Error(
			`[${MODULE_NAME}] assertConnected: player spawn (${spawn.x}, ${spawn.y}) is not an arena tile`
		);
	}

	const visited = new Set<string>();
	const queue: GridPoint[] = [spawn];
	visited.add(tileKey(spawn.x, spawn.y));
	let head = 0;

	while (head < queue.length) {
		const current = queue[head];
		head += 1;
		for (const next of arenaNeighbors(grid, excluded, current.x, current.y)) {
			const nextKey = tileKey(next.x, next.y);
			if (!visited.has(nextKey)) {
				visited.add(nextKey);
				queue.push(next);
			}
		}
	}

	for (const tile of collectArenaTiles(grid, excluded)) {
		if (!visited.has(tileKey(tile.x, tile.y))) {
			throw new Error(
				`[${MODULE_NAME}] assertConnected: tile (${tile.x}, ${tile.y}) unreachable from spawn (${spawn.x}, ${spawn.y})`
			);
		}
	}
}

function assertCorners(grid: GridService, excluded: ReadonlySet<string>): void {
	const corners = findDoomCorners(grid);
	for (const corner of corners) {
		const exits = arenaNeighbors(grid, excluded, corner.x, corner.y).length;
		if (exits < MIN_CORNER_EXITS) {
			throw new Error(
				`[${MODULE_NAME}] assertCorners: corner (${corner.x}, ${corner.y}) has ${exits} exits, need ${MIN_CORNER_EXITS}`
			);
		}
	}
}

function assertCycles(grid: GridService, excluded: ReadonlySet<string>): void {
	const tiles = collectArenaTiles(grid, excluded);
	const edges = new Set<string>();
	for (const tile of tiles) {
		const fromKey = tileKey(tile.x, tile.y);
		for (const next of arenaNeighbors(grid, excluded, tile.x, tile.y)) {
			const toKey = tileKey(next.x, next.y);
			edges.add(fromKey < toKey ? `${fromKey}|${toKey}` : `${toKey}|${fromKey}`);
		}
	}
	const rank = edges.size - tiles.length + 1;
	if (rank < MIN_INDEPENDENT_CYCLES) {
		throw new Error(
			`[${MODULE_NAME}] assertCycles: independent cycles=${rank}, need at least ${MIN_INDEPENDENT_CYCLES}`
		);
	}
}

function assertStraightSegments(grid: GridService, excluded: ReadonlySet<string>): void {
	let segments = 0;

	for (let y = 0; y < grid.height; y += 1) {
		let run = 0;
		for (let x = 0; x <= grid.width; x += 1) {
			if (x < grid.width && isArenaTile(grid, excluded, x, y)) {
				run += 1;
				continue;
			}
			if (run >= MIN_STRAIGHT_LENGTH) {
				segments += 1;
			}
			run = 0;
		}
	}

	for (let x = 0; x < grid.width; x += 1) {
		let run = 0;
		for (let y = 0; y <= grid.height; y += 1) {
			if (y < grid.height && isArenaTile(grid, excluded, x, y)) {
				run += 1;
				continue;
			}
			if (run >= MIN_STRAIGHT_LENGTH) {
				segments += 1;
			}
			run = 0;
		}
	}

	if (segments < MIN_STRAIGHT_SEGMENTS) {
		throw new Error(
			`[${MODULE_NAME}] assertStraightSegments: straight segments>=${MIN_STRAIGHT_LENGTH} tiles count=${segments}, need ${MIN_STRAIGHT_SEGMENTS}`
		);
	}
}

function assertNoDots(grid: GridService, excluded: ReadonlySet<string>): void {
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (isArenaTile(grid, excluded, x, y) && grid.isDot(x, y)) {
				throw new Error(`[${MODULE_NAME}] assertNoDots: dot at (${x}, ${y})`);
			}
		}
	}
}
