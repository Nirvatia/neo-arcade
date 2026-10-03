import type { EntityId } from '../core/ecs/types.js';

export const Direction = {
	UP: 'UP',
	DOWN: 'DOWN',
	LEFT: 'LEFT',
	RIGHT: 'RIGHT'
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

export const BitOp = {
	BOOST: '<<',
	UNDO: '>>'
} as const;

export type BitOp = (typeof BitOp)[keyof typeof BitOp];

export const CollidableKind = {
	WALL: 'WALL',
	PICKUP: 'PICKUP',
	EXIT: 'EXIT'
} as const;

export type CollidableKind = (typeof CollidableKind)[keyof typeof CollidableKind];

export interface GridPosition {
	col: number;
	row: number;
}

export interface PixelPosition {
	x: number;
	y: number;
}

export interface SnakeHead {
	dir: Direction;
	queue: Direction[];
}

export interface SnakeSegment {
	snakeId: EntityId;
	order: number;
	bit: 0 | 1;
}

export interface Food {
	bit: 0 | 1;
}

export interface Exit {
	active: boolean;
}

export interface BitPowerUp {
	op: BitOp;
}

export interface Pulse {
	phase: number;
	speed: number;
}

export interface Lifetime {
	remaining: number;
}

export interface Render {
	color: number;
	char: string;
	scale: number;
	alpha: number;
}

export interface Collidable {
	kind: CollidableKind;
}

export interface Score {
	value: number;
}

export interface TargetSequence {
	bits: (0 | 1)[];
	movesLeft: number;
	requiredBits: number;
	streak: number;
}

export interface BitCollector {
	snakeId: EntityId;
	collected: (0 | 1)[];
}

export interface FoodWander {
	x: number;
	y: number;
	vx: number;
	vy: number;
	targetX: number;
	targetY: number;
	/**
	 * 0 —wander,
	 * 1 — flee.
	 */
	mode: 0 | 1;
	timerMS: number;
	phase: number;
	startleCdMS: number;
}

export interface DeathAnimation {
	active: boolean;
	elapsedMS: number;
	durationMS: number;
	progress: number;
}

export interface SnakeMotionPoint {
	x: number;
	y: number;
}

export interface SnakeMotion {
	points: SnakeMotionPoint[];
	baseU: number;
	segmentStartU: number;
	hasSegment: boolean;
	headU: number;
	targetLengthCells: number;
	visualLengthCells: number;
	version: number;
}

export interface ComponentDataMap {
	gridPosition: GridPosition;
	pixelPosition: PixelPosition;
	snakeHead: SnakeHead;
	snakeSegment: SnakeSegment;
	food: Food;
	exit: Exit;
	bitPowerUp: BitPowerUp;
	pulse: Pulse;
	lifetime: Lifetime;
	render: Render;
	collidable: Collidable;
	score: Score;
	targetSequence: TargetSequence;
	bitCollector: BitCollector;
	foodWander: FoodWander;
	deathAnimation: DeathAnimation;
	snakeMotion: SnakeMotion;
}

export type ComponentKey = keyof ComponentDataMap;