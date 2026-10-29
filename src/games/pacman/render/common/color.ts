/** CSS rgba() string for a 0xRRGGBB colour with alpha clamped into [0, 1]. */
export function rgba(hex: number, a: number): string {
	const clamped = Math.max(0, Math.min(1, a));
	return `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${clamped})`;
}
