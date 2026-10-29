import type { TileType } from './GridModel';

export interface LairGridQuery {
	readonly width: number;
	readonly height: number;
	isInside(x: number, y: number): boolean;
	tileAt(x: number, y: number): TileType;
	isPlayerWalkable(x: number, y: number): boolean;
}

export function isLairToken(token: TileType): boolean {
	return (
		token === 'LE' ||
		token === 'LT' ||
		token === 'BY' ||
		token === 'PY' ||
		token === 'IY' ||
		token === 'CE'
	);
}

export function isLairTile(grid: LairGridQuery, x: number, y: number): boolean {
	if (!grid.isInside(x, y)) {
		return false;
	}
	return isLairToken(grid.tileAt(x, y));
}

export function resolveExitTarget(
	grid: LairGridQuery,
	from: { x: number; y: number }
): { x: number; y: number } | null {
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (grid.tileAt(x, y) !== 'LE') {
				continue;
			}
			const candidates = [
				{ x, y: y - 1 },
				{ x, y: y + 1 },
				{ x: x - 1, y },
				{ x: x + 1, y }
			];
			for (const candidate of candidates) {
				if (!grid.isInside(candidate.x, candidate.y)) {
					continue;
				}
				const token = grid.tileAt(candidate.x, candidate.y);
				if (token === 'WL' || token === 'ES') {
					continue;
				}
				if (isLairToken(token)) {
					continue;
				}
				if (!grid.isPlayerWalkable(candidate.x, candidate.y)) {
					continue;
				}
				return { x: candidate.x, y: candidate.y };
			}
		}
	}
	let best: { x: number; y: number } | null = null;
	let bestScore = Number.POSITIVE_INFINITY;
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			const token = grid.tileAt(x, y);
			if (token === 'WL' || token === 'ES') {
				continue;
			}
			if (isLairToken(token)) {
				continue;
			}
			const dx = x - from.x;
			const dy = y - from.y;
			const score = dx * dx + dy * dy;
			if (score < bestScore) {
				bestScore = score;
				best = { x, y };
			}
		}
	}
	if (!best) {
		console.error('LairExit.resolveExitTarget', 'exit tile not found', { from });
	}
	return best;
}