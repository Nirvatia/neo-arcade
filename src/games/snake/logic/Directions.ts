import { Direction } from '../components/index.js';

export const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
	[Direction.UP]: { dx: 0, dy: -1 },
	[Direction.DOWN]: { dx: 0, dy: 1 },
	[Direction.LEFT]: { dx: -1, dy: 0 },
	[Direction.RIGHT]: { dx: 1, dy: 0 }
};

export const OPPOSITE: Record<Direction, Direction> = {
	[Direction.UP]: Direction.DOWN,
	[Direction.DOWN]: Direction.UP,
	[Direction.LEFT]: Direction.RIGHT,
	[Direction.RIGHT]: Direction.LEFT
};
