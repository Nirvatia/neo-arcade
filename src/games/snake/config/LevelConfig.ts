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
	{
		level: 1,
		stepIntervalMS: 160,
		targetLength: 4,
		movesPerSequence: 12,
		sequencesToOpenExit: 1,
		maxActiveTokens: 1,
		overdriveBits: 2
	},
	{
		level: 2,
		stepIntervalMS: 155,
		targetLength: 5,
		movesPerSequence: 12,
		sequencesToOpenExit: 1,
		maxActiveTokens: 1,
		overdriveBits: 2
	},
	{
		level: 3,
		stepIntervalMS: 150,
		targetLength: 5,
		movesPerSequence: 11,
		sequencesToOpenExit: 1,
		maxActiveTokens: 1,
		overdriveBits: 2
	},
	{
		level: 4,
		stepIntervalMS: 145,
		targetLength: 6,
		movesPerSequence: 11,
		sequencesToOpenExit: 2,
		maxActiveTokens: 2,
		overdriveBits: 3
	},
	{
		level: 5,
		stepIntervalMS: 140,
		targetLength: 6,
		movesPerSequence: 10,
		sequencesToOpenExit: 2,
		maxActiveTokens: 2,
		overdriveBits: 3
	},
	{
		level: 6,
		stepIntervalMS: 135,
		targetLength: 6,
		movesPerSequence: 10,
		sequencesToOpenExit: 2,
		maxActiveTokens: 2,
		overdriveBits: 3
	},
	{
		level: 7,
		stepIntervalMS: 130,
		targetLength: 6,
		movesPerSequence: 9,
		sequencesToOpenExit: 2,
		maxActiveTokens: 2,
		overdriveBits: 3
	}
];

// Для уровней выше таблицы используется последняя строка.
const LAST_TUNING = LevelConfig[LevelConfig.length - 1] as LevelTuning;

export function getLevelTuning(level: number): LevelTuning {
	return LevelConfig.find((tuning) => tuning.level === level) ?? LAST_TUNING;
}