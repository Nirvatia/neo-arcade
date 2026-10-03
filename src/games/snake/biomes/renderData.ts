/**
 * Данные рендера, которые игровой слой передаёт биому.
 *
 * Биом не генерирует и не хранит эти данные.
 * Он только рисует арт по переданной геометрии.
 */

/** Еда. Приходит из FoodView с пиксельными координатами и фазой анимации. */
export interface FoodRender {
	x: number;
	y: number;
	bit: 0 | 1;
	phase: number;
	/** Направление движения добычи (радианы). */
	angle: number;
}

/**
 * Точка уже просчитанной визуальной цепи змейки.
 * Биом получает готовую геометрию и не занимается анимацией сам.
 */
export interface SnakeChainPoint {
	x: number;
	y: number;
	angle: number;
	/** Расстояние от головы вдоль тела. */
	d: number;
	/** Индекс зоны/сегмента для окраски. */
	zone: number;
}

/**
 * Стиль зоны тела: бит и активность.
 * Этого достаточно, чтобы биом мог раскрасить кольца.
 */
export interface SnakeZoneStyle {
	bit: 0 | 1;
	active: boolean;
}

/**
 * Состояние головы для биома.
 * Биом рисует голову/язык/моргание, но не считает движение.
 */
export interface SnakeHeadRender {
	x: number;
	y: number;
	angle: number;
	moving: boolean;
}

/**
 * Палитра оверлейных экранов (меню, пауза, гейм-овер).
 * Биом может предоставить свою, иначе используется фолбэк.
 */
export interface OverlayPalette {
	background: number;
	backgroundAlpha: number;
	title: number;
	subtitle: number;
	hintKey: number;
	hintAction: number;
	accent: number;
	warn: number;
	success: number;
}

/**
 * Данные частицы для биома.
 * Координатор создаёт, обновляет физику, передаёт биому для рисования.
 */
export interface ParticleRender {
	x: number;
	y: number;
	size: number;
	/** 1 (только родилась) → 0 (умирает). */
	life: number;
	/** Подсказка цвета; биом вправе взять свою палитру. */
	color: number;
}