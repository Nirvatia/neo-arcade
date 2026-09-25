// «Монолитный минимал»: монохромный мир, редкие акценты.
// Свет не «эффект», а свойство самого объекта.
export const Palette = {
	// Мир
	bg: 0x050507,
	grid: 0xf0f0f2, // рисуется с альфой ~0.06
	wall: 0x1c1c26,
	wallEdge: 0x30303c,
	// Формы
	form: 0xf0f0f2,
	formDim: 0xc8c8d0,
	tail: 0x3a3a46,
	ghost: 0x2a2a32,
	ink: 0x050507, // цифры на белых блоках
	// Акценты
	accent: 0x4cc9e0, // выход, комбо 2+, FINAL
	warn: 0xff5c5c, // провал, GAME OVER
	// Совместимость со старыми ссылками
	white: 0xf0f0f2,
	light: 0xc8c8d0,
	gray: 0xa8a8b0,
	dark: 0x050507,
	chrome: 0x26262e,
	amber: 0xf0f0f2,
	cyan: 0x4cc9e0,
	green: 0x4cc9e0,
	coral: 0xff5c5c,
	wallTop: 0x1c1c26,
	wallBottom: 0x1c1c26,
	wallBevel: 0x30303c,
	tokenBg: 0xf0f0f2,
	foodZeroBg: 0x050507,
	foodInk: 0x050507,
	headInk: 0x050507
} as const;
export type PaletteType = typeof Palette;

export const MonoFont = {
	FAMILY: '"JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, "Courier New", monospace'
} as const;

export function paletteCss(color: number): string {
	const hex = color.toString(16).padStart(6, '0');
	return '#' + hex;
}