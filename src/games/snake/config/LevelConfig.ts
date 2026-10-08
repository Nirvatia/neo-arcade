import type { BiomeResolver } from '../biomes/index.js';

/**
 * Настройка уровня.
 *
 * Теперь уровень описывается не плоским списком из 12 строк,
 * а вычисляется из прогрессии биомов.
 */
export interface LevelTuning {
	/** Глобальный уровень, 1..infinity. */
	level: number;
	/** Индекс биома в реестре биомов. */
	biomeIndex: number;
	/** Уровень внутри текущего биома, начиная с 1. */
	biomeLevel: number;
	/** Является ли текущий биом бесконечным. */
	infinite: boolean;
	stepIntervalMS: number;
	targetLength: number;
	movesPerSequence: number;
	/**
	 * Сколько последовательностей нужно выполнить, чтобы открыть выход.
	 * В бесконечном биоме выход не открывается.
	 */
	sequencesToOpenExit: number;
	maxActiveTokens: number;
	overdriveBits: number;
}

/**
 * Прогрессия биомов.
 *
 * Биом 1: стартовый, без расширения при входе.
 * Биомы 2..5: обычные, при входе расширяют поле.
 * Биом 6: бесконечный, без рамок, без выхода, без финала.
 */
export interface BiomeProgression {
	/** Сколько уровней нужно пройти внутри биома. Для бесконечного формально 1. */
	levels: number;
	/** Бесконечный биом. */
	infinite: boolean;
	/** Насколько расширяется поле при входе в этот биом. */
	gridGrowth: { cols: number; rows: number };
}

export const BIOME_PROGRESSION: readonly BiomeProgression[] = [
	// Биом 1: стартовый.
	{ levels: 3, infinite: false, gridGrowth: { cols: 0, rows: 0 } },
	// Биом 2.
	{ levels: 3, infinite: false, gridGrowth: { cols: 4, rows: 2 } },
	// Биом 3.
	{ levels: 3, infinite: false, gridGrowth: { cols: 4, rows: 2 } },
	// Биом 4.
	{ levels: 3, infinite: false, gridGrowth: { cols: 4, rows: 2 } },
	// Биом 5.
	{ levels: 3, infinite: false, gridGrowth: { cols: 4, rows: 2 } },
	// Биом 6: бесконечный.
	{ levels: 1, infinite: true, gridGrowth: { cols: 6, rows: 3 } }
];

const LAST_BIOME_INDEX = BIOME_PROGRESSION.length - 1;

/**
 * Возвращает индекс биома и уровень внутри биома для глобального уровня.
 */
export function getBiomeForLevel(level: number): {
	biomeIndex: number;
	biomeLevel: number;
} {
	let remaining = Math.max(1, level);

	for (let i = 0; i < BIOME_PROGRESSION.length; i++) {
		const biome = BIOME_PROGRESSION[i]!;

		if (biome.infinite) {
			return { biomeIndex: i, biomeLevel: remaining };
		}

		if (remaining <= biome.levels) {
			return { biomeIndex: i, biomeLevel: remaining };
		}

		remaining -= biome.levels;
	}

	return { biomeIndex: LAST_BIOME_INDEX, biomeLevel: remaining };
}

/**
 * Возвращает настройку уровня по глобальному номеру уровня.
 */
export function getLevelTuning(level: number): LevelTuning {
	const safeLevel = Math.max(1, level);
	const { biomeIndex, biomeLevel } = getBiomeForLevel(safeLevel);
	const infinite = biomeIndex === LAST_BIOME_INDEX;

	// Скорость растёт с глобальным уровнем, но упирается в потолок.
	const speedLevel = Math.min(safeLevel, 40);
	const stepIntervalMS = Math.max(65, 140 - (speedLevel - 1) * 2);

	// Длина целевой последовательности растёт постепенно.
	const targetLength = Math.min(8, 2 + Math.floor((safeLevel - 1) / 2));

	// Количество ходов на выполнение последовательности.
	const movesPerSequence = Math.min(18, 10 + Math.floor((safeLevel - 1) / 3));

	// В бесконечном биоме выход не открывается.
	const sequencesToOpenExit = infinite ? 0 : 2;
	const maxActiveTokens = safeLevel < 5 ? 1 : 2;
	const overdriveBits = safeLevel < 6 ? 2 : 3;

	return {
		level: safeLevel,
		biomeIndex,
		biomeLevel,
		infinite,
		stepIntervalMS,
		targetLength,
		movesPerSequence,
		sequencesToOpenExit,
		maxActiveTokens,
		overdriveBits
	};
}

/**
 * Резолвер биомов для BiomeManager.
 *
 * Использует прогрессию из BIOME_PROGRESSION,
 * а не циклический выбор по уровням.
 */
export const progressionResolver: BiomeResolver = (level, registryLength) => {
	if (registryLength <= 0) {
		return 0;
	}

	const { biomeIndex } = getBiomeForLevel(level);

	return Math.min(Math.max(0, biomeIndex), registryLength - 1);
};