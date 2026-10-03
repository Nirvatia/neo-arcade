import type { BiomePalette, BiomeTheme } from '../Biome.js';
import type { OverlayPalette } from '../renderData.js';

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

export const LUNAR_OVERLAY: OverlayPalette = {
	background: 0x04060c,
	backgroundAlpha: 0.92,
	title: 0xdce8f8,
	subtitle: 0x8fa5c8,
	hintKey: 0x9fc0e0,
	hintAction: 0x5a8ab0,
	accent: 0x9fe8c0,
	warn: 0xff5c6e,
	success: 0x4fe07a
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
	shore1: 0x273548,
	shoreLight: 0x4a5f7a,
	shoreDark: 0x1e2a3a,
	stone: 0x556a82,
	stoneDark: 0x46586f,
	stoneLight: 0x7a8fa8,
	moss: 0x2d5a3f,
	mossLight: 0x4a7a5a,
	cracks: 0x0d1626,

	// Небо и светила
	moon: 0xdce8f8,
	path: 0xc8dcf0,
	star: 0xbcd8ff,
	glowTop: 0x8ab8d8,
	glowMid: 0x5a8ab0,
	glowBottom: 0x2a4a6a,

	// Кувшинки
	lily: 0x16382f,
	lilyEdge: 0x2a5a4a,
	flower: 0xf4f0ff,
	flowerCore: 0xffe9a0,

	// Сетка
	grid: 0x9fc0e0,

	// Змейка — угорь
	snakeBody: 0xa8c8e0,
	snakeHi: 0xe8f8ff,
	snakeDark: 0x5a8ab0,
	snakeOutline: 0x2a4a6a,
	snakePattern: 0x7ab8d0,
	aura: 0x80e8c0,
	eye: 0xe8c878,
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

	// Портал
	portal: 0xff88cc,
	portalCore: 0xffc0e8,
	portalRing: 0xcc55aa,

	// Общее
	form: 0xdce8f8,
	warn: 0xff5c6e,
	accent: 0x9fe8c0,
	bubble: 0xd8ecf8,
	chip: 0xe9f1fb,
	chipInk: 0x0d1626,
	firefly: 0xffe9a0,
	mist: 0xa8c8e0,
	fish: 0x04070c,
	vignette: 0x04060c
} as const;