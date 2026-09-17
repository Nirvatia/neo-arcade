import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import { findHead } from '../logic/SnakeFactory.js';
import { OPPOSITE } from '../logic/Directions.js';

export class SnakeControlSystem extends SystemBase {
	public readonly name = 'SnakeControlSystem';

	private readonly snakeId: EntityId;

	constructor(world: World, snakeId: EntityId) {
		super(world);
		this.snakeId = snakeId;
	}

	public update(_deltaMS: number): void {
		const headId = findHead(this.world, this.snakeId);
		const head = this.world.getComponent(headId, 'snakeHead');
		if (head === undefined) {
			return;
		}
		if (head.bufferedDir === null) {
			return;
		}
		const next = head.bufferedDir;
		if (next !== OPPOSITE[head.dir]) {
			head.dir = next;
		}
		head.bufferedDir = null;
	}
}
