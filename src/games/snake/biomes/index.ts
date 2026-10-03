// Контракт биома
export type { Biome, BiomePalette, BiomeTheme } from './Biome.js';

// Данные рендера (контракт между игровым слоем и биомом)
export type {
	FoodRender,
	OverlayPalette,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle,
	ParticleRender,
} from './renderData.js';

// Дескрипторы и менеджер
export type { BiomeDescriptor, BiomeResolver } from './BiomeDescriptor.js';
export { defaultBiomeResolver } from './BiomeDescriptor.js';
export type { BiomeManagerOptions, BiomeChangedListener } from './BiomeManager.js';
export { BiomeManager } from './BiomeManager.js';

// Конкретные биомы
export { PondBiome } from './pond/PondBiome.js';
export { LunarBiome } from './lunar/LunarBiome.js';

// Реестр
export { BIOME_REGISTRY } from './registry.js';
// В блок "Контракт биома" (после существующих):
export type { ParticleRenderer } from './renderers.js';