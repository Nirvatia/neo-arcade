import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import { Direction } from '../components/index.js';
import type { GridBitmask } from './GridBitmask.js';
import { DIR_VECTORS, OPPOSITE } from './Directions.js';

const BIT_BY_INDEX: (0 | 1)[] = [1, 0];
const BIT_TO_CHAR: string[] = ['0', '1'];

// Спавн змейки. Возвращает ID головы (он же используется как snakeId).
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

	// Голова создаётся первой, чтобы её ID стал snakeId для всех сегментов.
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
			world.addComponent(entity, 'snakeHead', { dir, bufferedDir: null });
		}

		grid.setOccupied(col, row);
	}

	return headId;
}

// Найти голову змейки по её идентификатору.
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

// Получить длину змейки.
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

// Найти сегмент по порядку.
export function getSegmentByOrder(world: World, snakeId: EntityId, order: number): EntityId {
	const segments = world.query(['snakeSegment']).entities;
	for (const entity of segments) {
		const segment = world.getComponent(entity, 'snakeSegment');
		if (segment !== undefined && segment.snakeId === snakeId && segment.order === order) {
			return entity;
		}
	}
	throw new Error(`getSegmentByOrder: no segment with order ${order} for snakeId ${snakeId}`);
}

// Битовая строка тела от головы к хвосту (например, "101").
export function getBitSequence(world: World, snakeId: EntityId): string {
	const segments = world.query(['snakeSegment']).entities;
	const collected: { order: number; bit: 0 | 1 }[] = [];
	for (const entity of segments) {
		const segment = world.getComponent(entity, 'snakeSegment');
		if (segment !== undefined && segment.snakeId === snakeId) {
			collected.push({ order: segment.order, bit: segment.bit });
		}
	}
	collected.sort((a, b) => a.order - b.order);

	let result = '';
	for (const item of collected) {
		result = result + BIT_TO_CHAR[item.bit];
	}
	return result;
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
