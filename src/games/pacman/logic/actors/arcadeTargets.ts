import type { GridService } from '../maze/GridService';
import type { GhostDirection, GhostKind, GhostTile } from './GhostModel';
import { ARCADE } from '../../config/arcadeConfig';

const VECTORS: Record<GhostDirection, GhostTile> = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 }
};
const OPPOSITE: Record<GhostDirection, GhostDirection> = {
	UP: 'DOWN',
	DOWN: 'UP',
	LEFT: 'RIGHT',
	RIGHT: 'LEFT'
};
const ORDER: readonly GhostDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];

/** What the arcade ghosts know about the board when they pick a chase target. */
export interface ArcadeChaseInput {
	readonly grid: GridService;
	readonly ghost: GhostTile;
	readonly player: GhostTile;
	readonly facing: GhostDirection | null;
	/** Is there still a dot or an energizer on this tile? */
	readonly hasFood: (x: number, y: number) => boolean;
}

/**
 * The arcade ghosts' characters (our own, for the secret level):
 * - BLINKY, the hunter: straight at Pac-Man.
 * - PINKY, the ambusher: the junction Pac-Man is running into.
 * - INKY, the herder: the junction behind Pac-Man, to cut off the way back.
 * - CLYDE, the keeper: guards the quarter of the maze with the most food left and only
 *   gives chase when Pac-Man comes close.
 */
export function arcadeChaseTarget(kind: GhostKind, input: ArcadeChaseInput): GhostTile {
	const { grid, player, facing } = input;
	if (kind === 'PINKY') {
		return facing ? junctionAlong(grid, player, facing) : player;
	}
	if (kind === 'INKY') {
		return facing ? junctionAlong(grid, player, OPPOSITE[facing]) : player;
	}
	if (kind === 'CLYDE') {
		const dx = input.ghost.x - player.x;
		const dy = input.ghost.y - player.y;
		if (dx * dx + dy * dy <= ARCADE.keeperReach * ARCADE.keeperReach) {
			return player;
		}
		return fullestQuarter(grid, input.hasFood) ?? player;
	}
	return player;
}

/**
 * The first junction (three or more ways out) reached from `from` heading `dir`, following
 * corners; `from` itself when nothing is found within the lookout.
 */
export function junctionAlong(grid: GridService, from: GhostTile, dir: GhostDirection): GhostTile {
	const open = (t: GhostTile, d: GhostDirection): boolean => {
		const n = { x: t.x + VECTORS[d].x, y: t.y + VECTORS[d].y };
		return grid.isPlayerWalkable(n.x, n.y) && !grid.isTeleport(n.x, n.y);
	};
	let tile = from;
	let heading = dir;
	for (let i = 0; i < ARCADE.junctionLookout; i += 1) {
		if (!open(tile, heading)) {
			const turn = ORDER.find((d) => d !== OPPOSITE[heading] && open(tile, d));
			if (!turn) {
				return tile;
			}
			heading = turn;
		}
		tile = { x: tile.x + VECTORS[heading].x, y: tile.y + VECTORS[heading].y };
		if (grid.exitsCount(tile.x, tile.y) >= 3) {
			return tile;
		}
	}
	return tile;
}

/** The middle of the quarter of the board with the most food left, or null when empty. */
export function fullestQuarter(
	grid: GridService,
	hasFood: (x: number, y: number) => boolean
): GhostTile | null {
	const counts = [0, 0, 0, 0];
	const hx = grid.width / 2;
	const hy = grid.height / 2;
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (hasFood(x, y)) {
				counts[(x < hx ? 0 : 1) + (y < hy ? 0 : 2)] += 1;
			}
		}
	}
	const best = counts.indexOf(Math.max(...counts));
	if (counts[best] === 0) {
		return null;
	}
	return {
		x: Math.floor(best % 2 === 0 ? hx / 2 : hx + hx / 2),
		y: Math.floor(best < 2 ? hy / 2 : hy + hy / 2)
	};
}
