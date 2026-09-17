import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridHolder } from '../logic/GridHolder.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import type { SeededRNG } from '../logic/SeededRNG.js';
import { BitOp } from '../components/index.js';
import { getSnakeLength, getTail } from '../logic/SnakeFactory.js';

const TARGET_LENGTH = 5;
const INITIAL_MOVES = 12;
const FAILURE_TAIL_LOSS = 2;
const MIN_SNAKE_LENGTH = 3;
const MAX_TARGET_ATTEMPTS = 32;

export class BitRegisterSystem extends SystemBase {
	public readonly name = 'BitRegisterSystem';

	private readonly holder: GridHolder;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;
	private readonly targetEntity: EntityId;
	private readonly collectorEntity: EntityId;

	private targetBits: (0 | 1)[] = [];
	private activeBits: (0 | 1)[] = [];
	private movesLeft = INITIAL_MOVES;

	constructor(world: World, holder: GridHolder, rng: SeededRNG, snakeId: EntityId) {
		super(world);

		this.holder = holder;
		this.rng = rng;
		this.snakeId = snakeId;

		this.targetEntity = this.world.createEntity();

		this.world.addComponent(this.targetEntity, 'targetSequence', {
			bits: [],
			movesLeft: this.movesLeft,
			requiredBits: TARGET_LENGTH
		});

		this.collectorEntity = this.world.createEntity();

		this.world.addComponent(this.collectorEntity, 'bitCollector', {
			snakeId: this.snakeId,
			collected: []
		});

		this.resetActive();
		this.generateTarget();
		this.pushStateToComponents();

		this.world.events.on('collision:food', (payload) => {
			this.onFoodEaten(payload.bit);
		});

		this.world.events.on('collision:bitop', (payload) => {
			this.onBitOperation(payload.op);
		});

		this.world.events.on('level:expanded', () => {
			this.onLevelExpanded();
		});
	}

	private get grid(): GridBitmask {
		return this.holder.grid;
	}

	public update(_deltaMS: number): void {
		this.syncBodyBits();
		this.pushStateToComponents();
	}

	private resetActive(): void {
		this.activeBits = [];

		for (let i = 0; i < TARGET_LENGTH; i++) {
			this.activeBits.push(0);
		}
	}

	private onLevelExpanded(): void {
		this.resetActive();
		this.generateTarget();
		this.pushStateToComponents();
	}

	private generateTarget(): void {
		let accepted = false;

		for (let attempt = 0; attempt < MAX_TARGET_ATTEMPTS; attempt++) {
			const bits = this.createRandomBits();

			if (!this.sameBits(bits, this.activeBits)) {
				this.targetBits = bits;
				accepted = true;
				break;
			}
		}

		if (!accepted) {
			const bits: (0 | 1)[] = [];

			for (let i = 0; i < TARGET_LENGTH; i++) {
				const current = this.activeBits[i];

				if (current === 0) {
					bits.push(1);
				} else {
					bits.push(0);
				}
			}

			this.targetBits = bits;
		}

		this.movesLeft = INITIAL_MOVES;
	}

	private createRandomBits(): (0 | 1)[] {
		const bits: (0 | 1)[] = [];

		for (let i = 0; i < TARGET_LENGTH; i++) {
			const value = this.rng.nextInt(2);

			if (value === 0) {
				bits.push(0);
			} else {
				bits.push(1);
			}
		}

		return bits;
	}

