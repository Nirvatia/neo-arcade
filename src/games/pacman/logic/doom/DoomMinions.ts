import type { DoomTile, DoomDirection } from './DoomGraph';
import { BROOD_MINION_LIFETIME } from './DoomBalance';

export type DoomMinionKind = 'pinky' | 'inky' | 'clyde';

export interface DoomMinion {
	readonly kind: DoomMinionKind;
	tile: DoomTile;
	target: DoomTile | null;
	facing: DoomDirection | null;
	moveProgress: number;
	lifetime: number;
}

export function createMinion(kind: DoomMinionKind, spawn: DoomTile): DoomMinion {
	return {
		kind,
		tile: { x: spawn.x, y: spawn.y },
		target: null,
		facing: null,
		moveProgress: 0,
		lifetime: BROOD_MINION_LIFETIME
	};
}

/** Tile-center coordinates, same convention as PlayerService.position. */
export function minionPosition(minion: DoomMinion): { x: number; y: number } {
	if (minion.target) {
		return {
			x: minion.tile.x + 0.5 + (minion.target.x - minion.tile.x) * minion.moveProgress,
			y: minion.tile.y + 0.5 + (minion.target.y - minion.tile.y) * minion.moveProgress
		};
	}
	return { x: minion.tile.x + 0.5, y: minion.tile.y + 0.5 };
}
