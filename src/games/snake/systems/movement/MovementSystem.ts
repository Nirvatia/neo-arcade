import { SystemBase } from '../../engine/ecs/SystemBase.js';
import { findHead, getSnakeLength, getTail } from '../../logic/snake/SnakeFactory.js';
import { DIR_VECTORS, OPPOSITE } from '../../logic/snake/Directions.js';
import { GameplayConfig, GridConfig, getLevelTuning } from '../../config/index.js';
import type { BitRegisterSystem } from '../puzzle/BitRegisterSystem.js';
import type { LevelSystem } from '../progression/LevelSystem.js';
import type { FxCoordinator } from '$games/snake/render/fx/FxCoordinator.js';
import type { DeathAnimationSystem } from '../death/DeathAnimationSystem.js';
import type { GridService } from '$games/snake/logic/grid/GridService.js';
import type { EntityId } from '$games/snake/engine/ecs/types.js';
import type { Direction, SnakeMotion } from '$games/snake/components/index.js';
import type { World } from '$games/snake/engine/ecs/World.js';
import type { GridBitmask } from '$games/snake/logic/grid/GridBitmask.js';

export interface MovementDeps {
	bitRegister: BitRegisterSystem;
	level: LevelSystem;
	fx: FxCoordinator;
	death: DeathAnimationSystem;
}

export class MovementSystem extends SystemBase {
	public readonly name = 'MovementSystem';

	private readonly service: GridService;
	private readonly snakeId: EntityId;
	private readonly motionEntity: EntityId;
	private readonly motion: SnakeMotion;

	private stepIntervalMS: number;
	private accumulator = 0;
	private pendingGrowth = 0;
	private pendingShrink = 0;
	private suppressed = false;
	private waitingForFirstInput = true;
	private deps: MovementDeps | null = null;

	private frozen = false;

	constructor(world: World, service: GridService, snakeId: EntityId, stepIntervalMS: number) {
		super(world);

		this.service = service;
		this.snakeId = snakeId;
		this.stepIntervalMS = stepIntervalMS;

		this.motion = this.createInitialMotion();
		this.motionEntity = this.world.createEntity();
		this.world.addComponent(this.motionEntity, 'snakeMotion', this.motion);
	}

	public setDependencies(deps: MovementDeps): void {
		this.deps = deps;
	}

	public grow(amount: number): void {
		this.pendingGrowth = this.pendingGrowth + amount;
	}

	public shrink(amount: number): void {
		this.pendingShrink = this.pendingShrink + amount;
	}

	public suppress(): void {
		this.suppressed = true;
	}

	public setFrozen(frozen: boolean): void {
		this.frozen = frozen;
		if (frozen) {
			this.accumulator = 0;
		}
	}

	public notifyInput(): void {
		this.waitingForFirstInput = false;
		this.accumulator = 0;
	}

	public onLevelExpanded(level: number): void {
		this.stepIntervalMS = getLevelTuning(level).stepIntervalMS;
		this.accumulator = 0;
		this.rebuildMotion();
	}

	private get grid(): GridBitmask {
		return this.service.grid;
	}

	public update(deltaMS: number): void {
		if (this.frozen) {
			return;
		}

		if (this.suppressed || this.waitingForFirstInput) {
			return;
		}

		this.accumulator = this.accumulator + deltaMS;

		while (this.accumulator >= this.stepIntervalMS) {
			const ok = this.step();

			if (!ok) {
				this.accumulator = 0;
				return;
			}

			this.accumulator = this.accumulator - this.stepIntervalMS;
		}

		const alpha = this.accumulator / this.stepIntervalMS;
		const motion = this.motion;

		if (motion.hasSegment) {
			motion.headU = motion.segmentStartU + alpha;
		} else {
			motion.headU = motion.segmentStartU;
		}

		motion.visualLengthCells = moveTowards(
			motion.visualLengthCells,
			motion.targetLengthCells,
			deltaMS / 120
		);

		this.trimMotion();
	}

	private step(): boolean {
		if (this.deps === null) {
			throw new Error('MovementSystem: dependencies not set.');
		}

		const headId = findHead(this.world, this.snakeId);
		const head = this.world.getComponent(headId, 'snakeHead');
		const headPos = this.world.getComponent(headId, 'gridPosition');

		if (head === undefined || headPos === undefined) {
			return false;
		}

		if (head.queue.length > 0) {
			const next = head.queue.shift();

			if (next !== undefined && next !== OPPOSITE[head.dir]) {
				head.dir = next;
			}
		}

		const vec = DIR_VECTORS[head.dir];

		const rawCol = headPos.col + vec.dx;
		const rawRow = headPos.row + vec.dy;

		// Режим без рамок: заворачиваем координаты на противоположную сторону.
		const nextCell = this.grid.wrap
			? this.grid.wrapPosition(rawCol, rawRow)
			: { col: rawCol, row: rawRow };

		const newCol = nextCell.col;
		const newRow = nextCell.row;

		if (this.grid.isWall(newCol, newRow)) {
			this.deps.death.start();
			return false;
		}

		if (this.grid.isExit(newCol, newRow)) {
			this.deps.level.onExitReached();
			return false;
		}

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

			if (grows || !isTailCell) {
				this.deps.death.start();
				return false;
			}
		}

