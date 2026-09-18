import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridHolder } from '../logic/GridHolder.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import { findHead, getSnakeLength, getTail } from '../logic/SnakeFactory.js';
import { DIR_VECTORS } from '../logic/Directions.js';
import type { Direction } from '../components/index.js';
import { GameplayConfig, getLevelTuning } from '../config/index.js';

export class MovementSystem extends SystemBase {
	public readonly name = 'MovementSystem';
	private readonly holder: GridHolder;
	private readonly snakeId: EntityId;
	private stepIntervalMS: number;
	private accumulator = 0;
	private pendingGrowth = 0;
	private pendingShrink = 0;

	constructor(world: World, holder: GridHolder, snakeId: EntityId, stepIntervalMS: number) {
		super(world);
		this.holder = holder;
		this.snakeId = snakeId;
		this.stepIntervalMS = stepIntervalMS;
		this.world.events.on('snake:grow', (payload) => {
			this.pendingGrowth = this.pendingGrowth + payload.amount;
		});
		this.world.events.on('snake:shrink', (payload) => {
			this.pendingShrink = this.pendingShrink + payload.amount;
		});
		this.world.events.on('level:expanded', (payload) => {
			this.stepIntervalMS = getLevelTuning(payload.level).stepIntervalMS;
			this.accumulator = 0;
		});
	}

	private get grid(): GridBitmask {
		return this.holder.grid;
	}

	public update(deltaMS: number): void {
		this.accumulator = this.accumulator + deltaMS;
		while (this.accumulator >= this.stepIntervalMS) {
			this.step();
			this.accumulator = this.accumulator - this.stepIntervalMS;
		}
	}

	public step(): void {
		const headId = findHead(this.world, this.snakeId);
		const head = this.world.getComponent(headId, 'snakeHead');
		const headPos = this.world.getComponent(headId, 'gridPosition');
		if (head === undefined || headPos === undefined) {
			return;
		}

		const vec = DIR_VECTORS[head.dir];
		const newCol = headPos.col + vec.dx;
		const newRow = headPos.row + vec.dy;

		if (this.grid.isWall(newCol, newRow)) {
			this.world.events.emit('collision:wall', { entity: headId });
			return;
		}

		if (this.grid.isExit(newCol, newRow)) {
			this.world.events.emit('collision:exit', { entity: headId });
			return;
		}

		// Рост теперь приходит только от собранных последовательностей.
		const grows = this.pendingGrowth > 0;

		const eats = this.grid.isFood(newCol, newRow);
		let eatenBit: 0 | 1 = 0;
		if (eats) {
			eatenBit = this.grid.getFoodBit(newCol, newRow);
		}

		if (this.grid.isOccupied(newCol, newRow)) {
			const tailId = getTail(this.world, this.snakeId);
			const tailPos = this.world.getComponent(tailId, 'gridPosition');
			const isTailCell = tailPos !== undefined && tailPos.col === newCol && tailPos.row === newRow;
			// Клетка хвоста проходима, только если в этот шаг змейка не растёт.
			if (grows || !isTailCell) {
				this.world.events.emit('collision:self', { entity: headId });
				return;
			}
		}

		if (eats) {
			this.grid.clearFood(newCol, newRow);
			this.world.events.emit('collision:food', {
				entity: headId,
				bit: eatenBit
			});
		}

		this.advance(newCol, newRow, grows, head.dir);
	}

	private advance(newCol: number, newRow: number, grows: boolean, dir: Direction): void {
		const oldHeadId = findHead(this.world, this.snakeId);
		const oldHeadSegment = this.world.getComponent(oldHeadId, 'snakeSegment');
		if (oldHeadSegment === undefined) {
			return;
		}

		if (grows) {
			this.pendingGrowth = this.pendingGrowth - 1;
		}

		const tailId = getTail(this.world, this.snakeId);
		const tailPos = this.world.getComponent(tailId, 'gridPosition');

		const newHeadId = this.world.createEntity();
		this.world.addComponent(newHeadId, 'gridPosition', {
			col: newCol,
			row: newRow
		});
		this.world.addComponent(newHeadId, 'snakeSegment', {
			snakeId: this.snakeId,
			order: 0,
			bit: 0
		});
		this.world.addComponent(newHeadId, 'snakeHead', {
			dir,
			bufferedDir: null
		});
		this.world.removeComponent(oldHeadId, 'snakeHead');

		const segments = this.world.query(['snakeSegment']).entities;
		for (const entity of segments) {
			if (entity === newHeadId) {
				continue;
			}
			const segment = this.world.getComponent(entity, 'snakeSegment');
			if (segment === undefined) {
				continue;
			}
			if (segment.snakeId !== this.snakeId) {
				continue;
			}
			segment.order = segment.order + 1;
		}

		if (!grows) {
			if (tailPos !== undefined) {
				this.grid.clearOccupied(tailPos.col, tailPos.row);
			}
			this.world.destroyEntity(tailId);
		}

		this.grid.setOccupied(newCol, newRow);
		this.applyPendingShrink();
	}

	// Усадка за провал последовательности: снимаем хвосты, не уходя ниже минимальной длины.
	private applyPendingShrink(): void {
		while (this.pendingShrink > 0) {
			if (getSnakeLength(this.world, this.snakeId) <= GameplayConfig.MIN_SNAKE_LENGTH) {
				this.pendingShrink = 0;
				return;
			}
			const tailId = getTail(this.world, this.snakeId);
			const tailPos = this.world.getComponent(tailId, 'gridPosition');
			if (tailPos !== undefined) {
				this.grid.clearOccupied(tailPos.col, tailPos.row);
			}
			this.world.destroyEntity(tailId);
			this.pendingShrink = this.pendingShrink - 1;
		}
	}
}