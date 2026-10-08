import { SystemBase } from '../../engine/ecs/SystemBase.js';
import type { EntityId } from '$games/snake/engine/ecs/types.js';
import type { World } from '$games/snake/engine/ecs/World.js';
import type { Direction } from '$games/snake/components/index.js';
import { findHead } from '$games/snake/logic/snake/SnakeFactory.js';
import { OPPOSITE } from '$games/snake/logic/snake/Directions.js';

export class InputSystem extends SystemBase {
	public readonly name = 'InputSystem';

	private readonly snakeId: EntityId;
	private readonly maxQueueSize: number;

	private suppressed = false;
	private firstInputCallback: (() => void) | null = null;
	private frozen = false;

	constructor(world: World, snakeId: EntityId, maxQueueSize: number) {
		super(world);
		this.snakeId = snakeId;
		this.maxQueueSize = maxQueueSize;
	}

	public setOnFirstInput(callback: () => void): void {
		this.firstInputCallback = callback;
	}

	public suppress(): void {
		this.suppressed = true;
	}

	public setFrozen(frozen: boolean): void {
		this.frozen = frozen;
	}

	public pressDirection(dir: Direction): void {
		if (this.frozen) {
			return;
		}

		if (this.suppressed) {
			return;
		}

		if (this.firstInputCallback !== null) {
			const callback = this.firstInputCallback;
			this.firstInputCallback = null;
			callback();
		}

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

		const lastDir = head.queue.length > 0 ? head.queue[head.queue.length - 1]! : head.dir;

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
