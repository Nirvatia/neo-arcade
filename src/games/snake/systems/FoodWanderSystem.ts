import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridHolder } from '../logic/GridHolder.js';
import type { SeededRNG } from '../logic/SeededRNG.js';
import { DIR_VECTORS } from '../logic/Directions.js';
import type { Direction, Food, FoodWander, GridPosition } from '../components/index.js';
import { findHead } from '../logic/SnakeFactory.js';

/** Интервал между решениями «куда пойти» (мс). */
const STEP_INTERVAL_MS = 900;
/** Длительность анимации перехода в соседнюю клетку (мс). */
const MOVE_DURATION_MS = 450;
/** Радиус, в котором еда начинает паниковать и убегать. */
const STARTLE_RADIUS = 3;
/** Кулдаун после побега, чтобы еда не дёргалась каждый кадр. */
const FLEE_COOLDOWN_MS = 1500;

const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

export class FoodWanderSystem extends SystemBase {
	public readonly name = 'FoodWanderSystem';

	private readonly holder: GridHolder;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;

	constructor(world: World, holder: GridHolder, rng: SeededRNG, snakeId: EntityId) {
		super(world);
		this.holder = holder;
		this.rng = rng;
		this.snakeId = snakeId;

		this.world.events.on('food:spawned', this.onFoodSpawned);
		// Привязать компонент блуждания к еде, которая уже есть на поле (например, при рестарте).
		this.attachExisting();
	}

	private attachExisting(): void {
		const foods = this.world.query(['food', 'gridPosition']).entities;
		for (const id of foods) {
			this.ensureWander(id);
		}
	}

	private onFoodSpawned = (payload: { entity: EntityId }): void => {
		this.ensureWander(payload.entity);
	};

	private ensureWander(entity: EntityId): void {
		if (this.world.hasComponent(entity, 'foodWander')) {
			return;
		}
		const pos = this.world.getComponent(entity, 'gridPosition');
		if (pos === undefined) {
			return;
		}
		this.world.addComponent(entity, 'foodWander', {
			offsetX: 0,
			offsetY: 0,
			targetCol: pos.col,
			targetRow: pos.row,
			progress: 1,
			timerMS: STEP_INTERVAL_MS * (0.5 + this.rng.next()),
			phase: this.rng.next() * Math.PI * 2,
			startleCdMS: 0
		});
	}

	public update(deltaMS: number): void {
		const foods = this.world.query(['food', 'gridPosition', 'foodWander']).entities;
		if (foods.length === 0) {
			return;
		}

		// Позиция головы для расчёта страха.
		let headCol = -1;
		let headRow = -1;
		try {
			const headId = findHead(this.world, this.snakeId);
			const hp = this.world.getComponent(headId, 'gridPosition');
			if (hp !== undefined) {
				headCol = hp.col;
				headRow = hp.row;
			}
		} catch {
			// Головы может не быть в служебных состояниях.
		}

		for (const entityId of foods) {
			const pos = this.world.getComponent(entityId, 'gridPosition');
			const wander = this.world.getComponent(entityId, 'foodWander');
			const food = this.world.getComponent(entityId, 'food');
			if (pos === undefined || wander === undefined || food === undefined) {
				continue;
			}

			// Фаза анимации покачивания (используется в FoodView).
			wander.phase += deltaMS * 0.003;
			wander.startleCdMS = Math.max(0, wander.startleCdMS - deltaMS);

			// ===== 1. Еда в процессе движения =====
			if (wander.progress < 1) {
				const prevProgress = wander.progress;
				wander.progress = Math.min(1, prevProgress + deltaMS / MOVE_DURATION_MS);

				// Интерполяция визуального смещения к нулю.
				// Так как логическая позиция уже целевая, смещение затухает.
				const prevT = this.easeInOut(prevProgress);
				const t = this.easeInOut(wander.progress);
				const denom = 1 - prevT;
				if (denom > 0.0001) {
					const startX = wander.offsetX / denom;
					const startY = wander.offsetY / denom;
					wander.offsetX = startX * (1 - t);
					wander.offsetY = startY * (1 - t);
				} else {
					wander.offsetX = 0;
					wander.offsetY = 0;
				}

				if (wander.progress >= 1) {
					wander.offsetX = 0;
					wander.offsetY = 0;
				}
				continue;
			}

			// ===== 2. Ожидание следующего решения =====
			wander.timerMS -= deltaMS;
			if (wander.timerMS > 0) {
				continue;
			}

			// Сбрасываем таймер до следующего решения.
			wander.timerMS = STEP_INTERVAL_MS * (0.6 + this.rng.next() * 0.8);

			// ===== 3. Принятие решения =====
			const step = this.chooseDirection(pos.col, pos.row, headCol, headRow);
			if (step !== null) {
				this.beginMove(pos, wander, food, step.dx, step.dy);
			} else {
				// Если идти некуда (окружена), пробуем снова быстрее, чтобы не «залипать» надолго.
				wander.timerMS = 200;
			}
		}
	}

