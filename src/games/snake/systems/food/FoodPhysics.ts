import type { Food, FoodWander, GridPosition } from '../../components/index.js';
import type { GridService } from '$games/snake/logic/grid/GridService.js';
import { GameplayConfig, GridConfig } from '../../config/index.js';

const CELL = GridConfig.CELL_SIZE;
const MARGIN = 3;

/**
 * FoodSteering — физика и интеграция движения еды.
 * Отвечает только за рулёжку, коллизии и синхронизацию логической клетки.
 * Не принимает решений о целях.
 */
export class FoodSteering {
	private readonly service: GridService;

	constructor(service: GridService) {
		this.service = service;
	}

	public update(
		wander: FoodWander,
		pos: GridPosition,
		food: Food,
		dt: number,
		_deltaMS: number
	): void {
		const grid = this.service.grid;
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
		
		// Интеграция с коллизиями.
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
		
		this.syncCell(pos, food, wander);
	}

	private syncCell(pos: GridPosition, food: Food, wander: FoodWander): void {
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

	private canEnterPixel(x: number, y: number, currentPos: GridPosition): boolean {
		const col = Math.floor(x / CELL);
		const row = Math.floor(y / CELL);
		if (col === currentPos.col && row === currentPos.row) {
			return true;
		}
		return this.canEnterCell(col, row);
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