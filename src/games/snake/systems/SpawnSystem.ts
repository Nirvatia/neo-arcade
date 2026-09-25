import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { GridHolder } from '../logic/GridHolder.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import type { SeededRNG } from '../logic/SeededRNG.js';

const MAX_SPAWN_ATTEMPTS = 200;
const REFILL_GUARD = 1000;

export class SpawnSystem extends SystemBase {
	public readonly name = 'SpawnSystem';
	private readonly holder: GridHolder;
	private readonly rng: SeededRNG;
	private readonly targetFoodCount: number;
	// В фазе выхода еда не пополняется: поле очищено.
	private suppressed = false;

	constructor(world: World, holder: GridHolder, rng: SeededRNG, targetFoodCount: number) {
		super(world);
		this.holder = holder;
		this.rng = rng;
		this.targetFoodCount = targetFoodCount;
		this.world.events.on('exit:opened', this.onExitOpened);
		this.world.events.on('final:started', this.onFinalStarted);
		this.world.events.on('level:expanded', this.onLevelExpanded);
		this.world.events.on('game:endless', this.onEndlessStarted);
	}

	private onExitOpened = (): void => {
		this.suppressed = true;
	};

	private onFinalStarted = (): void => {
		// Финалу нужна еда: последовательность собирается из битов.
		this.suppressed = false;
	};

	private onLevelExpanded = (): void => {
		this.suppressed = false;
	};

	private onEndlessStarted = (): void => {
		this.suppressed = false;
	};

	private get grid(): GridBitmask {
		return this.holder.grid;
	}

	public update(_deltaMS: number): void {
		this.refillFood();
	}

	public refillFood(): void {
		if (this.suppressed) {
			return;
		}
		let guard = 0;
		while (this.grid.countFood() < this.targetFoodCount) {
			const placed = this.placeOneFood();
			if (!placed) {
				return;
			}
			guard = guard + 1;
			if (guard > REFILL_GUARD) {
				return;
			}
		}
	}

private placeOneFood(): boolean {
    for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt++) {
        const col = this.rng.nextInt(this.grid.cols);
        const row = this.rng.nextInt(this.grid.rows);
        if (!this.grid.withinBounds(col, row)) {
            continue;
        }
        if (this.grid.isWall(col, row)) {
            continue;
        }
        if (this.grid.isOccupied(col, row)) {
            continue;
        }
        if (this.grid.isFood(col, row)) {
            continue;
        }
        if (this.grid.isExit(col, row)) {
            continue;
        }
        const bit = this.chooseBit();
        this.grid.setFood(col, row, bit);
        
        // Создаём сущность для еды
        const entityId = this.world.createEntity();
        this.world.addComponent(entityId, 'gridPosition', { col, row });
        this.world.addComponent(entityId, 'food', { bit });
        this.world.events.emit('food:spawned', { entity: entityId });
        
        return true;
    }
    return false;
}

	private chooseBit(): 0 | 1 {
		let targetHasZero = false;
		let targetHasOne = false;
		const targets = this.world.query(['targetSequence']).entities;
		if (targets.length > 0) {
			const target = this.world.getComponent(targets[0], 'targetSequence');
			if (target !== undefined) {
				for (const bit of target.bits) {
					if (bit === 0) {
						targetHasZero = true;
					} else {
						targetHasOne = true;
					}
				}
			}
		}
		if (targetHasZero && !targetHasOne) {
			return 0;
		}
		if (targetHasOne && !targetHasZero) {
			return 1;
		}
		const zeroCount = this.countFoodBit(0);
		const oneCount = this.countFoodBit(1);
		if (targetHasZero && zeroCount === 0) {
			return 0;
		}
		if (targetHasOne && oneCount === 0) {
			return 1;
		}
		const value = this.rng.nextInt(2);
		if (value === 0) {
			return 0;
		}
		return 1;
	}

	private countFoodBit(bit: 0 | 1): number {
		let count = 0;
		for (let row = 0; row < this.grid.rows; row++) {
			for (let col = 0; col < this.grid.cols; col++) {
				if (this.grid.isFood(col, row) && this.grid.getFoodBit(col, row) === bit) {
					count = count + 1;
				}
			}
		}
		return count;
	}
}