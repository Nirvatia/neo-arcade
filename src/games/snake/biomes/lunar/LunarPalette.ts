import type { BiomePalette, BiomeTheme } from '../contract/Biome.js';

export const LUNAR_PALETTE: BiomePalette = {
	screenBackground: 0x04060c,
	field: 0x16324e,
	grid: 0x9fc0e0,
	wall: 0x33445a,
	wallEdge: 0x4a5f7a,
	form: 0xdce8f8,
	formDim: 0x8fa5c8,
	accent: 0x9fe8c0,
	warn: 0xff5c6e,
	bitOne: 0xff5a4d,
	bitZero: 0x4fe07a
};

export const LUNAR_THEME: BiomeTheme = {
	pageBackground: 'radial-gradient(100% 85% at 50% 0%, #16243c, #04060c)',
	cssVariables: {
		'--hud-bg': '#1c2a44',
		'--hud-edge': '#4a5f7a',
		'--hud-ink': '#f4f8ff',
		'--hud-soft': '#8fa5c8',
		'--hud-accent': '#9fe8c0',
		'--hud-warn': '#ff5c6e',
		'--hud-bit-one': '#ff5a4d',
		'--hud-bit-zero': '#4fe07a'
	}
};

/**
 * Внутренние цвета арта Лунной Лагуны.
 */
export const C = {
	// Вода
	water0: 0x16324e,
	water1: 0x0d2135,
	water2: 0x071220,
	waterLight: 0x1e3f5e,
	// Берег
	shore0: 0x33445a,
	shoreLight: 0x4a5f7a,
	shoreDark: 0x1e2a3a,
	stone: 0x556a82,
	stoneDark: 0x46586f,
	stoneLight: 0x7a8fa8,
	moss: 0x2d5a3f,
	cracks: 0x0d1626,
	// Небо и светила
	moon: 0xdce8f8,
	path: 0xc8dcf0,
	star: 0xbcd8ff,
	glowTop: 0x8ab8d8,
	glowMid: 0x5a8ab0,
	// Кувшинки
	lily: 0x16382f,
	lilyEdge: 0x2a5a4a,
	flower: 0xf4f0ff,
	flowerCore: 0xffe9a0,
	// Сетка
	grid: 0x9fc0e0,
	// Змейка — угорь
	pupil: 0x0a0e14,
	shadow: 0x030508,
	// Биты
	bitOne: 0xff5a4d,
	bitOneHi: 0xffa89c,
	bitZero: 0x4fe07a,
	bitZeroHi: 0xb0f2c4,
	// Токены
	tokenRight: 0xffc04d,
	tokenRightHi: 0xffe0a0,
	tokenLeft: 0xb088e8,
	tokenLeftHi: 0xd8c0ff,
	// Общее
	form: 0xdce8f8,
	warn: 0xff5c6e,
	accent: 0x9fe8c0,
	firefly: 0xffe9a0,
	mist: 0xa8c8e0,
	fish: 0x04070c,
	vignette: 0x04060c
} as const;

/**
 * Вариант биома.
 *
 * Позволяет создавать разные биомы на базе одного арта,
 * но с разной палитрой и темой.
 */
export interface BiomeVariant {
	id: string;
	palette: BiomePalette;
	theme: BiomeTheme;
}

function createPalette(overrides: Partial<BiomePalette>): BiomePalette {
	return {
		...LUNAR_PALETTE,
		...overrides
	};
}

function createTheme(
	pageBackground: string,
	cssVariables: Record<string, string>
): BiomeTheme {
	return {
		pageBackground,
		cssVariables: {
			...LUNAR_THEME.cssVariables,
			...cssVariables
		}
	};
}

/**
 * Временные цветовые варианты биомов.
 *
 * Последний вариант — бесконечный биом.
 * Позже каждый из них можно заменить на полностью уникальный биом.
 */
