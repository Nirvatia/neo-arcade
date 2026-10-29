import type { SeasonPalette } from '../../logic/SeasonCatalog';

export interface MazeColors {
	readonly wall: string;
	readonly floor: string;
	readonly dot: string;
	readonly energizer: string;
}

export function lerpHex(from: string, to: string, ratio: number): string {
	const a = parseHex(from);
	const b = parseHex(to);

	if (!a || !b) {
		return ratio < 0.5 ? from : to;
	}

	const t = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
	const r = Math.round(a.r + (b.r - a.r) * t);
	const g = Math.round(a.g + (b.g - a.g) * t);
	const blue = Math.round(a.b + (b.b - a.b) * t);

	return `#${hex2(r)}${hex2(g)}${hex2(blue)}`;
}

export function mazeColorsFor(palette: SeasonPalette, ratio: number): MazeColors {
	return {
		wall: lerpHex(palette.wall, palette.wallNight, ratio),
		floor: lerpHex(palette.floor, palette.floorNight, ratio),
		dot: lerpHex(palette.dot, palette.dotNight, ratio),
		energizer: lerpHex(palette.energizer, palette.energizerNight, ratio)
	};
}

export function tileHash(tx: number, ty: number, salt: number): number {
	const x = Number.isFinite(tx) ? Math.floor(tx) : 0;
	const y = Number.isFinite(ty) ? Math.floor(ty) : 0;
	const s = Number.isFinite(salt) ? Math.floor(salt) : 0;
	let value = ((x + 50) * 7919 + (y + 50) * 104729 + (s + 1) * 31) % 2147483646;

	if (value <= 0) {
		value += 2147483646;
	}

	value = (value * 16807) % 2147483647;
	return value / 2147483647;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
	if (typeof hex !== 'string' || hex.length !== 7 || hex.charAt(0) !== '#') {
		return null;
	}

	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);

	if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
		return null;
	}

	return { r, g, b };
}

function hex2(value: number): string {
	return Math.min(255, Math.max(0, value)).toString(16).padStart(2, '0');
}