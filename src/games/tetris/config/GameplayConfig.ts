export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;
export const LINES_PER_LEVEL = 10;
export const LINE_CLEAR_DURATION_MS = 500;
export const LOCK_DELAY_MS = 500;
export const HARD_DROP_SCORE_PER_CELL = 2;
export const SOFT_DROP_SCORE_PER_CELL = 1;

export const SCORE_TABLE: Record<number, number> = {
	1: 40,
	2: 100,
	3: 300,
	4: 1200
};

export interface LevelDefinition {
	level: number;
	gravityMs: number;
}

const DEFAULT_LEVEL_DEFINITION: LevelDefinition = {
	level: MIN_LEVEL,
	gravityMs: 1000
};

export const LEVEL_PROGRESSION: readonly LevelDefinition[] = [
	{ level: 1, gravityMs: 1000 },
	{ level: 2, gravityMs: 900 },
	{ level: 3, gravityMs: 800 },
	{ level: 4, gravityMs: 700 },
	{ level: 5, gravityMs: 600 }
];

export function getLevelDefinition(level: number): LevelDefinition {
	const clamped = Math.min(Math.max(level, MIN_LEVEL), MAX_LEVEL);
	return LEVEL_PROGRESSION.find((entry) => entry.level === clamped) ?? DEFAULT_LEVEL_DEFINITION;
}

export function gravityInterval(level: number): number {
	return getLevelDefinition(level).gravityMs;
}

export function updateLevel(lines: number, currentLevel: number): number {
	const safeLines = Math.max(0, Math.floor(lines));
	const computedLevel = MIN_LEVEL + Math.floor(safeLines / LINES_PER_LEVEL);
	const nextLevel = Math.min(MAX_LEVEL, computedLevel);
	const safeCurrentLevel = Math.min(Math.max(currentLevel, MIN_LEVEL), MAX_LEVEL);
	return Math.max(safeCurrentLevel, nextLevel);
}

export function tempoMultiplier(level: number): number {
	const base = getLevelDefinition(MIN_LEVEL).gravityMs;
	const current = getLevelDefinition(level).gravityMs;
	if (current <= 0) {
		return 1;
	}
	return Math.round((base / current) * 10) / 10;
}