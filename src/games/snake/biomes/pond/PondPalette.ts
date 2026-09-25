import type { BiomePalette, BiomeTheme } from '../Biome.js';
import type { OverlayPalette } from '../renderData.js';

export const POND_PALETTE: BiomePalette = {
	screenBackground: 0x0a1008,
	field: 0x3e5626,
	grid: 0xf0e6b4,
	wall: 0x3a4a22,
	wallEdge: 0x6a7a4c,
	form: 0xf4eed8,
	formDim: 0x9aaa78,
	accent: 0xc8a040,
	warn: 0xff5c6e,
	bitOne: 0xff4a3a,
	bitZero: 0xa05aff
};
export const POND_OVERLAY: OverlayPalette = {
	background: 0x0a1408,
	backgroundAlpha: 0.92,
	title: 0xf4eed8,
	subtitle: 0x9aaa78,
	hintKey: 0xd4c898,
	hintAction: 0x8a9a68,
	accent: 0xc8a040,
	warn: 0xff5c6e,
	success: 0x7ddc8a
};
export const POND_THEME: BiomeTheme = {
	pageBackground: 'radial-gradient(90% 80% at 50% 0%, #24301a, #0a1008)',
	cssVariables: {
		'--hud-bg': '#3a4a2c',
		'--hud-edge': '#6a7a4c',
		'--hud-ink': '#ffffff',
		'--hud-soft': '#c8d0a8',
		'--hud-accent': '#c8a040',
		'--hud-warn': '#ff5c6e',
		'--hud-bit-one': '#ff4a3a',
		'--hud-bit-zero': '#a05aff'
	}
};

/**
 * Внутренние цвета арта Пруда.
 */
export const C = {
	groundLight: 0x4a5a2c,
	groundMid: 0x3a4a22,
	groundDark: 0x2a3818,
	grass: 0x5a7832,
	grassWater: 0x648c32,
	stone: 0x786e50,
	waterLight: 0x6a8448,
	waterMid: 0x56703a,
	waterDark: 0x3e5626,
	mud: 0x323c1e,
	shoreDark: 0x141e0c,
	shoreLight: 0x6e823c,
	sun: 0xfff0b4,

	// ===== ЗМЕЙКА: уж на солнце =====
	// Тёплый песочно-золотистый. Резко светлее тёмной воды — не сливается.
	snakeMid: 0xd4ae52,      // основной тон спины
	snakeHi: 0xfbe9b0,       // солнечный блик
	snakeEdge: 0x96702a,     // затенённый нижний край
	snakeOutline: 0x2a1e08,  // тёмный тёплый контур (сильнее тёмной воды)
	snakeBelly: 0xfaf0cc,    // кремовое брюшко
	snakePattern: 0x5c4712,  // тёмные пятна на спине
	snakeCollar: 0xffe464,   // фирменные жёлтые пятна ужа
	shadow: 0x0e1606,        // контактная тень

	bitOne: 0xff4a3a,
	bitOneHi: 0xff9a80,
	bitOneEdge: 0x9c1f14,
	bitZero: 0xa05aff,
	bitZeroHi: 0xd0aaff,
	bitZeroEdge: 0x5b2ba0,
	accent: 0xc8a040,
	grid: 0xf0e6b4,
	bubble: 0xdcf0d2,
	vignette: 0x141a0a
} as const;