export const BIOME_VARIANTS: readonly BiomeVariant[] = [
	{
		id: 'lunar',
		palette: LUNAR_PALETTE,
		theme: LUNAR_THEME
	},
	{
		id: 'ember',
		palette: createPalette({
			screenBackground: 0x0c0604,
			field: 0x4e2a16,
			grid: 0xe0c09f,
			wall: 0x5a3a2a,
			wallEdge: 0x7a5f4a,
			form: 0xf8e8dc,
			formDim: 0xc8a58f,
			accent: 0xe8c09f,
			warn: 0xff5c6e,
			bitOne: 0xffa04d,
			bitZero: 0x7ae04f
		}),
		theme: createTheme('radial-gradient(100% 85% at 50% 0%, #3c2416, #0c0604)', {
			'--hud-bg': '#442a1c',
			'--hud-edge': '#7a5f4a',
			'--hud-ink': '#fff8f4',
			'--hud-soft': '#c8a58f',
			'--hud-accent': '#e8c09f',
			'--hud-warn': '#ff5c6e',
			'--hud-bit-one': '#ffa04d',
			'--hud-bit-zero': '#7ae04f'
		})
	},
	{
		id: 'verdant',
		palette: createPalette({
			screenBackground: 0x040c06,
			field: 0x164e2a,
			grid: 0x9fe0c0,
			wall: 0x2a5a3a,
			wallEdge: 0x4a7a5f,
			form: 0xdcf8e8,
			formDim: 0x8fc8a5,
			accent: 0x9fe8c0,
			warn: 0xff5c6e,
			bitOne: 0xff5a4d,
			bitZero: 0x4fe0a0
		}),
		theme: createTheme('radial-gradient(100% 85% at 50% 0%, #163c24, #040c06)', {
			'--hud-bg': '#1c442a',
			'--hud-edge': '#4a7a5f',
			'--hud-ink': '#f4fff8',
			'--hud-soft': '#8fc8a5',
			'--hud-accent': '#9fe8c0',
			'--hud-warn': '#ff5c6e',
			'--hud-bit-one': '#ff5a4d',
			'--hud-bit-zero': '#4fe0a0'
		})
	},
	{
		id: 'violet',
		palette: createPalette({
			screenBackground: 0x08040c,
			field: 0x3a164e,
			grid: 0xc09fe0,
			wall: 0x4a2a5a,
			wallEdge: 0x5f4a7a,
			form: 0xf0dcf8,
			formDim: 0xa58fc8,
			accent: 0xc09fe8,
			warn: 0xff5c6e,
			bitOne: 0xff5a4d,
			bitZero: 0x7a4fe0
		}),
		theme: createTheme('radial-gradient(100% 85% at 50% 0%, #2a163c, #08040c)', {
			'--hud-bg': '#2a1c44',
			'--hud-edge': '#5f4a7a',
			'--hud-ink': '#f8f4ff',
			'--hud-soft': '#a58fc8',
			'--hud-accent': '#c09fe8',
			'--hud-warn': '#ff5c6e',
			'--hud-bit-one': '#ff5a4d',
			'--hud-bit-zero': '#7a4fe0'
		})
	},
	{
		id: 'golden',
		palette: createPalette({
			screenBackground: 0x0c0a04,
			field: 0x4e3a16,
			grid: 0xe0d09f,
			wall: 0x5a4a2a,
			wallEdge: 0x7a6a4a,
			form: 0xf8f0dc,
			formDim: 0xc8b58f,
			accent: 0xe8d09f,
			warn: 0xff5c6e,
			bitOne: 0xff804d,
			bitZero: 0xe0c04f
		}),
		theme: createTheme('radial-gradient(100% 85% at 50% 0%, #3c2f16, #0c0a04)', {
			'--hud-bg': '#44341c',
			'--hud-edge': '#7a6a4a',
			'--hud-ink': '#fffdf4',
			'--hud-soft': '#c8b58f',
			'--hud-accent': '#e8d09f',
			'--hud-warn': '#ff5c6e',
			'--hud-bit-one': '#ff804d',
			'--hud-bit-zero': '#e0c04f'
		})
	},
	{
		id: 'endless',
		palette: createPalette({
			screenBackground: 0x020408,
			field: 0x0a1a2e,
			grid: 0x8fb8e0,
			wall: 0x1a2a44,
			wallEdge: 0x2a4a6a,
			form: 0xe8f4ff,
			formDim: 0x8fa8c8,
			accent: 0x8fe8ff,
			warn: 0xff5c6e,
			bitOne: 0xff5a4d,
			bitZero: 0x4fe0ff
		}),
		theme: createTheme('radial-gradient(100% 85% at 50% 0%, #0a1a2e, #020408)', {
			'--hud-bg': '#0a1a2e',
			'--hud-edge': '#2a4a6a',
			'--hud-ink': '#f0f8ff',
			'--hud-soft': '#8fa8c8',
			'--hud-accent': '#8fe8ff',
			'--hud-warn': '#ff5c6e',
			'--hud-bit-one': '#ff5a4d',
			'--hud-bit-zero': '#4fe0ff'
		})
	}
];