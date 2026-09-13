// Новая палитра «Змейка: Битовый Лабиринт».
export const Palette = {
  bg: 0x0a0d12,
  grid: 0x11151c,
  white: 0xf2f6fa,
  light: 0xc7d2dc,
  gray: 0x5a6672,
  tail: 0x4a5562, // ← чуть ярче
  dark: 0x10151c,
  chrome: 0x1c232c,
  amber: 0xffb02e,
  cyan: 0x4cc9e0,
  green: 0x5be07a,
  coral: 0xff5c5c,
  ink: 0x0a0d12,
  wallTop: 0x232c39,
  wallBottom: 0x171e28,
  wallBevel: 0x94a8be,
  tokenBg: 0x171105,
  foodZeroBg: 0x0a1418,
  foodInk: 0x05222a,
  headInk: 0x1a0505,
} as const;

export type PaletteType = typeof Palette;

export const MonoFont = {
  FAMILY:
    'ui-monospace, "Cascadia Mono", "JetBrains Mono", Consolas, "Courier New", monospace',
} as const;

export function paletteCss(color: number): string {
  const hex = color.toString(16).padStart(6, "0");
  return "#" + hex;
}