	/**
	 * Выбирает направление движения.
	 * Логика:
	 * 1. Если змейка близко и есть путь к отступлению — бежим (максимизируем дистанцию).
	 * 2. Если бежать некуда или змейка далеко — блуждаем.
	 * 3. Блуждание предпочитает не приближаться к голове, но не запрещает это,
	 *    чтобы еда не застревала в углах.
	 */
	private chooseDirection(
		col: number,
		row: number,
		headCol: number,
		headRow: number
	): { dx: number; dy: number } | null {
		const freeMoves: { dx: number; dy: number; dist: number }[] = [];
		const currentDist =
			headCol >= 0 ? Math.abs(col - headCol) + Math.abs(row - headRow) : 999;

		// Собираем все доступные ходы.
		for (const dir of DIRS) {
			const v = DIR_VECTORS[dir];
			const nc = col + v.dx;
			const nr = row + v.dy;
			if (this.isFree(nc, nr)) {
				const dist =
					headCol >= 0 ? Math.abs(nc - headCol) + Math.abs(nr - headRow) : 999;
				freeMoves.push({ dx: v.dx, dy: v.dy, dist });
			}
		}

		if (freeMoves.length === 0) {
			return null;
		}

		// --- ЛОГИКА ПОБЕГА (FLEE) ---
		if (headCol >= 0 && currentDist <= STARTLE_RADIUS) {
			// Сортируем по убыванию дистанции: сначала самые безопасные.
			freeMoves.sort((a, b) => b.dist - a.dist);
			const best = freeMoves[0];

			// Если лучший ход увеличивает дистанцию — бежим туда.
			if (best !== undefined && best.dist > currentDist) {
				return best;
			}
			// Если увеличить дистанцию нельзя (тупик), не возвращаем ничего специально,
			// падаем в логику блуждания, чтобы попробовать выскользнуть.
		}

		// --- ЛОГИКА БЛУЖДАНИЯ (WANDER) ---
		// Предпочитаем ходы, которые не уменьшают дистанцию до головы.
		const safeMoves = freeMoves.filter((m) => m.dist >= currentDist);
		const pool = safeMoves.length > 0 ? safeMoves : freeMoves;

		if (pool.length === 0) {
			return null;
		}

		return pool[this.rng.nextInt(pool.length)] ?? null;
	}

	/**
	 * Начинает переход еды в соседнюю клетку.
	 * Логически еда сразу оказывается в целевой клетке (сетка обновляется),
	 * визуально — анимируется смещение.
	 */
	private beginMove(
		pos: GridPosition,
		wander: FoodWander,
		food: Food,
		dx: number,
		dy: number
	): void {
		const targetCol = pos.col + dx;
		const targetRow = pos.row + dy;
		const grid = this.holder.grid;

		// Страховка: проверка валидности хода прямо перед началом движения.
		if (
			!grid.withinBounds(targetCol, targetRow) ||
			grid.isWall(targetCol, targetRow) ||
			grid.isOccupied(targetCol, targetRow) ||
			grid.isFood(targetCol, targetRow) ||
			grid.isExit(targetCol, targetRow)
		) {
			wander.progress = 1;
			wander.offsetX = 0;
			wander.offsetY = 0;
			wander.targetCol = pos.col;
			wander.targetRow = pos.row;
			return;
		}

		const startCol = pos.col;
		const startRow = pos.row;

		// Обновляем сетку.
		grid.clearFood(startCol, startRow);
		grid.setFood(targetCol, targetRow, food.bit);

		// Обновляем логическую позицию сущности.
		pos.col = targetCol;
		pos.row = targetRow;

		// Настраиваем визуальную анимацию.
		wander.targetCol = targetCol;
		wander.targetRow = targetRow;
		// Смещение от старой клетки к новой.
		// Так как pos уже равен целевой клетке, стартовая визуальная позиция:
		// target + (start - target).
		wander.offsetX = startCol - targetCol;
		wander.offsetY = startRow - targetRow;
		wander.progress = 0;
	}

	private easeInOut(t: number): number {
		return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
	}

	private isFree(col: number, row: number): boolean {
		const grid = this.holder.grid;
		if (!grid.withinBounds(col, row)) {
			return false;
		}
		if (grid.isWall(col, row)) {
			return false;
		}
		if (grid.isOccupied(col, row)) {
			return false;
		}
		if (grid.isFood(col, row)) {
			return false;
		}
		if (grid.isExit(col, row)) {
			return false;
		}
		return true;
	}
}