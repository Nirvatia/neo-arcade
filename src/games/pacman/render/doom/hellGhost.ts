import type { DoomDirection } from '../../logic/doom/DoomGraph';

/**
 * Shared drawing for the hell's ghost demons (the boss Blinky and its imps): the ghost
 * outline, horns, eyes that look where the body is heading, and the heading chevron.
 * Everything is sized from `r`, half the drawn extent, so a body stays inside its tile.
 */

const TAU = Math.PI * 2;

export function dirAngle(dir: DoomDirection | null): number {
	if (dir === 'UP') return -Math.PI / 2;
	if (dir === 'DOWN') return Math.PI / 2;
	if (dir === 'LEFT') return Math.PI;
	return 0;
}

export function glow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	rgb: string,
	a: number
): void {
	if (a <= 0 || r <= 0) {
		return;
	}
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${Math.min(1, a)})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Seeded 0..1 noise, stable per (i, k). */
export function noise(i: number, k: number): number {
	const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
	return v - Math.floor(v);
}

export interface GhostShape {
	/** Half-width of the body. */
	readonly w: number;
	/** Dome centre (the dome's radius is `w`). */
	readonly domeY: number;
	/** Bottom line of the skirt. */
	readonly hem: number;
	/** Number of skirt feet. */
	readonly feet: number;
	/** 0: the round arcade skirt; 1: ragged, torn tatters. */
	readonly torn: number;
	readonly seed: number;
}

/**
 * Ghost outline around (x, y): a dome on top, straight sides and a skirt of feet that
 * ripple with time (the arcade ghost's two-frame wiggle, smoothed).
 */
export function ghostPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	shape: GhostShape,
	t: number
): void {
	const { w, domeY, hem, feet, torn, seed } = shape;
	const foot = (hem - domeY) * 0.22;
	ctx.beginPath();
	ctx.moveTo(x - w, y + domeY);
	ctx.arc(x, y + domeY, w, Math.PI, 0);
	ctx.lineTo(x + w, y + hem);
	const n = feet * 2;
	for (let i = 1; i <= n; i += 1) {
		const u = i / n;
		const px = x + w - u * 2 * w;
		const up = i % 2 === 1;
		const wiggle = Math.sin(t * 9 + i * Math.PI) * 0.35;
		const rag = torn * (noise(seed, i) - 0.3) * foot * 1.4;
		const py = y + hem - (up ? foot * (0.75 + wiggle) + rag : -rag * 0.5);
		const cx = px + w / n;
		ctx.quadraticCurveTo(cx, y + hem + (up ? foot * 0.25 : -foot * 0.1), px, py);
	}
	ctx.closePath();
}

export interface HornStyle {
	/** Horn length relative to the body half-width. */
	readonly length: number;
	/** Base thickness relative to the body half-width. */
	readonly thick: number;
	readonly dark: string;
	readonly light: string;
	/** Glowing tips (rgb) or null. */
	readonly ember: string | null;
	/** Extra outward curl. */
	readonly curl: number;
}

/**
 * A pair of devil horns growing from the dome at angle `at` from the top (radians): thick
 * at the root, sweeping outwards and hooking up to a point.
 */
export function drawHorns(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	shape: GhostShape,
	at: number,
	style: HornStyle,
	pulse: number
): void {
	const { w, domeY } = shape;
	const n = 8;
	for (const side of [-1, 1]) {
		const a = -Math.PI / 2 + side * at;
		const bx = x + Math.cos(a) * w * 0.86;
		const by = y + domeY + Math.sin(a) * w * 0.86;
		const len = w * style.length;
		// centre line: out to the side, then up
		const c1x = bx + side * len * (0.75 + style.curl * 0.3);
		const c1y = by - len * 0.05;
		const tx = bx + side * len * (0.55 + style.curl * 0.25);
		const ty = by - len * 0.95;
		const left: Array<[number, number]> = [];
		const right: Array<[number, number]> = [];
		for (let i = 0; i <= n; i += 1) {
			const u = i / n;
			const px = (1 - u) * (1 - u) * bx + 2 * u * (1 - u) * c1x + u * u * tx;
			const py = (1 - u) * (1 - u) * by + 2 * u * (1 - u) * c1y + u * u * ty;
			const dx = 2 * (1 - u) * (c1x - bx) + 2 * u * (tx - c1x);
			const dy = 2 * (1 - u) * (c1y - by) + 2 * u * (ty - c1y);
			const l = Math.hypot(dx, dy) || 1;
			const half = w * style.thick * (1 - u) ** 1.2;
			left.push([px - (dy / l) * half, py + (dx / l) * half]);
			right.push([px + (dy / l) * half, py - (dx / l) * half]);
		}
		const g = ctx.createLinearGradient(bx, by, tx, ty);
		g.addColorStop(0, style.dark);
		g.addColorStop(0.55, style.dark);
		g.addColorStop(1, style.light);
		ctx.fillStyle = g;
		ctx.beginPath();
		left.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
		for (let i = right.length - 1; i >= 0; i -= 1) {
			ctx.lineTo(right[i][0], right[i][1]);
		}
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = 'rgba(0,0,0,.6)';
		ctx.lineWidth = Math.max(0.6, w * 0.035);
		ctx.stroke();
		if (style.ember) {
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			glow(ctx, tx, ty, w * 0.2, style.ember, 0.45 + 0.4 * pulse);
			ctx.restore();
		}
	}
}

