import type { BitOp } from '$games/snake/components/index.js';
import type { GridBitmask } from '$games/snake/logic/grid/GridBitmask.js';
import type {
	FoodRender,
	ParticleRender,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from './renderData.js';

export interface FieldRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		grid: GridBitmask,
		cellSize: number
	): void;
}

export interface ExitRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		grid: GridBitmask,
		timeMS: number,
		cellSize: number
	): void;
}

export interface FoodRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		foods: FoodRender[],
		count: number,
		timeMS: number,
		cellSize: number
	): void;
	destroy?(): void;
}

/**
 * Змейка. Получает готовую цепь точек и диапазон для отрисовки.
 * Это позволяет рисовать подцепи без создания новых массивов.
 */
export interface SnakeRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		chain: SnakeChainPoint[],
		start: number,
		end: number,
		zones: SnakeZoneStyle[],
		head: SnakeHeadRender,
		timeMS: number,
		cellSize: number
	): void;
	reset?(): void;
	destroy?(): void;
}

export interface TokenRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		op: BitOp,
		x: number,
		y: number,
		cellSize: number,
		timeMS: number
	): void;
}

export interface AmbientLayer {
	update(
		deltaMS: number,
		timeMS: number,
		cellSize: number,
		cols: number,
		rows: number
	): void;
	render(ctx: CanvasRenderingContext2D): void;
	renderForeground?(ctx: CanvasRenderingContext2D): void;
	destroy(): void;
}

export interface ParticleRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		particles: ParticleRender[],
		count: number,
		timeMS: number,
		cellSize: number
	): void;
}