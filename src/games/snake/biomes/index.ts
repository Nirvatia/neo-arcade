// Контракт биома
export type { Biome, BiomePalette, BiomeTheme } from './contract/Biome.js';

// Данные рендера
export type {
	FoodRender,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle,
	ParticleRender
} from './contract/renderData.js';

// Дескрипторы и менеджер
export type { BiomeDescriptor, BiomeResolver } from './contract/BiomeDescriptor.js';
export type { BiomeManagerOptions, BiomeChangedListener } from './BiomeManager.js';
export { BiomeManager } from './BiomeManager.js';

// Конкретные биомы
export { LunarBiome, createLunarBiome } from './lunar/LunarBiome.js';
export type { BiomeVariant } from './lunar/LunarPalette.js';
export { BIOME_VARIANTS } from './lunar/LunarPalette.js';

// Реестр
export { BIOME_REGISTRY } from './registry.js';

// Рендер-контракт частиц
export type { ParticleRenderer } from './contract/renderers.js';