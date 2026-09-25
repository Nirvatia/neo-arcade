import type { BiomeDescriptor } from './BiomeDescriptor.js';
import { PondBiome } from './pond/PondBiome.js';

/**
 * Реестр биомов.
 *
 * Сейчас здесь только Пруд.
 * Дальше новые биомы добавляются сюда без переписывания BiomeManager.
 */
export const BIOME_REGISTRY: readonly BiomeDescriptor[] = [
	{
		id: 'pond',
		create: () => new PondBiome()
	}
];