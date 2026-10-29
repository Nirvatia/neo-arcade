import type { GridService } from './GridService';
import type { LevelProgress } from './LevelProgress';
import type { GridPoint } from './GridModel';

export class SpawnLocator {
	private readonly grid: GridService;
	private readonly progress: LevelProgress;

	constructor(grid: GridService, progress: LevelProgress) {
		if (!grid) {
			console.error('SpawnLocator.constructor', 'missing grid service');
			throw new Error('SpawnLocator.constructor: missing grid service');
		}
		if (!progress) {
			console.error('SpawnLocator.constructor', 'missing level progress');
			throw new Error('SpawnLocator.constructor: missing level progress');
		}
		this.grid = grid;
		this.progress = progress;
	}

	findSafeTile(seed: number, exclude: readonly GridPoint[] = []): GridPoint | null {
		if (!Number.isFinite(seed) || seed < 0) {
			console.error('SpawnLocator.findSafeTile', 'invalid seed', seed);
		}
		const candidates = this.progress.safeSpawnTiles();
		const available: GridPoint[] = [];
		for (const tile of candidates) {
			if (!this.isInside(tile.x, tile.y)) {
				continue;
			}
			if (this.grid.tileAt(tile.x, tile.y) !== 'DT') {
				continue;
			}
			if (this.isExcluded(tile.x, tile.y, exclude)) {
				continue;
			}
			available.push(tile);
		}
		if (available.length === 0) {
			return null;
		}
		const safeSeed = Number.isFinite(seed) && seed >= 0 ? Math.floor(seed) : 0;
		const index = safeSeed % available.length;
		const tile = available[index];
		if (!tile) {
			console.error('SpawnLocator.findSafeTile', 'candidate is missing', { seed, index });
			return null;
		}
		return tile;
	}

	private isInside(x: number, y: number): boolean {
		return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0;
	}

	private isExcluded(x: number, y: number, exclude: readonly GridPoint[]): boolean {
		for (const point of exclude) {
			if (point.x === x && point.y === y) {
				return true;
			}
		}
		return false;
	}
}