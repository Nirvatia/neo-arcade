/**
 * RenderConfig — константы рендера, не зависящие от биома.
 */
export const RenderConfig = {
	/** Точек цепи на одну клетку — гладкость тела змейки. */
	POINTS_PER_CELL: 10
} as const;

export type RenderConfigType = typeof RenderConfig;