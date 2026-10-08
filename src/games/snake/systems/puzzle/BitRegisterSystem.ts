import { SystemBase } from '../../engine/ecs/SystemBase.js';
import { BitOp } from '../../components/index.js';
import { GameplayConfig, getLevelTuning } from '../../config/index.js';
import type { GridService } from '$games/snake/logic/grid/GridService.js';
import type { LevelSystem } from '../progression/LevelSystem.js';
import type { MovementSystem } from '../movement/MovementSystem.js';
import type { ScoreSystem } from '../progression/ScoreSystem.js';
import type { FxCoordinator } from '$games/snake/render/fx/FxCoordinator.js';
import type { SeededRNG } from '$games/snake/logic/math/SeededRNG.js';
import type { EntityId } from '$games/snake/engine/ecs/types.js';
import type { World } from '$games/snake/engine/ecs/World.js';

export interface BitRegisterDeps {
	movement: MovementSystem;
	level: LevelSystem;
	score: ScoreSystem;
	fx: FxCoordinator;
}

/**
 * BitRegisterSystem новой прогрессии.
 *
 * Изменения:
 * - удалена финальная последовательность;
 * - добавлено отслеживание ошибок;
 * - последовательность без ошибок даёт бонусные очки.
 */
export class BitRegisterSystem extends SystemBase {
	public readonly name = 'BitRegisterSystem';

	private readonly service: GridService;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;
	private readonly targetEntity: EntityId;
	private readonly collectorEntity: EntityId;

	private deps: BitRegisterDeps | null = null;
	private level = 1;
	private targetLength: number;
	private movesPerSequence: number;
	private targetBits: (0 | 1)[] = [];
	private activeBits: (0 | 1)[] = [];
	private movesLeft = 0;
	private streak = 0;

	/**
	 * Ошибка с момента последней успешно завершённой последовательности.
	 *
	 * Ошибкой считается:
	 * - провал последовательности;
	 * - использование токена UNDO.
	 */
	private errorSinceLastCompletion = false;

	constructor(
		world: World,
		service: GridService,
		rng: SeededRNG,
		snakeId: EntityId
	) {
		super(world);

		this.service = service;
		this.rng = rng;
		this.snakeId = snakeId;

		const tuning = getLevelTuning(this.level);
		this.targetLength = tuning.targetLength;
		this.movesPerSequence = tuning.movesPerSequence;
		this.movesLeft = tuning.movesPerSequence;

		this.targetEntity = this.world.createEntity();
		this.world.addComponent(this.targetEntity, 'targetSequence', {
			bits: [],
			movesLeft: this.movesLeft,
			requiredBits: this.targetLength,
			streak: 0
		});

		this.collectorEntity = this.world.createEntity();
		this.world.addComponent(this.collectorEntity, 'bitCollector', {
			snakeId: this.snakeId,
			collected: []
		});

		this.resetActive();
		this.generateTarget();
		this.pushStateToComponents();
	}

	public setDependencies(deps: BitRegisterDeps): void {
		this.deps = deps;
	}

	public update(_deltaMS: number): void {
		this.syncBodyBits();
		this.pushStateToComponents();
	}

