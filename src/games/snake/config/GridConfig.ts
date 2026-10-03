export const GridConfig = {
	START_COLS: 16,
	START_ROWS: 12,
	CELL_SIZE: 30,
	GROWTH_COLS: 2,
	GROWTH_ROWS: 1,
	MAX_COLS: 38,
	MAX_ROWS: 23
} as const;
export type GridConfigType = typeof GridConfig;