export interface EyeStyle {
	readonly sclera: string;
	readonly pupil: string;
	/** Glow around the eyes (rgb) or null. */
	readonly glow: string | null;
	/** Angry brows over the eyes. */
	readonly brows: boolean;
}

/**
 * Two eyes looking along `look` (radians): the pupils shift toward the heading, the way
 * arcade ghosts show where they go. `open` 0 closes them, `daze` turns them into spirals.
 */
export function drawEyes(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	look: number,
	style: EyeStyle,
	open: number,
	daze: boolean,
	t: number
): void {
	const ex = w * 0.42;
	const ey = -w * 0.18;
	const rx = w * 0.3;
	const ry = w * 0.36;
	const lx = Math.cos(look);
	const ly = Math.sin(look);
	for (const side of [-1, 1]) {
		const cx = x + side * ex + lx * w * 0.06;
		const cy = y + ey + ly * w * 0.06;
		if (style.glow && open > 0.05 && !daze) {
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			glow(ctx, cx, cy, rx * 1.8, style.glow, 0.55);
			ctx.restore();
		}
		if (open <= 0.05) {
			ctx.strokeStyle = 'rgba(10,0,0,.85)';
			ctx.lineWidth = Math.max(1, w * 0.07);
			ctx.beginPath();
			ctx.moveTo(cx - rx, cy);
			ctx.quadraticCurveTo(cx, cy + ry * 0.4, cx + rx, cy);
			ctx.stroke();
			continue;
		}
		ctx.fillStyle = style.sclera;
		ctx.beginPath();
		ctx.ellipse(cx, cy, rx, ry * open, 0, 0, TAU);
		ctx.fill();
		if (daze) {
			ctx.strokeStyle = style.pupil;
			ctx.lineWidth = Math.max(0.8, w * 0.05);
			ctx.beginPath();
			for (let i = 0; i <= 18; i += 1) {
				const a = side * (t * 7 + i * 0.6);
				const d = (i / 18) * rx * 0.8;
				const px = cx + Math.cos(a) * d;
				const py = cy + Math.sin(a) * d * open;
				if (i === 0) {
					ctx.moveTo(px, py);
				} else {
					ctx.lineTo(px, py);
				}
			}
			ctx.stroke();
		} else {
			// pupils pushed to the edge of the eye in the heading direction
			ctx.fillStyle = style.pupil;
			ctx.beginPath();
			ctx.ellipse(
				cx + lx * rx * 0.48,
				cy + ly * ry * 0.48 * open,
				rx * 0.42,
				ry * 0.46 * open,
				0,
				0,
				TAU
			);
			ctx.fill();
		}
		if (style.brows) {
			ctx.strokeStyle = 'rgba(15,0,0,.95)';
			ctx.lineWidth = Math.max(1, w * 0.09);
			ctx.lineCap = 'round';
			ctx.beginPath();
			// outer end high, inner end low: a scowl
			ctx.moveTo(cx + side * rx * 1.05, cy - ry * 1.2);
			ctx.lineTo(cx - side * rx * 0.9, cy - ry * 0.55);
			ctx.stroke();
		}
	}
}

/**
 * The heading chevron, the shared direction rule of the hell: a small arrow on the tile's
 * leading edge. `size` is the tile size, (x, y) the tile centre.
 */
export function drawHeading(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	heading: number,
	rgb: string,
	alpha: number
): void {
	if (alpha <= 0.01) {
		return;
	}
	const d = size * 0.44;
	const a = size * 0.09;
	ctx.save();
	ctx.translate(x + Math.cos(heading) * d, y + Math.sin(heading) * d);
	ctx.rotate(heading);
	ctx.globalCompositeOperation = 'lighter';
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = `rgb(${rgb})`;
	ctx.lineWidth = Math.max(1, size * 0.045);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(-a, -a * 1.1);
	ctx.lineTo(0, 0);
	ctx.lineTo(-a, a * 1.1);
	ctx.stroke();
	ctx.restore();
}
