import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridService } from '../logic/grid/GridService.js';
import type { SeededRNG } from '../logic/SeededRNG.js';
import { DIR_VECTORS } from '../logic/Directions.js';
import type {
	Direction,
	Food,
	FoodWander,
	GridPosition
} from '../components/index.js';
import { findHead } from '../logic/SnakeFactory.js';
import { GameplayConfig, GridConfig } from '../config/index.js';

const CELL = GridConfig.CELL_SIZE;
const MARGIN = 3;

const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

/**
 * Новая физика еды:
 * - непрерывное движение по пиксельным координатам;
 * - логическая клетка меняется только при реальном переходе;
 * - еда не телепортируется;
 * - побег короче, мягче и медленнее.
 */
export class FoodWanderSystem extends SystemBase {
	public readonly name = 'FoodWanderSystem';

	private readonly service: GridService;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;

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
		const grid = this.service.grid;

		let headCol = -1;
		let headRow = -1;
		let headX = 0;
		let headY = 0;

		try {
			const headId = findHead(this.world, this.snakeId);
			const headPos = this.world.getComponent(headId, 'gridPosition');

			if (headPos !== undefined) {
				headCol = headPos.col;
				headRow = headPos.row;
				headX = headCol * CELL + CELL / 2;
				headY = headRow * CELL + CELL / 2;
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
			wander.startleCdMS = Math.max(0, wander.startleCdMS - deltaMS);
			wander.timerMS = wander.timerMS - deltaMS;

			const distanceToHead =
				headCol >= 0
					? Math.hypot(
							(wander.x - headX) / CELL,
							(wander.y - headY) / CELL
						)
					: 999;

			// ===== Побег =====
			if (
				headCol >= 0 &&
				wander.mode === 0 &&
				wander.startleCdMS <= 0 &&
				distanceToHead < GameplayConfig.FOOD_FLEE_RADIUS
			) {
				wander.mode = 1;
				wander.startleCdMS = GameplayConfig.FOOD_FLEE_COOLDOWN_MS;
				this.chooseFleeTarget(wander, pos.col, pos.row, headCol, headRow);
				wander.timerMS = 820;
			}

			// Завершение побега.
			if (
				wander.mode === 1 &&
				(wander.timerMS <= 0 || this.reachedTarget(wander))
			) {
				wander.mode = 0;
				wander.timerMS = Math.min(Math.max(wander.timerMS, 0), 320);
			}

			// Выбор новой цели для мирного блуждания.
			if (wander.mode === 0 && wander.timerMS <= 0) {
				this.chooseWanderTarget(wander, pos.col, pos.row);
				wander.timerMS = this.randomRange(
					GameplayConfig.FOOD_RETARGET_MIN_MS,
					GameplayConfig.FOOD_RETARGET_MAX_MS
				);
			}

			// ===== Рулёжка =====
			const maxSpeed =
				(
					wander.mode === 1
						? GameplayConfig.FOOD_FLEE_SPEED_CELLS_PER_S
						: GameplayConfig.FOOD_WANDER_SPEED_CELLS_PER_S
				) * CELL;

			let desiredVx = 0;
			let desiredVy = 0;

			const targetDx = wander.targetX - wander.x;
			const targetDy = wander.targetY - wander.y;
			const targetDist = Math.hypot(targetDx, targetDy);

			if (targetDist > 2) {
				desiredVx = (targetDx / targetDist) * maxSpeed;
				desiredVy = (targetDy / targetDist) * maxSpeed;
			}

			const blend = Math.min(1, GameplayConfig.FOOD_ACCEL_PER_S * dt);

			wander.vx = wander.vx + (desiredVx - wander.vx) * blend;
			wander.vy = wander.vy + (desiredVy - wander.vy) * blend;

			// Органическое покачивание.
			const speed = Math.hypot(wander.vx, wander.vy);

			if (speed > 2) {
				const perpX = -wander.vy / speed;
				const perpY = wander.vx / speed;

				const wiggle =
					Math.sin(wander.phase * (wander.mode === 1 ? 5.2 : 2.8)) *
					(wander.mode === 1 ? 10 : 24);

				wander.vx = wander.vx + perpX * wiggle * dt * 3;
				wander.vy = wander.vy + perpY * wiggle * dt * 3;
			}

			// Ограничение скорости.
			const currentSpeed = Math.hypot(wander.vx, wander.vy);

			if (currentSpeed > maxSpeed) {
				wander.vx = (wander.vx / currentSpeed) * maxSpeed;
				wander.vy = (wander.vy / currentSpeed) * maxSpeed;
			}

			// ===== Интеграция с коллизиями =====
			const nextX = wander.x + wander.vx * dt;
			const nextY = wander.y + wander.vy * dt;

			if (this.canEnterPixel(nextX, nextY, pos)) {
				wander.x = nextX;
				wander.y = nextY;
			} else if (this.canEnterPixel(nextX, wander.y, pos)) {
				wander.x = nextX;
				wander.vy = wander.vy * -0.15;
				wander.timerMS = Math.min(wander.timerMS, 140);
			} else if (this.canEnterPixel(wander.x, nextY, pos)) {
				wander.y = nextY;
				wander.vx = wander.vx * -0.15;
				wander.timerMS = Math.min(wander.timerMS, 140);
			} else {
				wander.vx = wander.vx * -0.35;
				wander.vy = wander.vy * -0.35;
				wander.timerMS = Math.min(wander.timerMS, 80);
			}

			// Жёсткая защита от вылета за внутреннюю область.
			wander.x = this.clamp(
				wander.x,
				CELL + MARGIN,
				(grid.cols - 1) * CELL - MARGIN
			);

			wander.y = this.clamp(
				wander.y,
				CELL + MARGIN,
				(grid.rows - 1) * CELL - MARGIN
			);

			// Если еда остановилась у цели, слегка гасим скорость.
			if (targetDist <= 2) {
				const drag = Math.exp(-4 * dt);
				wander.vx = wander.vx * drag;
				wander.vy = wander.vy * drag;
			}

			// Логическая клетка меняется только когда еда реально перешла в неё.
			this.syncCell(pos, food, wander);
		}
	}