		if (eats) {
			this.grid.clearFood(newCol, newRow);

			const foodEntities = this.world.query(['food', 'gridPosition']).entities;

			for (const entityId of foodEntities) {
				const pos = this.world.getComponent(entityId, 'gridPosition');

				if (pos !== undefined && pos.col === newCol && pos.row === newRow) {
					this.world.destroyEntity(entityId);
					break;
				}
			}

			this.deps.bitRegister.onFoodEaten(eatenBit);
			this.deps.fx.onFoodEaten();
		}

		this.advance(newCol, newRow, grows, head.dir);
		this.appendHeadToMotion(newCol, newRow);

		this.motion.targetLengthCells = Math.max(0, getSnakeLength(this.world, this.snakeId) - 1);

		return true;
	}

	private advance(newCol: number, newRow: number, grows: boolean, dir: Direction): void {
		const oldHeadId = findHead(this.world, this.snakeId);
		const oldHeadSegment = this.world.getComponent(oldHeadId, 'snakeSegment');

		if (oldHeadSegment === undefined) {
			return;
		}

		if (grows) {
			this.pendingGrowth = this.pendingGrowth - 1;

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
				queue: []
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

			this.grid.setOccupied(newCol, newRow);
		} else {
			const tailId = getTail(this.world, this.snakeId);
			const tailPos = this.world.getComponent(tailId, 'gridPosition');

			if (tailPos !== undefined) {
				this.grid.clearOccupied(tailPos.col, tailPos.row);

				tailPos.col = newCol;
				tailPos.row = newRow;
			}

			this.grid.setOccupied(newCol, newRow);

			this.world.removeComponent(oldHeadId, 'snakeHead');

			this.world.addComponent(tailId, 'snakeHead', {
				dir,
				queue: []
			});

			const segments = this.world.query(['snakeSegment']).entities;

			for (const entity of segments) {
				const segment = this.world.getComponent(entity, 'snakeSegment');

				if (segment === undefined) {
					continue;
				}

				if (segment.snakeId !== this.snakeId) {
					continue;
				}

				if (entity === tailId) {
					segment.order = 0;
				} else {
					segment.order = segment.order + 1;
				}
			}
		}

		this.applyPendingShrink();
	}

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

	private appendHeadToMotion(col: number, row: number): void {
		const motion = this.motion;

		const oldTargetU = motion.hasSegment ? motion.segmentStartU + 1 : motion.segmentStartU;

		const cell = GridConfig.CELL_SIZE;

		motion.points.push({
			x: col * cell + cell / 2,
			y: row * cell + cell / 2
		});

		motion.segmentStartU = oldTargetU;
		motion.hasSegment = true;
	}

	private createInitialMotion(): SnakeMotion {
		const cell = GridConfig.CELL_SIZE;

		const segments = this.world.query(['snakeSegment', 'gridPosition']).entities;

		const cells: { col: number; row: number; order: number }[] = [];

		for (const entity of segments) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			const position = this.world.getComponent(entity, 'gridPosition');

			if (segment === undefined || position === undefined) {
				continue;
			}

			if (segment.snakeId !== this.snakeId) {
				continue;
			}

			cells.push({
				col: position.col,
				row: position.row,
				order: segment.order
			});
		}

		cells.sort((a, b) => b.order - a.order);

		const points = cells.map((cellItem) => ({
			x: cellItem.col * cell + cell / 2,
			y: cellItem.row * cell + cell / 2
		}));

		const headId = findHead(this.world, this.snakeId);
		const head = this.world.getComponent(headId, 'snakeHead');

		if (head !== undefined && points.length > 0) {
			const back = OPPOSITE[head.dir];
			const vec = DIR_VECTORS[back];
			const tail = points[0]!;

			points.unshift({
				x: tail.x + vec.dx * cell,
				y: tail.y + vec.dy * cell
			});
		}

		const length = Math.max(0, cells.length - 1);

		return {
			points,
			baseU: 0,
			segmentStartU: points.length - 1,
			hasSegment: false,
			headU: points.length - 1,
			targetLengthCells: length,
			visualLengthCells: length,
			version: 0
		};
	}

	private rebuildMotion(): void {
		const fresh = this.createInitialMotion();
		const motion = this.motion;

		motion.points = fresh.points;
		motion.baseU = fresh.baseU;
		motion.segmentStartU = fresh.segmentStartU;
		motion.hasSegment = fresh.hasSegment;
		motion.headU = fresh.headU;
		motion.targetLengthCells = fresh.targetLengthCells;
		motion.visualLengthCells = fresh.targetLengthCells;
		motion.version = motion.version + 1;
	}

	private trimMotion(): void {
		const motion = this.motion;

		const minU = motion.headU - motion.visualLengthCells - 4;

		while (motion.points.length > 2 && motion.baseU < minU) {
			motion.points.shift();
			motion.baseU = motion.baseU + 1;
		}
	}

	public setStepInterval(ms: number): void {
		this.stepIntervalMS = Math.max(1, ms);
		this.accumulator = 0;
	}
}

function moveTowards(current: number, target: number, maxDelta: number): number {
	if (current < target) {
		return Math.min(current + maxDelta, target);
	}

	return Math.max(current - maxDelta, target);
}
