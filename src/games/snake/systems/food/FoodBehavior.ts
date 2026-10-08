import type { FoodWander, GridPosition } from '../../components/index.js';
import type { Direction } from '../../components/index.js';
import { DIR_VECTORS } from '../../logic/snake/Directions.js';
import { GameplayConfig, GridConfig } from '../../config/index.js';
import type { GridCollision } from '$games/snake/logic/grid/GridCollision.js';
import type { SeededRNG } from '$games/snake/logic/math/SeededRNG.js';

const CELL = GridConfig.CELL_SIZE;
const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

/**
 * FoodBehavior — выбор целей и состояний еды.
 * Отвечает только за принятие решений: когда бежать, куда блуждать.
 * Не занимается физикой и интеграцией.
 */
export class FoodBehavior {
	private readonly rng: SeededRNG;
	private readonly collision: GridCollision;

	constructor(rng: SeededRNG, collision: GridCollision) {
		this.rng = rng;
		this.collision = collision;
	}

	public update(
		wander: FoodWander,
		pos: GridPosition,
		headCol: number,
		headRow: number,
		deltaMS: number
	): void {
		wander.timerMS = wander.timerMS - deltaMS;
		wander.startleCdMS = Math.max(0, wander.startleCdMS - deltaMS);
		
		const headX = headCol >= 0 ? (headCol + 0.5) * CELL : 0;
		const headY = headRow >= 0 ? (headRow + 0.5) * CELL : 0;
		const distanceToHead =
			headCol >= 0
				? Math.hypot(
						(wander.x - headX) / CELL,
						(wander.y - headY) / CELL
					)
				: 999;
		
		// Побег.
		if (
			headCol >= 0 &&
			wander.mode === 0 &&
			wander.startleCdMS <= 0 &&
			distanceToHead < GameplayConfig.FOOD_FLEE_RADIUS
		) {
			wander.mode = 1;
			wander.startleCdMS = GameplayConfig.FOOD_FLEE_COOLDOWN_MS;
			this.chooseFleeTarget(wander, pos.col, pos.row, headX, headY);
			wander.timerMS = 820;
		}
		
		// Завершение побега.
		if (wander.mode === 1 && (wander.timerMS <= 0 || this.reachedTarget(wander))) {
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
	}

	/**
	 * Выбирает цель блуждания без создания массива кандидатов.
	 * Использует резервуарную выборку для детерминированного случайного выбора.
	 */
	private chooseWanderTarget(wander: FoodWander, col: number, row: number): void {
		let count = 0;
		let bestCol = col;
		let bestRow = row;
		
		for (const dir of DIRS) {
			const vec = DIR_VECTORS[dir];
			const nextCol = col + vec.dx;
			const nextRow = row + vec.dy;
			
			if (this.canEnterCell(nextCol, nextRow)) {
				count++;
				if (this.rng.nextInt(count) === 0) {
					bestCol = nextCol;
					bestRow = nextRow;
				}
			}
		}
		
		if (count > 0 && this.rng.next() < 0.62) {
			this.randomPointInCell(wander, bestCol, bestRow);
			return;
		}
		
		this.randomPointInCell(wander, col, row);
	}

	private chooseFleeTarget(
		wander: FoodWander,
		col: number,
		row: number,
		headX: number,
		headY: number
	): void {
		let bestCol = col;
		let bestRow = row;
		let bestScore = -Infinity;
		let found = false;
		
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
				bestCol = nextCol;
				bestRow = nextRow;
				found = true;
			}
		}
		
		if (found) {
			this.pickFarPoint(wander, bestCol, bestRow, headX, headY);
		} else {
			this.pickFarPoint(wander, col, row, headX, headY);
		}
	}

	private pickFarPoint(
		wander: FoodWander,
		col: number,
		row: number,
		headX: number,
		headY: number
	): void {
		let bestX = wander.x;
		let bestY = wander.y;
		let bestScore = -Infinity;
		
		for (let i = 0; i < 4; i++) {
			this.randomPointInCell(wander, col, row);
			const score =
				Math.hypot(wander.targetX - headX, wander.targetY - headY) +
				this.rng.next() * 2;
			
			if (score > bestScore) {
				bestScore = score;
				bestX = wander.targetX;
				bestY = wander.targetY;
			}
		}
		
		wander.targetX = bestX;
		wander.targetY = bestY;
	}

	private randomPointInCell(wander: FoodWander, col: number, row: number): void {
		const margin = CELL * 0.24;
		wander.targetX = col * CELL + margin + this.rng.next() * (CELL - margin * 2);
		wander.targetY = row * CELL + margin + this.rng.next() * (CELL - margin * 2);
	}

	private reachedTarget(wander: FoodWander): boolean {
		const dx = wander.targetX - wander.x;
		const dy = wander.targetY - wander.y;
		return Math.hypot(dx, dy) < 4;
	}

	private canEnterCell(col: number, row: number): boolean {
		if (!this.collision.withinBounds(col, row)) {
			return false;
		}
		if (this.collision.isWall(col, row)) {
			return false;
		}
		if (this.collision.isOccupied(col, row)) {
			return false;
		}
		if (this.collision.isFood(col, row)) {
			return false;
		}
		if (this.collision.isExit(col, row)) {
			return false;
		}
		return true;
	}

	private randomRange(min: number, max: number): number {
		return min + this.rng.next() * (max - min);
	}
}