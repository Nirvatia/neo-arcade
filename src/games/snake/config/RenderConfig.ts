/**
 * RenderConfig — константы рендера, не зависящие от биома.
 */
export const RenderConfig = {
	/** Точек цепи на одну клетку — гладкость тела змейки. */
	POINTS_PER_CELL: 10,
	/** Сколько последних точек пути не участвуют в сглаживании. */
	SMOOTH_SKIP_HEAD: 2,
	/** Длительность плавного расширения поля (зум канваса). */
	ZOOM_DURATION_MS: 420,
	/** Пул визуалов токенов. */
	MAX_TOKEN_VISUALS: 4
} as const;
export type RenderConfigType = typeof RenderConfig;