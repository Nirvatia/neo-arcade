import type { BiomeDescriptor } from './contract/BiomeDescriptor.js';
import { createLunarBiome } from './lunar/LunarBiome.js';
import { BIOME_VARIANTS } from './lunar/LunarPalette.js';

/**
 * Реестр биомов.
 *
 * Сейчас все биомы представлены вариациями лунной лагуны.
 * Это позволяет уже сейчас проверить прогрессию, смену палитры,
 * переходы между биомами и бесконечный режим.
 *
 * Позже каждый вариант можно заменить на уникальный биом
 * с собственным артом, амбиентом и рендерерами.
 */
export const BIOME_REGISTRY: readonly BiomeDescriptor[] = BIOME_VARIANTS.map(
	(variant, index) => ({
		id: variant.id,
		infinite: index === BIOME_VARIANTS.length - 1,
		create: () => createLunarBiome(variant)
	})
);