	private syncCell(
		pos: GridPosition,
		food: Food,
		wander: FoodWander
	): void {
		const grid = this.service.grid;

		let col = Math.floor(wander.x / CELL);
		let row = Math.floor(wander.y / CELL);

		col = this.clamp(col, 1, grid.cols - 2);
		row = this.clamp(row, 1, grid.rows - 2);

		if (col === pos.col && row === pos.row) {
			return;
		}

		if (this.canEnterCell(col, row)) {
			this.service.writer.clearFood(pos.col, pos.row);
			this.service.writer.setFood(col, row, food.bit);

			pos.col = col;
			pos.row = row;

			return;
		}

		// Если новая клетка занята — не даём еде провалиться в неё.
		wander.x = this.clampToCell(wander.x, pos.col);
		wander.y = this.clampToCell(wander.y, pos.row);

		wander.vx = wander.vx * 0.2;
		wander.vy = wander.vy * 0.2;
	}

	private canEnterCell(col: number, row: number): boolean {
		const collision = this.service.collision;

		if (!collision.withinBounds(col, row)) {
			return false;
		}

		if (collision.isWall(col, row)) {
			return false;
		}

		if (collision.isOccupied(col, row)) {
			return false;
		}

		if (collision.isFood(col, row)) {
			return false;
		}

		if (collision.isExit(col, row)) {
			return false;
		}

		return true;
	}

	private canEnterPixel(
		x: number,
		y: number,
		currentPos: GridPosition
	): boolean {
		const col = Math.floor(x / CELL);
		const row = Math.floor(y / CELL);

		if (col === currentPos.col && row === currentPos.row) {
			return true;
		}

		return this.canEnterCell(col, row);
	}

	private chooseWanderTarget(
		wander: FoodWander,
		col: number,
		row: number
	): void {
		const candidates: { col: number; row: number }[] = [];

		for (const dir of DIRS) {
			const vec = DIR_VECTORS[dir];
			const nextCol = col + vec.dx;
			const nextRow = row + vec.dy;

			if (this.canEnterCell(nextCol, nextRow)) {
				candidates.push({ col: nextCol, row: nextRow });
			}
		}

		if (candidates.length > 0 && this.rng.next() < 0.62) {
			const candidate = candidates[this.rng.nextInt(candidates.length)];

			if (candidate !== undefined) {
				const point = this.randomPointInCell(candidate.col, candidate.row);
				wander.targetX = point.x;
				wander.targetY = point.y;
				return;
			}
		}

		const point = this.randomPointInCell(col, row);
		wander.targetX = point.x;
		wander.targetY = point.y;
	}

	private chooseFleeTarget(
		wander: FoodWander,
		col: number,
		row: number,
		headCol: number,
		headRow: number
	): void {
		const headX = (headCol + 0.5) * CELL;
		const headY = (headRow + 0.5) * CELL;

		let best: { col: number; row: number } | null = null;
		let bestScore = -Infinity;

		for (const dir of DIRS) {
			const vec = DIR_VECTORS[dir];

			const nextCol = col + vec.dx;
			const nextRow = row + vec.dy;

			if (!this.canEnterCell(nextCol, nextRow)) {
				continue;
			}

			const cellX = (nextCol + 0.5) * CELL;
			const cellY = (nextRow + 0.5) * CELL;

			const score =
				Math.hypot(cellX - headX, cellY - headY) +
				this.rng.next() * CELL * 0.35;

			if (score > bestScore) {
				bestScore = score;
				best = { col: nextCol, row: nextRow };
			}
		}

		if (best === null) {
			const point = this.pickFarPoint(col, row, headX, headY);
			wander.targetX = point.x;
			wander.targetY = point.y;
			return;
		}

		const point = this.pickFarPoint(best.col, best.row, headX, headY);
		wander.targetX = point.x;
		wander.targetY = point.y;
	}

	private pickFarPoint(
		col: number,
		row: number,
		headX: number,
		headY: number
	): { x: number; y: number } {
		let best: { x: number; y: number } | null = null;
		let bestScore = -Infinity;

		for (let i = 0; i < 4; i++) {
			const point = this.randomPointInCell(col, row);
			const score =
				Math.hypot(point.x - headX, point.y - headY) +
				this.rng.next() * 2;

			if (score > bestScore) {
				bestScore = score;
				best = point;
			}
		}

		return best ?? this.randomPointInCell(col, row);
	}

	private randomPointInCell(
		col: number,
		row: number
	): { x: number; y: number } {
		const margin = CELL * 0.24;

		return {
			x: col * CELL + margin + this.rng.next() * (CELL - margin * 2),
			y: row * CELL + margin + this.rng.next() * (CELL - margin * 2)
		};
	}

	private reachedTarget(wander: FoodWander): boolean {
		const dx = wander.targetX - wander.x;
		const dy = wander.targetY - wander.y;

		return Math.hypot(dx, dy) < 4;
	}

	private resetWanderPosition(
		pos: GridPosition,
		wander: FoodWander
	): void {
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

	private clamp(value: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, value));
	}

	private clampToCell(value: number, cell: number): number {
		const min = cell * CELL + MARGIN;
		const max = (cell + 1) * CELL - MARGIN;

		return this.clamp(value, min, max);
	}
}