import type { BiomeDescriptor } from './BiomeDescriptor.js';
import { LunarBiome } from './lunar/LunarBiome.js';
import { PondBiome } from './pond/PondBiome.js';

/**
 * Реестр биомов.
 *
 * Сейчас здесь только Пруд.
 * Дальше новые биомы добавляются сюда без переписывания BiomeManager.
 */
export const BIOME_REGISTRY: readonly BiomeDescriptor[] = [
	{ id: 'lunar', create: () => new LunarBiome() },
	{
		id: 'pond',
		create: () => new PondBiome()
	}
];
