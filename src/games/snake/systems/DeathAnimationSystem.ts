import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { Director } from '../core/Director.js';
import type { MovementSystem } from './MovementSystem.js';
import type { InputSystem } from './InputSystem.js';
import type { FxCoordinator } from '../view/fx/FxCoordinator.js';
import { findHead, getSnakeLength } from '../logic/SnakeFactory.js';
import { GameplayConfig } from '../config/index.js';

export interface DeathAnimationDeps {
	director: Director;
	fx: FxCoordinator;
	movement: MovementSystem;
	input: InputSystem;
}

export class DeathAnimationSystem extends SystemBase {
	public readonly name = 'DeathAnimationSystem';

	private readonly snakeId: EntityId;
	private deps: DeathAnimationDeps | null = null;

	private active = false;
	private elapsedMS = 0;
	private durationMS = 0;
	private lastHiddenCount = 0;

	constructor(world: World, snakeId: EntityId) {
		super(world);
		this.snakeId = snakeId;
	}

	public setDependencies(deps: DeathAnimationDeps): void {
		this.deps = deps;
	}

	public isActive(): boolean {
		return this.active;
	}

	public start(): void {
		if (this.active) {
			return;
		}

		if (this.deps === null) {
			throw new Error('DeathAnimationSystem: dependencies not set.');
		}

		const length = getSnakeLength(this.world, this.snakeId);
		const rawDurationMS = length * GameplayConfig.DEATH_MS_PER_SEGMENT;

		this.durationMS = Math.max(
			GameplayConfig.DEATH_MIN_MS,
			Math.min(GameplayConfig.DEATH_MAX_MS, rawDurationMS)
		);

		this.elapsedMS = 0;
		this.lastHiddenCount = 0;
		this.active = true;

		this.deps.movement.suppress();
		this.deps.input.suppress();
		this.deps.fx.onDeathStart();

		const headId = findHead(this.world, this.snakeId);
		const animation = {
			active: true,
			elapsedMS: 0,
			durationMS: this.durationMS,
			progress: 0
		};

		if (this.world.hasComponent(headId, 'deathAnimation')) {
			const existing = this.world.getComponent(headId, 'deathAnimation');

			if (existing === undefined) {
				throw new Error('DeathAnimationSystem: deathAnimation component expected.');
			}

			existing.active = true;
			existing.elapsedMS = 0;
			existing.durationMS = this.durationMS;
			existing.progress = 0;
			return;
		}

		this.world.addComponent(headId, 'deathAnimation', animation);
	}

	public update(deltaMS: number): void {
		if (!this.active) {
			return;
		}

		if (this.deps === null) {
			throw new Error('DeathAnimationSystem: dependencies not set.');
		}

		this.elapsedMS = this.elapsedMS + deltaMS;

		const progress = Math.min(1, this.elapsedMS / this.durationMS);
		const headId = findHead(this.world, this.snakeId);
		const animation = this.world.getComponent(headId, 'deathAnimation');

		if (animation === undefined) {
			throw new Error('DeathAnimationSystem: deathAnimation component not found.');
		}

		animation.active = true;
		animation.elapsedMS = this.elapsedMS;
		animation.durationMS = this.durationMS;
		animation.progress = progress;

		const length = getSnakeLength(this.world, this.snakeId);
		const hiddenCount = Math.floor(progress * length);

		if (hiddenCount > this.lastHiddenCount) {
			for (let hidden = this.lastHiddenCount; hidden < hiddenCount; hidden = hidden + 1) {
				const order = length - 1 - hidden;
				const cell = this.findSegmentCell(order);

				if (cell !== null) {
					this.deps.fx.onDeathSegment(cell.col, cell.row);
				}
			}

			this.lastHiddenCount = hiddenCount;
		}

		if (progress >= 1) {
			this.active = false;
			animation.active = false;
			animation.progress = 1;
			this.deps.director.onDeath();
		}
	}

	private findSegmentCell(order: number): { col: number; row: number } | null {
		const entities = this.world.query(['snakeSegment', 'gridPosition']).entities;

		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			const position = this.world.getComponent(entity, 'gridPosition');

			if (segment === undefined || position === undefined) {
				continue;
			}

			if (segment.snakeId !== this.snakeId) {
				continue;
			}

			if (segment.order !== order) {
				continue;
			}

			return {
				col: position.col,
				row: position.row
			};
		}

		return null;
	}
}