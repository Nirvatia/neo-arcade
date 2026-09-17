import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { Direction } from '../components/index.js';
import { findHead } from '../logic/SnakeFactory.js';

export class InputSystem extends SystemBase {
	public readonly name = 'InputSystem';

	private readonly snakeId: EntityId;
	private readonly maxQueueSize: number;
	private queue: Direction[] = [];

	constructor(world: World, snakeId: EntityId, maxQueueSize: number) {
		super(world);
		this.snakeId = snakeId;
		this.maxQueueSize = maxQueueSize;
	}

	// Вызывается извне между тиками: клавиатура, свайпы, тесты.
	public pressDirection(dir: Direction): void {
		if (this.queue.length < this.maxQueueSize) {
			this.queue.push(dir);
		}
	}

	public update(_deltaMS: number): void {
		if (this.queue.length === 0) {
			return;
		}
		const headId = findHead(this.world, this.snakeId);
		const head = this.world.getComponent(headId, 'snakeHead');
		if (head === undefined) {
			return;
		}
		const next = this.queue.shift();
		if (next !== undefined) {
			head.bufferedDir = next;
		}
	}
}