	private sameBits(a: (0 | 1)[], b: (0 | 1)[]): boolean {
		if (a.length !== b.length) {
			return false;
		}

		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) {
				return false;
			}
		}

		return true;
	}

	private onFoodEaten(bit: 0 | 1): void {
		this.shiftIn(bit);
		this.movesLeft = this.movesLeft - 1;

		if (this.matchesTarget()) {
			this.completeSequence();
			return;
		}

		if (this.movesLeft <= 0) {
			this.failSequence();
		}
	}

	private onBitOperation(op: BitOp): void {
		if (op === BitOp.SHL) {
			this.shiftLeft();
		} else if (op === BitOp.SHR) {
			this.shiftRight();
		} else if (op === BitOp.SHL3) {
			this.rotateLeft();
		} else if (op === BitOp.SHR3) {
			this.rotateRight();
		}

		if (this.matchesTarget()) {
			this.completeSequence();
		}
	}

	private completeSequence(): void {
		this.world.events.emit('sequence:completed', {});
		this.generateTarget();
		this.pushStateToComponents();
	}

	private failSequence(): void {
		this.world.events.emit('sequence:failed', {});
		this.applyFailurePenalty();
		this.resetActive();
		this.generateTarget();
		this.pushStateToComponents();
	}

	private applyFailurePenalty(): void {
		let length = getSnakeLength(this.world, this.snakeId);

		for (let i = 0; i < FAILURE_TAIL_LOSS; i++) {
			if (length <= MIN_SNAKE_LENGTH) {
				return;
			}

			const tailId = getTail(this.world, this.snakeId);
			const tailPos = this.world.getComponent(tailId, 'gridPosition');

			if (tailPos !== undefined) {
				this.grid.clearOccupied(tailPos.col, tailPos.row);
			}

			this.world.destroyEntity(tailId);
			length = length - 1;
		}
	}

	private shiftIn(bit: 0 | 1): void {
		if (this.activeBits.length === 0) {
			return;
		}

		const next: (0 | 1)[] = [];

		for (let i = 1; i < this.activeBits.length; i++) {
			next.push(this.activeBits[i]);
		}

		next.push(bit);
		this.activeBits = next;
	}

	private shiftLeft(): void {
		if (this.activeBits.length === 0) {
			return;
		}

		const next: (0 | 1)[] = [];

		for (let i = 1; i < this.activeBits.length; i++) {
			next.push(this.activeBits[i]);
		}

		next.push(0);
		this.activeBits = next;
	}

	private shiftRight(): void {
		if (this.activeBits.length === 0) {
			return;
		}

		const next: (0 | 1)[] = [0];

		for (let i = 0; i < this.activeBits.length - 1; i++) {
			next.push(this.activeBits[i]);
		}

		this.activeBits = next;
	}

	private rotateLeft(): void {
		if (this.activeBits.length <= 1) {
			return;
		}

		const first = this.activeBits[0];
		const next: (0 | 1)[] = [];

		for (let i = 1; i < this.activeBits.length; i++) {
			next.push(this.activeBits[i]);
		}

		next.push(first);
		this.activeBits = next;
	}

	private rotateRight(): void {
		if (this.activeBits.length <= 1) {
			return;
		}

		const last = this.activeBits[this.activeBits.length - 1];
		const next: (0 | 1)[] = [last];

		for (let i = 0; i < this.activeBits.length - 1; i++) {
			next.push(this.activeBits[i]);
		}

		this.activeBits = next;
	}

	private matchesTarget(): boolean {
		return this.sameBits(this.activeBits, this.targetBits);
	}

	private syncBodyBits(): void {
		const segments = this.world.query(['snakeSegment']).entities;

		for (const entity of segments) {
			const segment = this.world.getComponent(entity, 'snakeSegment');

			if (segment === undefined) {
				continue;
			}

			if (segment.snakeId !== this.snakeId) {
				continue;
			}

			const activeIndex = this.activeBits.length - 1 - segment.order;

			if (activeIndex >= 0 && activeIndex < this.activeBits.length) {
				segment.bit = this.activeBits[activeIndex];
			} else {
				segment.bit = 0;
			}
		}
	}

	private pushStateToComponents(): void {
		const target = this.world.getComponent(this.targetEntity, 'targetSequence');

		if (target !== undefined) {
			target.bits = this.targetBits.slice();
			target.movesLeft = this.movesLeft;
			target.requiredBits = this.activeBits.length;
		}

		const collector = this.world.getComponent(this.collectorEntity, 'bitCollector');

		if (collector !== undefined) {
			collector.collected = this.activeBits.slice();
		}
	}
}
