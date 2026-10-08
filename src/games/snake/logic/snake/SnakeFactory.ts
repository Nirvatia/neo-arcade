import { DIR_VECTORS, OPPOSITE } from './Directions.js';
import type { World } from '$games/snake/engine/ecs/World.js';
import type { EntityId } from '$games/snake/engine/ecs/types.js';
import type { GridBitmask } from '../grid/GridBitmask.js';
import type { Direction } from '$games/snake/components/index.js';

const BIT_BY_INDEX: (0 | 1)[] = [1, 0];

export function spawnSnake(
	world: World,
	grid: GridBitmask,
	headCol: number,
	headRow: number,
	dir: Direction,
	length: number
): EntityId {
	if (length < 1) {
		throw new Error(`spawnSnake: length must be >= 1, got ${length}`);
	}

	const back = OPPOSITE[dir];
	const backVec = DIR_VECTORS[back];
	const headId = world.createEntity();

	for (let i = 0; i < length; i++) {
		const col = headCol + backVec.dx * i;
		const row = headRow + backVec.dy * i;

		if (!grid.withinBounds(col, row)) {
			throw new Error(`spawnSnake: segment ${i} out of bounds at (${col}, ${row})`);
		}

		if (grid.isWall(col, row)) {
			throw new Error(`spawnSnake: segment ${i} collides with wall at (${col}, ${row})`);
		}

		let entity: EntityId;

		if (i === 0) {
			entity = headId;
		} else {
			entity = world.createEntity();
		}

		const bit = BIT_BY_INDEX[i % 2];

		world.addComponent(entity, 'gridPosition', { col, row });
		world.addComponent(entity, 'snakeSegment', { snakeId: headId, order: i, bit });

		if (i === 0) {
			world.addComponent(entity, 'snakeHead', { dir, queue: [] });
		}

		grid.setOccupied(col, row);
	}

	return headId;
}

export function findHead(world: World, snakeId: EntityId): EntityId {
	const heads = world.query(['snakeHead', 'snakeSegment']).entities;

	for (const entity of heads) {
		const segment = world.getComponent(entity, 'snakeSegment');

		if (segment !== undefined && segment.snakeId === snakeId) {
			return entity;
		}
	}

	throw new Error(`findHead: no head found for snakeId ${snakeId}`);
}

export function getSnakeLength(world: World, snakeId: EntityId): number {
	const segments = world.query(['snakeSegment']).entities;
	let count = 0;

	for (const entity of segments) {
		const segment = world.getComponent(entity, 'snakeSegment');

		if (segment !== undefined && segment.snakeId === snakeId) {
			count = count + 1;
		}
	}

	return count;
}

export function getTail(world: World, snakeId: EntityId): EntityId {
	const segments = world.query(['snakeSegment']).entities;
	let tailId: EntityId = -1;
	let maxOrder = -1;

	for (const entity of segments) {
		const segment = world.getComponent(entity, 'snakeSegment');

		if (segment !== undefined && segment.snakeId === snakeId) {
			if (segment.order > maxOrder) {
				maxOrder = segment.order;
				tailId = entity;
			}
		}
	}

	if (tailId === -1) {
		throw new Error(`getTail: no segments found for snakeId ${snakeId}`);
	}

	return tailId;
}