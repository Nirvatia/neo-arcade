export interface LevelTuning {
	level: number;
	stepIntervalMS: number;
	targetLength: number;
	movesPerSequence: number;
	sequencesToOpenExit: number;
	maxActiveTokens: number;
	overdriveBits: number;
}

export const LevelConfig: readonly LevelTuning[] = [
	{ level: 1, stepIntervalMS: 140, targetLength: 2, movesPerSequence: 10, sequencesToOpenExit: 2, maxActiveTokens: 1, overdriveBits: 2 },
	{ level: 2, stepIntervalMS: 135, targetLength: 2, movesPerSequence: 10, sequencesToOpenExit: 2, maxActiveTokens: 1, overdriveBits: 2 },
	{ level: 3, stepIntervalMS: 130, targetLength: 3, movesPerSequence: 11, sequencesToOpenExit: 2, maxActiveTokens: 1, overdriveBits: 2 },
	{ level: 4, stepIntervalMS: 125, targetLength: 3, movesPerSequence: 11, sequencesToOpenExit: 2, maxActiveTokens: 1, overdriveBits: 2 },
	{ level: 5, stepIntervalMS: 120, targetLength: 4, movesPerSequence: 11, sequencesToOpenExit: 2, maxActiveTokens: 2, overdriveBits: 2 },
	{ level: 6, stepIntervalMS: 115, targetLength: 4, movesPerSequence: 12, sequencesToOpenExit: 2, maxActiveTokens: 2, overdriveBits: 3 },
	{ level: 7, stepIntervalMS: 110, targetLength: 5, movesPerSequence: 12, sequencesToOpenExit: 2, maxActiveTokens: 2, overdriveBits: 3 },
	{ level: 8, stepIntervalMS: 105, targetLength: 5, movesPerSequence: 12, sequencesToOpenExit: 2, maxActiveTokens: 2, overdriveBits: 3 },
	{ level: 9, stepIntervalMS: 100, targetLength: 6, movesPerSequence: 13, sequencesToOpenExit: 2, maxActiveTokens: 2, overdriveBits: 3 },
	{ level: 10, stepIntervalMS: 95, targetLength: 6, movesPerSequence: 13, sequencesToOpenExit: 2, maxActiveTokens: 2, overdriveBits: 3 },
	{ level: 11, stepIntervalMS: 90, targetLength: 6, movesPerSequence: 13, sequencesToOpenExit: 2, maxActiveTokens: 2, overdriveBits: 3 },
	{ level: 12, stepIntervalMS: 85, targetLength: 6, movesPerSequence: 13, sequencesToOpenExit: 2, maxActiveTokens: 2, overdriveBits: 3 }
];

const LAST_TUNING = LevelConfig[LevelConfig.length - 1] as LevelTuning;

export function getLevelTuning(level: number): LevelTuning {
	return LevelConfig.find((tuning) => tuning.level === level) ?? LAST_TUNING;
}