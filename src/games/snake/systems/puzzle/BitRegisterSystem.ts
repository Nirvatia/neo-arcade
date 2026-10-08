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
	private movesLeft = 0;
	private streak = 0;
	private errorSinceLastCompletion = false;
	private version = 0;
	
	private readonly targetBits: (0 | 1)[] = [];
	private readonly activeBits: (0 | 1)[] = [];

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
		
		const maxLen = GameplayConfig.MAX_SEQUENCE_LENGTH;
		for (let i = 0; i < maxLen; i++) {
			this.targetBits.push(0);
			this.activeBits.push(0);
		}
		
		this.targetEntity = this.world.createEntity();
		this.world.addComponent(this.targetEntity, 'targetSequence', {
			bits: new Array(maxLen).fill(0),
			movesLeft: this.movesLeft,
			requiredBits: this.targetLength,
			streak: 0,
			version: 0
		});
		
		this.collectorEntity = this.world.createEntity();
		this.world.addComponent(this.collectorEntity, 'bitCollector', {
			snakeId: this.snakeId,
			collected: new Array(maxLen).fill(0),
			count: this.targetLength,
			version: 0
		});
		
		this.resetActive();
		this.generateTarget();
		this.pushStateToComponents();
		this.syncBodyBits();
	}

	public setDependencies(deps: BitRegisterDeps): void {
		this.deps = deps;
	}

	public update(_deltaMS: number): void {
		// Состояние обновляется только при событиях (поедание еды, токены, уровень).
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
			return;
		}
		
		this.pushStateToComponents();
		this.syncBodyBits();
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
			return;
		}
		
		this.pushStateToComponents();
		this.syncBodyBits();
	}

	public onLevelExpanded(level: number): void {
		this.level = level;
		const tuning = getLevelTuning(this.level);
		this.targetLength = tuning.targetLength;
		this.movesPerSequence = tuning.movesPerSequence;
		this.resetActive();
		this.generateTarget();
		this.pushStateToComponents();
		this.syncBodyBits();
	}

	public onBiomeChanged(level: number): void {
		this.errorSinceLastCompletion = false;
		this.onLevelExpanded(level);
	}

	private resetActive(): void {
		for (let i = 0; i < this.targetLength; i++) {
			this.activeBits[i] = 0;
		}
	}

	private generateTarget(): void {
		let accepted = false;
		
		for (let attempt = 0; attempt < GameplayConfig.MAX_TARGET_ATTEMPTS; attempt++) {
			this.fillRandomBits(this.targetBits);
			if (!this.sameBits(this.targetBits, this.activeBits, this.targetLength)) {
				accepted = true;
				break;
			}
		}
		
		if (!accepted) {
			for (let i = 0; i < this.targetLength; i++) {
				const current = this.activeBits[i];
				this.targetBits[i] = current === 0 ? 1 : 0;
			}
		}
		
		this.movesLeft = this.movesPerSequence;
	}

	private fillRandomBits(bits: (0 | 1)[]): void {
		for (let i = 0; i < this.targetLength; i++) {
			bits[i] = this.rng.nextInt(2) === 0 ? 0 : 1;
		}
	}

	private sameBits(a: (0 | 1)[], b: (0 | 1)[], length: number): boolean {
		for (let i = 0; i < length; i++) {
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
		
		if (one > zero) return 1;
		if (zero > one) return 0;
		return this.rng.nextInt(2) === 0 ? 0 : 1;
	}

	private countMatchesAfterShift(bit: 0 | 1): number {
		let matches = 0;
		
		for (let i = 0; i < this.targetLength; i++) {
			const value: 0 | 1 =
				i === this.targetLength - 1
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
		this.syncBodyBits();
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
		this.syncBodyBits();
	}

	private shiftIn(bit: 0 | 1): void {
		if (this.targetLength === 0) return;
		
		for (let i = 0; i < this.targetLength - 1; i++) {
			this.activeBits[i] = this.activeBits[i + 1]!;
		}
		this.activeBits[this.targetLength - 1] = bit;
	}

	private shiftRight(): void {
		if (this.targetLength === 0) return;
		
		for (let i = this.targetLength - 1; i > 0; i--) {
			this.activeBits[i] = this.activeBits[i - 1]!;
		}
		this.activeBits[0] = 0;
	}

	private matchesTarget(): boolean {
		return this.sameBits(this.activeBits, this.targetBits, this.targetLength);
	}

	private syncBodyBits(): void {
		const segments = this.world.query(['snakeSegment']).entities;
		
		for (const entity of segments) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			if (segment === undefined) continue;
			if (segment.snakeId !== this.snakeId) continue;
			
			const activeIndex = this.targetLength - 1 - segment.order;
			if (activeIndex >= 0 && activeIndex < this.targetLength) {
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
		this.version = this.version + 1;
		
		const target = this.world.getComponent(this.targetEntity, 'targetSequence');
		if (target !== undefined) {
			target.version = this.version;
			target.movesLeft = this.movesLeft;
			target.requiredBits = this.targetLength;
			target.streak = this.streak;
			
			for (let i = 0; i < this.targetLength; i++) {
				target.bits[i] = this.targetBits[i];
			}
		}
		
		const collector = this.world.getComponent(this.collectorEntity, 'bitCollector');
		if (collector !== undefined) {
			collector.version = this.version;
			collector.count = this.targetLength;
			
			for (let i = 0; i < this.targetLength; i++) {
				collector.collected[i] = this.activeBits[i];
			}
		}
	}
}