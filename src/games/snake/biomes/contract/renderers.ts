import type { BitOp } from '$games/snake/components/index.js';
import type { GridBitmask } from '$games/snake/logic/grid/GridBitmask.js';
import type {
	FoodRender,
	ParticleRender,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from './renderData.js';

/**
 * Статичное поле: фон, вода, берег, стены, сетка.
 * Рисуется только при смене/расширении поля.
 */
export interface FieldRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		grid: GridBitmask,
		cellSize: number
	): void;
}

/**
 * Выход. Рисуется каждый кадр, может анимироваться.
 */
export interface ExitRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		grid: GridBitmask,
		timeMS: number,
		cellSize: number
	): void;
}

/**
 * Еда. Получает уже подготовленные данные из FoodView.
 */
export interface FoodRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		foods: FoodRender[],
		timeMS: number,
		cellSize: number
	): void;

	destroy?(): void;
}

/**
 * Змейка. Получает готовую цепь точек из SnakeView.
 * Содержит только арт: тело, голова, FX.
 */
export interface SnakeRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		chain: SnakeChainPoint[],
		zones: SnakeZoneStyle[],
		head: SnakeHeadRender,
		timeMS: number,
		cellSize: number
	): void;

	reset?(): void;
	destroy?(): void;
}

/**
 * Рендер токена.
 *
 * Токен рисуется напрямую в canvas каждый кадр.
 * Получает время для анимации.
 */
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

/**
 * Фоновый эмбиент биома.
 *
 * Больше нет контейнера.
 * Обновление и отрисовка разделяются.
 */
export interface AmbientLayer {
	update(
		deltaMS: number,
		timeMS: number,
		cellSize: number,
		cols: number,
		rows: number
	): void;

	render(ctx: CanvasRenderingContext2D): void;

	/**
	 * Необязательный передний план амбиента.
	 * Рисуется поверх змейки, но до оверлеев.
	 */
	renderForeground?(ctx: CanvasRenderingContext2D): void;

	destroy(): void;
}

/**
 * Арт частиц биома.
 */
export interface ParticleRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		particles: ParticleRender[],
		timeMS: number,
		cellSize: number
	): void;
}