	public onFoodEaten(bit: 0 | 1): void {
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

	public onBitOperation(op: BitOp): void {
		if (op === BitOp.UNDO) {
			this.errorSinceLastCompletion = true;
			this.shiftRight();
			this.movesLeft = Math.min(this.movesLeft + 1, this.movesPerSequence);
		} else if (op === BitOp.BOOST) {
			if (this.applyOverdrive()) {
				return;
			}
		}

		if (this.matchesTarget()) {
			this.completeSequence();
		}
	}

	/**
	 * Обновление при смене уровня внутри биома.
	 */
	public onLevelExpanded(level: number): void {
		this.level = level;

		const tuning = getLevelTuning(this.level);
		this.targetLength = tuning.targetLength;
		this.movesPerSequence = tuning.movesPerSequence;

		this.resetActive();
		this.generateTarget();
		this.pushStateToComponents();
	}

	/**
	 * Обновление при смене биома.
	 *
	 * Сбрасываем ошибку, но сохраняем комбо-серию.
	 */
	public onBiomeChanged(level: number): void {
		this.errorSinceLastCompletion = false;
		this.onLevelExpanded(level);
	}

	private resetActive(): void {
		this.activeBits = [];

		for (let i = 0; i < this.targetLength; i++) {
			this.activeBits.push(0);
		}
	}

	private generateTarget(): void {
		let accepted = false;

		for (let attempt = 0; attempt < GameplayConfig.MAX_TARGET_ATTEMPTS; attempt++) {
			const bits = this.createRandomBits();

			if (!this.sameBits(bits, this.activeBits)) {
				this.targetBits = bits;
				accepted = true;
				break;
			}
		}

		if (!accepted) {
			const bits: (0 | 1)[] = [];

			for (let i = 0; i < this.targetLength; i++) {
				const current = this.activeBits[i];

				if (current === 0) {
					bits.push(1);
				} else {
					bits.push(0);
				}
			}

			this.targetBits = bits;
		}

		this.movesLeft = this.movesPerSequence;
	}

	private createRandomBits(): (0 | 1)[] {
		const bits: (0 | 1)[] = [];

		for (let i = 0; i < this.targetLength; i++) {
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

	private applyOverdrive(): boolean {
		const amount = getLevelTuning(this.level).overdriveBits;

		for (let i = 0; i < amount; i++) {
			this.shiftIn(this.chooseBestBit());

			if (this.matchesTarget()) {
				this.completeSequence();
				return true;
			}
		}

		return false;
	}

	private chooseBestBit(): 0 | 1 {
		const zero = this.countMatchesAfterShift(0);
		const one = this.countMatchesAfterShift(1);

		if (one > zero) {
			return 1;
		}

		if (zero > one) {
			return 0;
		}

		return this.rng.nextInt(2) === 0 ? 0 : 1;
	}

	private countMatchesAfterShift(bit: 0 | 1): number {
		const n = this.activeBits.length;
		let matches = 0;

		for (let i = 0; i < n; i++) {
			const value: 0 | 1 =
				i === n - 1
					? bit
					: this.activeBits[i + 1] !== undefined
						? this.activeBits[i + 1]!
						: 0;

			const target = this.targetBits[i];

			if (target !== undefined && value === target) {
				matches = matches + 1;
			}
		}

		return matches;
	}

	private completeSequence(): void {
		if (this.deps === null) {
			throw new Error('BitRegisterSystem: dependencies not set.');
		}

		const flawless = !this.errorSinceLastCompletion;

		this.streak = this.streak + 1;
		this.errorSinceLastCompletion = false;

		this.deps.movement.grow(GameplayConfig.GROWTH_PER_SEQUENCE);
		this.deps.level.onSequenceCompleted();
		this.deps.score.onSequenceCompleted(this.streak, flawless);
		this.deps.fx.onSequenceCompleted();

		this.generateTarget();
		this.pushStateToComponents();
	}

	private failSequence(): void {
		if (this.deps === null) {
			throw new Error('BitRegisterSystem: dependencies not set.');
		}

		this.streak = 0;
		this.errorSinceLastCompletion = true;

		this.deps.movement.shrink(GameplayConfig.FAILURE_TAIL_LOSS);
		this.deps.fx.onSequenceFailed();

		this.resetActive();
		this.generateTarget();
		this.pushStateToComponents();
	}

	private shiftIn(bit: 0 | 1): void {
		if (this.activeBits.length === 0) {
			return;
		}

		const next: (0 | 1)[] = [];

		for (let i = 1; i < this.activeBits.length; i++) {
			const val = this.activeBits[i];

			if (val !== undefined) {
				next.push(val);
			}
		}

		next.push(bit);

		this.activeBits = next;
	}

	private shiftRight(): void {
		if (this.activeBits.length === 0) {
			return;
		}

		const next: (0 | 1)[] = [0];

		for (let i = 0; i < this.activeBits.length - 1; i++) {
			const val = this.activeBits[i];

			if (val !== undefined) {
				next.push(val);
			}
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
				const bit = this.activeBits[activeIndex];

				if (bit !== undefined) {
					segment.bit = bit;
				}
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
			target.streak = this.streak;
		}

		const collector = this.world.getComponent(this.collectorEntity, 'bitCollector');

		if (collector !== undefined) {
			collector.collected = this.activeBits.slice();
		}
	}
}