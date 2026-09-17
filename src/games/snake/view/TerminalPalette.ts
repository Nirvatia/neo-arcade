export const TerminalPalette = {
	bg: 0x020a05,
	grid: 0x07130b,
	wallFill: 0x0f2b18,
	wallEdge: 0x1d5c33,
	tail: 0x1a4a2a,
	register: 0x2fbf6a,
	food: 0x5fee9a,
	exit: 0x8dffb0,
	head: 0xd9ffe9,
	token: 0xd9ffe9,
	ink: 0x03130a
} as const;

export type TerminalPaletteType = typeof TerminalPalette;

export const TerminalFont = {
	FAMILY: 'Courier New, monospace'
} as const;

// CSS-представление цвета палитры (для DOM-HUD), чтобы цвет жил в одном месте.
export function terminalCss(color: number): string {
	const hex = color.toString(16).padStart(6, '0');
	return '#' + hex;
}
