import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { Direction } from '../components/index.js';
import { findHead } from '../logic/SnakeFactory.js';
import { OPPOSITE } from '../logic/Directions.js';

export class InputSystem extends SystemBase {
	public readonly name = 'InputSystem';
	private readonly snakeId: EntityId;
	private readonly maxQueueSize: number;

	constructor(world: World, snakeId: EntityId, maxQueueSize: number) {
		super(world);
		this.snakeId = snakeId;
		this.maxQueueSize = maxQueueSize;
	}

	public pressDirection(dir: Direction): void {
		let headId: EntityId;
		try {
			headId = findHead(this.world, this.snakeId);
		} catch {
			return;
		}
		const head = this.world.getComponent(headId, 'snakeHead');
		if (head === undefined) {
			return;
		}
		const lastDir =
			head.queue.length > 0 ? head.queue[head.queue.length - 1]! : head.dir;
		if (dir === lastDir) {
			return;
		}
		if (dir === OPPOSITE[lastDir]) {
			return;
		}
		if (head.queue.length < this.maxQueueSize) {
			head.queue.push(dir);
		}
	}

	public update(_deltaMS: number): void {
		// Очередь потребляется строго в момент логического шага в MovementSystem.step().
	}
}