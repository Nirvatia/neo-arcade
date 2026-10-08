import type { World } from '$games/snake/engine/ecs/World.js';
import type { GridService } from '$games/snake/logic/grid/GridService.js';
import type { SeededRNG } from '$games/snake/logic/math/SeededRNG.js';
import { GameplayConfig } from '../../config/GameplayConfig.js';
import { SystemBase } from '../../engine/ecs/SystemBase.js';

import type { FoodWanderSystem } from './FoodWanderSystem.js';

export class SpawnSystem extends SystemBase {
	public readonly name = 'SpawnSystem';
	private readonly service: GridService;
	private readonly rng: SeededRNG;
	private readonly targetFoodCount: number;
	private foodWander: FoodWanderSystem | null = null;
	private suppressed = false;

	constructor(world: World, service: GridService, rng: SeededRNG, targetFoodCount: number) {
		super(world);
		this.service = service;
		this.rng = rng;
		this.targetFoodCount = targetFoodCount;
	}

	public setFoodWander(foodWander: FoodWanderSystem): void {
		this.foodWander = foodWander;
	}

	public suppress(): void {
		this.suppressed = true;
	}

	public unsuppress(): void {
		this.suppressed = false;
	}

	public update(_deltaMS: number): void {
		this.refillFood();
	}

	public refillFood(): void {
		if (this.suppressed) return;
		let guard = 0;
		while (this.service.spawner.countFood() < this.targetFoodCount) {
			const placed = this.placeOneFood();
			if (!placed) return;
			guard = guard + 1;
			if (guard > GameplayConfig.REFILL_GUARD) return;
		}
	}

	private placeOneFood(): boolean {
		const cell = this.service.spawner.findFreeCell(this.rng);
		if (cell === null) return false;
		const bit = this.chooseBit();
		this.service.writer.setFood(cell.col, cell.row, bit);
		const entityId = this.world.createEntity();
		this.world.addComponent(entityId, 'gridPosition', { col: cell.col, row: cell.row });
		this.world.addComponent(entityId, 'food', { bit });
		if (this.foodWander !== null) {
			this.foodWander.ensureWander(entityId);
		}
		return true;
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
		if (targetHasZero && !targetHasOne) return 0;
		if (targetHasOne && !targetHasZero) return 1;
		const zeroCount = this.service.spawner.countFoodBit(0);
		const oneCount = this.service.spawner.countFoodBit(1);
		if (targetHasZero && zeroCount === 0) return 0;
		if (targetHasOne && oneCount === 0) return 1;
		return this.rng.nextInt(2) === 0 ? 0 : 1;
	}
}