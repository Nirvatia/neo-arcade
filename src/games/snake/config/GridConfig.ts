export const GridConfig = {
  START_COLS: 24,
  START_ROWS: 16,
  CELL_SIZE: 30,
  GROWTH_COLS: 2,
  GROWTH_ROWS: 1,
  MAX_COLS: 38,
  MAX_ROWS: 23,
  BACKGROUND_COLOR: 0x05070d,
} as const;

export type GridConfigType = typeof GridConfig;