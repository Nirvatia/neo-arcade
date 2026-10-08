import { SystemBase } from '../../engine/ecs/SystemBase.js';
import type { FoodWander, GridPosition } from '../../components/index.js';
import { findHead } from '../../logic/snake/SnakeFactory.js';
import { GameplayConfig, GridConfig } from '../../config/index.js';
import type { GridService } from '$games/snake/logic/grid/GridService.js';
import type { SeededRNG } from '$games/snake/logic/math/SeededRNG.js';
import type { EntityId } from '$games/snake/engine/ecs/types.js';
import type { World } from '$games/snake/engine/ecs/World.js';
import { FoodBehavior } from './FoodBehavior.js';
import { FoodSteering } from './FoodPhysics.js';

const CELL = GridConfig.CELL_SIZE;

/**
 * FoodWanderSystem — оркестратор органики еды.
 * Обновляет компоненты и делегирует логику в модули поведения и физики.
 */
export class FoodWanderSystem extends SystemBase {
	public readonly name = 'FoodWanderSystem';
	private readonly service: GridService;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;
	private readonly behavior: FoodBehavior;
	private readonly steering: FoodSteering;

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
		this.behavior = new FoodBehavior(rng, service.collision);
		this.steering = new FoodSteering(service);
		this.attachExisting();
	}

	private attachExisting(): void {
		const foods = this.world.query(['food', 'gridPosition']).entities;
		for (const entityId of foods) {
			this.ensureWander(entityId);
		}
	}

	public ensureWander(entity: EntityId): void {
		if (this.world.hasComponent(entity, 'foodWander')) {
			return;
		}
		
		const pos = this.world.getComponent(entity, 'gridPosition');
		if (pos === undefined) {
			return;
		}
		
		const x = pos.col * CELL + CELL / 2;
		const y = pos.row * CELL + CELL / 2;
		
		this.world.addComponent(entity, 'foodWander', {
			x,
			y,
			vx: 0,
			vy: 0,
			targetX: x,
			targetY: y,
			mode: 0 as const,
			timerMS: this.randomRange(
				GameplayConfig.FOOD_RETARGET_MIN_MS,
				GameplayConfig.FOOD_RETARGET_MAX_MS
			),
			phase: this.rng.next() * Math.PI * 2,
			startleCdMS: 0
		});
	}

	public update(deltaMS: number): void {
		const dt = Math.min(0.05, deltaMS / 1000);
		let headCol = -1;
		let headRow = -1;
		
		try {
			const headId = findHead(this.world, this.snakeId);
			const headPos = this.world.getComponent(headId, 'gridPosition');
			if (headPos !== undefined) {
				headCol = headPos.col;
				headRow = headPos.row;
			}
		} catch {
			// Головы может не быть в служебных состояниях.
		}
		
		const entities = this.world.query(['food', 'gridPosition']).entities;
		for (const entityId of entities) {
			if (!this.world.hasComponent(entityId, 'foodWander')) {
				this.ensureWander(entityId);
			}
			
			const pos = this.world.getComponent(entityId, 'gridPosition');
			const food = this.world.getComponent(entityId, 'food');
			const wander = this.world.getComponent(entityId, 'foodWander');
			
			if (pos === undefined || food === undefined || wander === undefined) {
				continue;
			}
			
			if (
				!Number.isFinite(wander.x) ||
				!Number.isFinite(wander.y) ||
				!Number.isFinite(wander.vx) ||
				!Number.isFinite(wander.vy)
			) {
				this.resetWanderPosition(pos, wander);
			}
			
			wander.phase = wander.phase + dt * (2.1 + (entityId % 7) * 0.17);
			
			this.behavior.update(wander, pos, headCol, headRow, deltaMS);
			this.steering.update(wander, pos, food, dt, deltaMS);
		}
	}

	private resetWanderPosition(pos: GridPosition, wander: FoodWander): void {
		wander.x = pos.col * CELL + CELL / 2;
		wander.y = pos.row * CELL + CELL / 2;
		wander.vx = 0;
		wander.vy = 0;
		wander.targetX = wander.x;
		wander.targetY = wander.y;
		wander.mode = 0;
		wander.timerMS = 200;
	}

	private randomRange(min: number, max: number): number {
		return min + this.rng.next() * (max - min);
	}
}