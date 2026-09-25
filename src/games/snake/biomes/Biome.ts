import type { Container, Graphics } from 'pixi.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import type { BitOp } from '../components/index.js';
import type {
	FoodRender,
	OverlayPalette,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from './renderData.js';

export interface BiomeTheme {
	/** Фон страницы: любое CSS-значение (цвет, градиент). */
	pageBackground: string;
	/** CSS-переменные для интерфейса. */
	cssVariables: Record<string, string>;
}

export interface BiomePalette {
	screenBackground: number;
	field: number;
	grid: number;
	wall: number;
	wallEdge: number;
	form: number;
	formDim: number;
	accent: number;
	warn: number;
	bitOne: number;
	bitZero: number;
}

export interface Biome {
	readonly id: string;
	readonly palette: BiomePalette;
	readonly theme: BiomeTheme;
	/** Палитра оверлейных экранов. Если не задана — используется фолбэк. */
	readonly overlay: OverlayPalette;

	/** Рисует статичный фон + стены. Вызывается при смене/расширении поля. */
	renderField(g: Graphics, grid: GridBitmask, cellSize: number): void;

	/** Рисует выход. */
	renderExit(g: Graphics, grid: GridBitmask, timeMS: number, cellSize: number): void;

	/** Рисует еду. Еда приходит уже с пиксельными координатами и фазой анимации. */
	renderFood(g: Graphics, foods: FoodRender[], timeMS: number, cellSize: number): void;
renderOverlay(g: Graphics, width: number, height: number, timeMS: number, cellSize: number): void;
	/**
	 * Рисует змейку по готовой визуальной цепи.
	 *
	 * ВАЖНО:
	 * - биом не интерполирует клетки;
	 * - биом не хранит трейлы/цепочки;
	 * - биом только рисует арт по переданной геометрии.
	 */
	renderSnake(
		g: Graphics,
		chain: SnakeChainPoint[],
		zones: SnakeZoneStyle[],
		head: SnakeHeadRender,
		timeMS: number,
		cellSize: number
	): void;

	/** Создаёт визуал токена. */
	createTokenVisual(op: BitOp, cellSize: number): Container;

	/** Контейнер эмбиента. */
	getAmbientContainer(): Container;

	/** Обновление эмбиента. */
	updateAmbient(deltaMS: number, timeMS: number, cellSize: number, cols: number, rows: number): void;

	destroy(): void;
}