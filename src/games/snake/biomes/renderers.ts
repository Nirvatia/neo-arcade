import type { Container, Graphics } from 'pixi.js';
import type { GridBitmask } from '../logic/grid/GridBitmask.js';
import type { BitOp } from '../components/index.js';
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
	render(g: Graphics, grid: GridBitmask, cellSize: number): void;
}

/**
 * Выход. Рисуется каждый кадр, может анимироваться.
 */
export interface ExitRenderer {
	render(g: Graphics, grid: GridBitmask, timeMS: number, cellSize: number): void;
}

/**
 * Еда. Получает уже подготовленные данные из FoodView.
 */
export interface FoodRenderer {
	render(g: Graphics, foods: FoodRender[], timeMS: number, cellSize: number): void;
	destroy?(): void;
}

/**
 * Змейка. Получает готовую цепь точек из SnakeView.
 * Содержит только арт: тело, голова, FX.
 */
export interface SnakeRenderer {
	render(
		g: Graphics,
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
 * Фабрика визуала токенов.
 */
export interface TokenVisualFactory {
	create(op: BitOp, cellSize: number): Container;
}

/**
 * Фоновый эмбиент биома.
 */
export interface AmbientLayer {
	readonly container: Container;
	update(
		deltaMS: number,
		timeMS: number,
		cellSize: number,
		cols: number,
		rows: number
	): void;
	destroy(): void;
}

/**
 * Фон оверлейных экранов (меню, пауза, гейм-овер, победа).
 * Биом рисует подложку, свечение, декорации, виньетку.
 * Тексты и их позиционирование остаются за игровым слоем.
 */
export interface OverlayRenderer {
	render(g: Graphics, width: number, height: number, timeMS: number, cellSize: number): void;
}

/**
 * Арт частиц биома.
 * Биом рисует частицы в своём стиле (пузыри, искры, снег и т.д.).
 */
export interface ParticleRenderer {
	render(g: Graphics, particles: ParticleRender[], timeMS: number, cellSize: number): void;
}