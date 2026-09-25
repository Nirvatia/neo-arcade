import type { Biome } from './Biome.js';

/**
 * Описание биома для реестра.
 *
 * Биом регистрируется не самим классом, а дескриптором:
 * - id удобен для отладки, кэшей и будущих сохранений;
 * - create позволяет создавать биом лениво и без жёсткой привязки к конструктору.
 */
export interface BiomeDescriptor {
	readonly id: string;
	create: () => Biome;
}

/**
 * Стратегия выбора биома по уровню.
 *
 * Уровень может быть больше количества биомов.
 * По умолчанию используется циклический выбор:
 * 3 уровня = 1 биом, дальше по кругу.
 */
export type BiomeResolver = (
	level: number,
	registryLength: number,
	levelsPerBiome: number
) => number;

/**
 * Стандартный резолвер.
 *
 * Для уровня 1..3 даёт биом 0.
 * Для уровня 4..6 даёт биом 1.
 * Для уровня 7..9 даёт биом 2.
 * И так далее.
 */
export const defaultBiomeResolver: BiomeResolver = (
	level,
	registryLength,
	levelsPerBiome
) => {
	if (registryLength <= 0) {
		return 0;
	}

	const safeLevel = Math.max(1, level);
	const safeLevelsPerBiome = Math.max(1, levelsPerBiome);

	const index = Math.floor((safeLevel - 1) / safeLevelsPerBiome);

	return ((index % registryLength) + registryLength) % registryLength;
};