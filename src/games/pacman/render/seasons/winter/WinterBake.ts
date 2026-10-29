// Static winter world, ported 1:1 from the owner's CLAUDE_GRID_WINTER canvas mock-up.
// World units: one maze tile is WINTER_TILE wide, the maze's top-left corner is the origin;
// cabins, pond, trees and the frozen stream live in the meadow around it.
import type { GridMatrix } from '../../../config/gridConfig';
import { isTeleportToken } from '../../../config/gridConfig';
import { canvasContext, makeCanvas } from '../../common/textures';

export const WINTER_TILE = 24;
export const WINTER_BG = '#c9d8e8';

const T = WINTER_TILE;
const BG = WINTER_BG;
const LAIR: ReadonlySet<string> = new Set(['LT', 'BY', 'IY', 'PY', 'CE', 'DB']);

type Rng = () => number;

export type WinterDecorKind =
	'cabin' | 'pond' | 'snowman' | 'lamp' | 'bridge' | 'tree' | 'rock' | 'bush' | 'fl';

export interface WinterDecor {
	k: WinterDecorKind;
	x: number;
	y: number;
	w?: number;
	h?: number;
	rx?: number;
	ry?: number;
	r?: number;
	ex?: number;
	pk?: boolean;
	s?: number;
	n?: number;
	c?: number;
}

/** Seeded per-tile generator (Park–Miller), identical to the mock-up's `hs`. */
export function tileRandom(a: number, b: number): Rng {
	let s = (((a + 50) * 7919 + (b + 50) * 104729) % 2147483646) + 1;
	return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Frozen stream centre line (world y for a world x). */
export function streamY(rows: number, x: number): number {
	return (rows + 4.7) * T + Math.sin(x / (9 * T)) * 2.5 * T + Math.sin(x / (3.7 * T) + 1) * 0.6 * T;
}

const decorCache = new Map<string, WinterDecor[]>();

/** Fixed landmarks plus seeded scatter, sorted back to front. Shared with the live layer. */
export function winterDecor(rows: number, cols: number): WinterDecor[] {
	const cacheKey = `${rows}x${cols}`;
	const cached = decorCache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const R = rows;
	const C = cols;
	const TY = 12.5 * T;
	let s = 91;
	const fixed: WinterDecor[] = [
		{ k: 'cabin', x: -8.5, y: 7, w: 7, h: 5, ex: 4.2 },
		{ k: 'cabin', x: 33.5, y: 19, w: 7, h: 5, ex: 4.2 },
		{ k: 'cabin', x: 23.5, y: -5, w: 6, h: 4.4, ex: 3.8 },
		{ k: 'pond', x: 1.5, y: -4.5, rx: 3.6, ry: 2.4, ex: 4.2 },
		{ k: 'snowman', x: -3.6, y: 3.2, r: 0.8, ex: 1.8 },
		{ k: 'snowman', x: 28.6, y: 23.5, r: 0.7, ex: 1.6 },
		{ k: 'lamp', x: -2, y: -2, ex: 1 },
		{ k: 'lamp', x: 27, y: -2, ex: 1 },
		{ k: 'lamp', x: -2, y: 28, ex: 1 },
		{ k: 'lamp', x: 27, y: 28, ex: 1 }
	];
	const P: WinterDecor[] = fixed.map((o) => {
		const q: WinterDecor = { ...o, x: o.x * T, y: o.y * T };
		for (const key of ['w', 'h', 'rx', 'ry', 'r', 'ex'] as const) {
			const v = o[key];
			if (v !== undefined) {
				q[key] = v * T;
			}
		}
		return q;
	});
	P.push({ k: 'bridge', x: 12.5 * T, y: streamY(R, 12.5 * T), ex: 2 * T });
	const g = () => (s = (s * 16807) % 2147483647) / 2147483647;
	const free = (x: number, y: number, m: number) =>
		!(x > -m && x < C * T + m && y > -m && y < R * T + m) &&
		Math.abs(y - streamY(R, x)) > 3.6 * T &&
		!(Math.abs(y - TY) < 2.4 * T && (x < 0 || x > C * T));
	const add = (
		k: WinterDecorKind,
		n: number,
		dist: number,
		m: number,
		f: () => Partial<WinterDecor>
	) => {
		let t = 0;
		let cnt = 0;
		while (cnt < n && t++ < 6000) {
			const x = (-34 + g() * (C + 68)) * T;
			const y = (-25 + g() * (R + 50)) * T;
			if (!free(x, y, m) || P.some((q) => Math.hypot(q.x - x, q.y - y) < dist + (q.ex || 0))) {
				continue;
			}
			P.push({ k, x, y, ...f() });
			cnt++;
		}
	};
	add('tree', 80, 5.5 * T, 4 * T, () => ({
		r: (1.5 + g() * 0.7) * T,
		pk: g() < 0.45,
		s: (g() * 99) | 0
	}));
	add('rock', 28, 3 * T, 3 * T, () => ({ r: (0.5 + g() * 0.4) * T }));
	add('bush', 44, 2.5 * T, 3 * T, () => ({ r: (0.6 + g() * 0.4) * T }));
	add('fl', 110, 2 * T, 2 * T, () => ({ n: 6 + ((g() * 6) | 0), c: g() }));
	P.sort((a, c) => a.y - c.y);
	decorCache.set(cacheKey, P);
	return P;
}

/**
 * Bakes the static world inside the world-space rect (x0, y0, w, h) at RS canvas pixels
 * per world unit: snowy meadow, frozen stream, decorations, path cells, lair, portals,
 * walls and tree crowns, faded into the background colour at the edge of the world.
 */
export function bakeWinterWorld(
	S: GridMatrix,
	x0: number,
	y0: number,
	w: number,
	h: number,
	RS: number
): HTMLCanvasElement {
	const R = S.length;
	const C = S[0].length;
	const DEC = winterDecor(R, C);
	const isW = (r: number, c: number) => !!S[r] && S[r][c] === 'WL';
	const cv = makeCanvas(Math.ceil(w * RS), Math.ceil(h * RS));
	const b = canvasContext(cv);
	b.scale(RS, RS);
	b.translate(-x0, -y0);
	const X1 = x0 + w;
	const Y1 = y0 + h;
	const vis = (x: number, y: number, m = 70) =>
		x > x0 - m && x < X1 + m && y > y0 - m && y < Y1 + m;
	let sd = 11;
	const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
	const rr = (a: number, c: number) => a + rnd() * (c - a);
	const pick = <V>(a: readonly V[]): V => a[(rnd() * a.length) | 0];
	const lin = (a: number, c: number, d: number, e: number, f: string, g: string) => {
		const q = b.createLinearGradient(a, c, d, e);
		q.addColorStop(0, f);
		q.addColorStop(1, g);
		return q;
	};
	const blob = (x: number, y: number, rx: number, ry: number, col: string, rot?: number) => {
		b.fillStyle = col;
		b.beginPath();
		b.ellipse(x, y, rx, ry, rot ?? rnd() * 3, 0, 7);
		b.fill();
	};
	const rp = (
		x: number,
		y: number,
		w2: number,
		h2: number,
		[a, c, d, e]: readonly [number, number, number, number]
	) => {
		b.beginPath();
		b.moveTo(x + a, y);
		b.lineTo(x + w2 - c, y);
		b.arcTo(x + w2, y, x + w2, y + c, c);
		b.lineTo(x + w2, y + h2 - d);
		b.arcTo(x + w2, y + h2, x + w2 - d, y + h2, d);
		b.lineTo(x + e, y + h2);
		b.arcTo(x, y + h2, x, y + h2 - e, e);
		b.lineTo(x, y + a);
		b.arcTo(x, y, x + a, y, a);
	};
	const fl5 = (x: number, y: number, r: number, col: string, mid: string) => {
		for (let k = 0; k < 5; k++) {
			const a = k * 1.2566 + 0.3;
			blob(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.6, r * 0.6, col, 0);
		}
		blob(x, y, r * 0.38, r * 0.38, mid, 0);
	};
	const sph = (x: number, y: number, r: number, c0: string, c1: string) => {
		const g = b.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.5, x, y, r);
		g.addColorStop(0, c0);
		g.addColorStop(1, c1);
		b.fillStyle = g;
		b.beginPath();
		b.arc(x, y, r, 0, 7);
		b.fill();
	};

	/* ground: one meadow for the whole screen */
	const q = b.createRadialGradient((C * T) / 2, (R * T) / 2, 0, (C * T) / 2, (R * T) / 2, 38 * T);
	q.addColorStop(0, '#f2f7fc');
	q.addColorStop(1, BG);
	b.fillStyle = q;
	b.fillRect(x0, y0, w, h);
	const A = w * h;
	for (let i = 0; i < A / 50000; i++) {
		const x = x0 + rnd() * w;
		const y = y0 + rnd() * h;
		const r = rr(70, 130);
		const g = b.createRadialGradient(x, y, 0, x, y, r);
		const d = i % 2;
		g.addColorStop(0, d ? 'rgba(255,255,255,.4)' : 'rgba(90,120,170,.06)');
		g.addColorStop(1, 'rgba(0,0,0,0)');
		b.fillStyle = g;
		b.fillRect(x - r, y - r, 2 * r, 2 * r);
	}
	for (let i = 0; i < A / 1100; i++) {
		b.strokeStyle = pick(['#9aa888aa', '#b8c0a488', '#6f7f66aa', '#ffffff66']);
		const x = x0 + rnd() * w;
		const y = y0 + rnd() * h;
		b.lineWidth = 1;
		b.beginPath();
		b.moveTo(x, y);
		b.lineTo(x + rr(-2, 2), y - rr(3, 7));
		b.stroke();
	}
	for (let i = 0; i < A / 8000; i++) {
		const x = x0 + rnd() * w;
		const y = y0 + rnd() * h;
		const L = rr(14, 40);
		b.strokeStyle = 'rgba(150,175,215,.28)';
		b.lineWidth = 1.4;
		b.beginPath();
		b.moveTo(x, y);
		b.quadraticCurveTo(x + L / 2, y - rr(2, 6), x + L, y);
		b.stroke();
	}

	/* frozen stream */
	const sy = (x: number) => streamY(R, x);
	if (Y1 > sy(x0) - 40 && y0 < sy(x0) + 60) {
		const line = () => {
			b.beginPath();
			for (let x = x0 - 20; x <= X1 + 20; x += 12) {
				if (x === x0 - 20) {
					b.moveTo(x, sy(x));
				} else {
					b.lineTo(x, sy(x));
				}
			}
		};
		b.lineCap = b.lineJoin = 'round';
		for (const [lw, c] of [
			[40, 'rgba(70,95,130,.35)'],
			[32, '#dbe9f3'],
			[27, '#b4d6e8'],
			[13, 'rgba(150,200,225,.6)']
		] as const) {
			b.lineWidth = lw;
			b.strokeStyle = c;
			line();
			b.stroke();
		}
		for (let x = x0; x < X1; x += 16) {
			const y = sy(x) + rr(-9, 9);
			b.strokeStyle = 'rgba(255,255,255,.4)';
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(x, y);
			b.lineTo(x + rr(6, 14), y);
			b.stroke();
		}
	}

	/* meadow life */
	for (const o of DEC) {
		if (!vis(o.x, o.y, 60 + (o.w || (o.rx || 0) * 2))) {
			continue;
		}
		const r = o.r ?? 0;
		if (o.k === 'fl') {
			const c = o.c ?? 0;
			const cl =
				c < 0.3
					? ['#ffffff', '#e8f2fb']
					: c < 0.55
						? ['#c9dcef', '#e8f2fb']
						: c < 0.8
							? ['#d9333a', '#ff6b6b']
							: ['#f4d4d8', '#ffffff'];
			for (let i = 0; i < (o.n ?? 0); i++) {
				fl5(o.x + rr(-16, 16), o.y + rr(-12, 12), rr(2, 3), pick(cl), '#ffcf4d');
			}
		} else if (o.k === 'bush') {
			blob(o.x + 3, o.y + 4, r, r * 0.7, 'rgba(55,75,115,.3)', 0);
			for (let i = 0; i < 4; i++) {
				const px = o.x + rr(-0.5, 0.5) * r;
				const py = o.y + rr(-0.4, 0.4) * r;
				const g = b.createRadialGradient(px - 2, py - 2, 1, px, py, r * 0.7);
				g.addColorStop(0, '#ffffff');
				g.addColorStop(1, '#a9bfd6');
				b.fillStyle = g;
				b.beginPath();
				b.arc(px, py, r * 0.7, 0, 7);
				b.fill();
			}
		} else if (o.k === 'pond') {
			const rx = o.rx ?? 0;
			const ry = o.ry ?? 0;
			blob(o.x + 3, o.y + 4, rx * 1.05, ry * 1.05, 'rgba(55,75,115,.25)', 0);
			blob(o.x, o.y, rx * 1.1, ry * 1.12, '#f4f9fd', 0);
			b.fillStyle = lin(o.x - rx, o.y - ry, o.x + rx, o.y + ry, '#eaf6fd', '#8fc3de');
			b.beginPath();
			b.ellipse(o.x, o.y, rx, ry, 0, 0, 7);
			b.fill();
			b.strokeStyle = 'rgba(60,100,140,.35)';
			b.lineWidth = 1.5;
			b.stroke();
			b.strokeStyle = 'rgba(255,255,255,.8)';
			b.lineWidth = 1;
			for (let i = 0; i < 5; i++) {
				const a = rnd() * 6.28;
				const L = rr(0.3, 0.8);
				b.beginPath();
				b.moveTo(o.x + Math.cos(a) * rx * 0.1, o.y + Math.sin(a) * ry * 0.1);
				b.lineTo(o.x + Math.cos(a + 0.2) * rx * L * 0.6, o.y + Math.sin(a + 0.2) * ry * L);
				b.lineTo(o.x + Math.cos(a - 0.1) * rx * L, o.y + Math.sin(a - 0.1) * ry * L * 1.1);
				b.stroke();
			}
			blob(o.x - rx * 0.35, o.y - ry * 0.4, rx * 0.3, ry * 0.1, 'rgba(255,255,255,.85)', -0.3);
			for (let i = 0; i < 9; i++) {
				const a = i * 0.7 + rnd() * 0.4;
				blob(
					o.x + Math.cos(a) * rx * 1.05,
					o.y + Math.sin(a) * ry * 1.07,
					rr(3, 5),
					rr(2, 3.4),
					'#ffffff'
				);
			}
		} else if (o.k === 'snowman') {
			blob(o.x + r * 0.5, o.y + r * 0.6, r * 1.15, r * 0.8, 'rgba(55,75,115,.32)', 0);
			b.strokeStyle = '#5a4028';
			b.lineWidth = 1.6;
			b.beginPath();
			b.moveTo(o.x - r * 0.9, o.y - r * 0.1);
			b.lineTo(o.x + r * 0.9, o.y + r * 0.1);
			b.stroke();
			sph(o.x, o.y + r * 0.2, r, '#ffffff', '#b4c9de');
			sph(o.x - r * 0.1, o.y - r * 0.55, r * 0.62, '#ffffff', '#bfd2e4');
			b.strokeStyle = '#d9333a';
			b.lineWidth = 2.4;
			b.beginPath();
			b.arc(o.x - r * 0.1, o.y - r * 0.55, r * 0.58, 0.3, 2.9);
			b.stroke();
			blob(o.x - r * 0.1, o.y - r * 0.55, r * 0.34, r * 0.34, '#2b3340', 0);
			blob(o.x - r * 0.1, o.y - r * 0.58, r * 0.2, r * 0.2, '#4a5566', 0);
		} else if (o.k === 'lamp') {
			blob(o.x + 2, o.y + 3, 5, 3.5, 'rgba(50,70,110,.35)', 0);
			sph(o.x, o.y, 4.2, '#7b7268', '#2f2a27');
			sph(o.x, o.y, 2.6, '#fff6cf', '#ffc561');
			blob(o.x - 2.6, o.y - 3, 2.4, 1.2, '#ffffff', 0);
		} else if (o.k === 'bridge') {
			const bx = o.x - 26;
			const by = o.y - 34;
			b.fillStyle = 'rgba(40,55,90,.35)';
			b.fillRect(bx + 4, by + 5, 52, 68);
			for (let yy = by, i = 0; yy < by + 68; yy += 5, i++) {
				b.fillStyle = i % 2 ? '#8c6342' : '#795634';
				b.fillRect(bx + 2, yy, 48, 4.2);
				b.fillStyle = 'rgba(255,230,190,.25)';
				b.fillRect(bx + 2, yy, 48, 0.8);
			}
			b.fillStyle = '#4f3622';
			b.fillRect(bx, by, 4, 68);
			b.fillRect(bx + 48, by, 4, 68);
			for (const [px, py] of [
				[bx - 1, by - 1],
				[bx + 47, by - 1],
				[bx - 1, by + 63],
				[bx + 47, by + 63]
			]) {
				b.fillStyle = '#3a281a';
				b.fillRect(px, py, 6, 6);
				blob(px + 3, py + 1, 2.8, 1.6, '#f4f9fd', 0);
			}
			blob(bx + 26, by + 20, 7, 2.6, 'rgba(255,255,255,.9)', 0.2);
		} else if (o.k === 'cabin') {
			const ow = o.w ?? 0;
			const oh = o.h ?? 0;
			const X = o.x - ow / 2;
			const Y = o.y - oh / 2;
			b.fillStyle = 'rgba(50,70,110,.3)';
			rp(X + 6, Y + 8, ow, oh, [4, 4, 4, 4]);
			b.fill();
			b.save();
			rp(X, Y, ow, oh, [4, 4, 4, 4]);
			b.clip();
			b.fillStyle = lin(X, Y, X, o.y, '#bb6851', '#a65240');
			b.fillRect(X, Y, ow, oh / 2);
			b.fillStyle = lin(X, o.y, X, Y + oh, '#87423b', '#6a342f');
			b.fillRect(X, o.y, ow, oh / 2);
			b.strokeStyle = 'rgba(40,20,20,.22)';
			b.lineWidth = 1;
			for (let r2 = 0; r2 < oh / 6; r2++) {
				b.beginPath();
				b.moveTo(X, Y + r2 * 6);
				b.lineTo(X + ow, Y + r2 * 6);
				for (let xx = X + (r2 % 2) * 5; xx < X + ow; xx += 10) {
					b.moveTo(xx, Y + r2 * 6);
					b.lineTo(xx, Y + r2 * 6 + 6);
				}
				b.stroke();
			}
			for (let i = 0; i < 16; i++) {
				blob(X + rnd() * ow, Y + rnd() * oh, rr(8, 18), rr(4, 8), 'rgba(248,252,255,.93)');
			}
			b.restore();
			b.lineCap = 'round';
			b.strokeStyle = '#f6fafd';
			b.lineWidth = 4;
			b.beginPath();
			b.moveTo(X + 3, o.y);
			b.lineTo(X + ow - 3, o.y);
			b.stroke();
			b.strokeStyle = 'rgba(110,130,160,.45)';
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(X + 3, o.y + 2.8);
			b.lineTo(X + ow - 3, o.y + 2.8);
			b.stroke();
			b.strokeStyle = 'rgba(45,25,25,.5)';
			b.lineWidth = 1.5;
			rp(X, Y, ow, oh, [4, 4, 4, 4]);
			b.stroke();
			const cx = o.x + ow * 0.25;
			const cy = o.y - oh * 0.22;
			b.fillStyle = 'rgba(50,70,110,.35)';
			b.fillRect(cx - 2, cy - 1, 12, 12);
			b.fillStyle = '#8c8179';
			b.fillRect(cx - 6, cy - 6, 12, 12);
			b.fillStyle = '#2b2523';
			b.fillRect(cx - 3.5, cy - 3.5, 7, 7);
			blob(cx - 4, cy - 5, 3, 1.5, '#f4f9fd', 0);
		} else if (o.k === 'rock') {
			blob(o.x + 3, o.y + 5, r * 1.1, r * 0.7, 'rgba(50,70,110,.35)', 0);
			b.fillStyle = lin(o.x - r, o.y - r, o.x + r, o.y + r, '#b9c4d0', '#6f7d8d');
			b.beginPath();
			b.ellipse(o.x, o.y, r, r * 0.75, 0, 0, 7);
			b.fill();
			blob(o.x - r * 0.3, o.y - r * 0.35, r * 0.6, r * 0.28, '#ffffff', 0);
			blob(o.x + r * 0.4, o.y - r * 0.2, r * 0.25, r * 0.15, '#e8f1f9', 0);
		}
	}

	/* path cells, lair floor, gate, portal rings */
	const TP: Array<[number, number, number]> = [];
	for (let r = 0; r < R; r++) {
		for (let c = 0; c < C; c++) {
			const t = S[r][c];
			const x = c * T;
			const y = r * T;
			if (t === 'ES' || t === 'WL' || !vis(x + T / 2, y + T / 2, T)) {
				continue;
			}
			const k = tileRandom(r, c);
			if (LAIR.has(t)) {
				b.fillStyle = '#6a7688';
				b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
				for (let i = 0; i < 2; i++) {
					for (let j = 0; j < 2; j++) {
						b.fillStyle = ['#dbe6f0', '#cfdde9', '#c3d3e2'][(k() * 3) | 0];
						rp(x + (i * T) / 2 + 1, y + (j * T) / 2 + 1, T / 2 - 2, T / 2 - 2, [3, 3, 3, 3]);
						b.fill();
					}
				}
				blob(x + k() * T, y + k() * T, 3, 1.4, 'rgba(255,255,255,.9)', 0);
				continue;
			}
			b.fillStyle = ['#566274', '#515d6f', '#5b6779'][(k() * 3) | 0];
			b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
			for (let i = 0; i < 3; i++) {
				blob(
					x + k() * T,
					y + k() * T,
					0.6 + k() * 1.4,
					0.5 + k(),
					['#6a768a', '#3a4452', '#7a869a'][(k() * 3) | 0],
					k() * 3
				);
			}
			if (t === 'LE') {
				const lf = S[r][c - 1] !== 'LE';
				const rt = S[r][c + 1] !== 'LE';
				b.fillStyle = '#7a5636';
				b.fillRect(x, y + T / 2 - 5, T, 10);
				b.fillStyle = '#a07848';
				for (let i = 0; i < 3; i++) {
					b.fillRect(x, y + T / 2 - 4 + i * 3.3, T, 1.2);
				}
				b.fillStyle = '#4f3622';
				if (lf) {
					b.fillRect(x, y + T / 2 - 6, 4, 12);
				}
				if (rt) {
					b.fillRect(x + T - 4, y + T / 2 - 6, 4, 12);
				}
				if (!lf && !rt) {
					fl5(x + T / 2, y + T / 2 - 5, 2.6, '#d9333a', '#ffffff');
				}
			}
			if (isTeleportToken(t)) {
				TP.push([x, y, c]);
			}
		}
	}

	for (const [x, y, c] of TP) {
		const dir = c < C / 2 ? -1 : 1;
		const L = 11 * T;
		const px = x + T / 2;
		const py = y + T / 2;
		for (let i = 0; i < 240; i++) {
			const u = i / 240;
			const xx = px + dir * u * L;
			const yy = py + Math.sin(u * 6 + dir) * 5 * u + rr(-1.2, 1.2);
			const a = u < 0.1 ? 1 : Math.pow(1 - (u - 0.1) / 0.9, 1.5);
			if (vis(xx, yy, 30)) {
				blob(xx, yy, 11 - 5 * u + rr(0, 2), 10 - 4 * u, `rgba(86,98,116,${a * 0.55})`);
			}
		}
		for (let i = 0; i < 260; i++) {
			const u = rnd();
			const xx = px + dir * u * L;
			const yy = py + Math.sin(u * 6 + dir) * 5 * u + (rnd() < 0.5 ? 1 : -1) * (rr(9, 14) - 5 * u);
			if (u > 0.1 && vis(xx, yy, 10)) {
				b.strokeStyle = pick(['#b9c4a6', '#8a9a7a', '#e8eef2']);
				b.lineWidth = 1.2;
				b.beginPath();
				b.moveTo(xx, yy);
				b.lineTo(xx + rr(-3, 3), yy - rr(3, 7));
				b.stroke();
			}
		}
		blob(px + 1.5, py + 2, 10, 9.5, 'rgba(40,55,85,.38)', 0);
		b.fillStyle = lin(x, y, x + T, y + T, '#aeb9c6', '#6c7a8c');
		rp(x + 1.5, y + 1.5, T - 3, T - 3, [6, 6, 6, 6]);
		b.fill();
		b.strokeStyle = 'rgba(255,255,255,.55)';
		b.lineWidth = 1;
		rp(x + 2.5, y + 2.5, T - 5, T - 5, [5, 5, 5, 5]);
		b.stroke();
		const q2 = b.createRadialGradient(px, py, 1, px, py, 8.5);
		q2.addColorStop(0, '#d8f4ff');
		q2.addColorStop(0.45, '#4f9fd8');
		q2.addColorStop(1, '#1b2d52');
		b.fillStyle = q2;
		b.beginPath();
		b.arc(px, py, 8.5, 0, 7);
		b.fill();
		b.strokeStyle = '#9fe3ff';
		b.lineWidth = 1.2;
		b.stroke();
		for (const [dx, dy] of [
			[5, 5],
			[T - 5, 5],
			[5, T - 5],
			[T - 5, T - 5]
		]) {
			blob(x + dx, y + dy, 1.5, 1.2, '#f4f9fd', 0);
		}
	}

	/* walls: seen strictly from above. A rounded moss bed with loose stone blocks set into it. */
	const WL: Array<[number, number]> = [];
	for (let r = 0; r < R; r++) {
		for (let c = 0; c < C; c++) {
			if (isW(r, c) && vis(c * T + T / 2, r * T + T / 2, T)) {
				WL.push([r, c]);
			}
		}
	}
	const wsh = (r: number, c: number, i: number, j: number, k: number, all: boolean) => {
		const oL = !isW(r, c - 1);
		const oU = !isW(r - 1, c);
		const oR = !isW(r, c + 1);
		const oD = !isW(r + 1, c);
		const L = oL ? i : j;
		const U = oU ? i : j;
		const Rr = oR ? i : j;
		const Dd = oD ? i : j;
		rp(
			c * T + L,
			r * T + U,
			T - L - Rr,
			T - U - Dd,
			all ? [k, k, k, k] : [oU && oL ? k : 0, oU && oR ? k : 0, oD && oR ? k : 0, oD && oL ? k : 0]
		);
	};
	const SIDES = [
		[0, -1],
		[0, 1],
		[-1, 0],
		[1, 0]
	] as const;
	for (const [r, c] of WL) {
		for (const [dr, dc] of SIDES) {
			const n = S[r + dr] && S[r + dr][c + dc];
			if (!n || n === 'ES' || n === 'WL') {
				continue;
			}
			b.fillStyle = LAIR.has(n) ? '#6a7688' : '#566274';
			const x = c * T;
			const y = r * T;
			b.fillRect(
				dc ? (dc > 0 ? x + T / 2 : x) : x,
				dr ? (dr > 0 ? y + T / 2 : y) : y,
				dc ? T / 2 : T,
				dr ? T / 2 : T
			);
		}
	}
	b.save();
	b.shadowColor = 'rgba(30,40,70,.45)';
	b.shadowBlur = 7 * RS;
	b.shadowOffsetX = 2 * RS;
	b.shadowOffsetY = 3 * RS;
	b.fillStyle = '#5d6a62';
	for (const [r, c] of WL) {
		wsh(r, c, 0, -0.4, 8, false);
		b.fill();
	}
	b.restore();
	b.fillStyle = '#5d6a62';
	for (const [r, c] of WL) {
		wsh(r, c, 0, -0.4, 8, false);
		b.fill();
	}
	for (const [r, c] of WL) {
		const k = tileRandom(r, c);
		const v = k();
		const x = c * T;
		const y = r * T;
		const hd = v < 0.08;
		b.save();
		b.fillStyle = hd
			? lin(x, y, x + T, y + T, '#4f7f66', '#2f5a4a')
			: lin(
					x,
					y,
					x + T,
					y + T,
					['#a3afbf', '#a9b0bd', '#9aa8b8'][(k() * 3) | 0],
					['#7a8799', '#838c9a', '#74869a'][(k() * 3) | 0]
				);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.fill();
		b.restore();
		wsh(r, c, 0.6, 0.6, 8, false);
		b.save();
		b.clip();
		if (hd) {
			for (let i = 0; i < 14; i++) {
				blob(
					x + k() * T,
					y + k() * T,
					1.5 + k() * 1.5,
					0.8 + k() * 0.8,
					['#8fb8a2', '#2a4f40', '#e8f2f8'][(k() * 3) | 0],
					k() * 3
				);
			}
		} else {
			for (let i = 0; i < 8; i++) {
				blob(
					x + k() * T,
					y + k() * T,
					0.5 + k(),
					0.4 + k() * 0.6,
					k() < 0.5 ? 'rgba(255,255,255,.4)' : 'rgba(40,55,48,.3)',
					k() * 3
				);
			}
			b.strokeStyle = 'rgba(50,65,58,.22)';
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(x + 4 + k() * (T - 8), y);
			b.lineTo(x + 4 + k() * (T - 8), y + T * 0.6);
			b.lineTo(x + 4 + k() * (T - 8), y + T);
			b.stroke();
			const o1 = (r + c) & 1;
			b.strokeStyle = 'rgba(45,60,72,.17)';
			b.lineWidth = 0.8;
			b.beginPath();
			b.moveTo(x, y + T / 2);
			b.lineTo(x + T, y + T / 2);
			b.moveTo(x + (o1 ? T * 0.34 : T * 0.66), y);
			b.lineTo(x + (o1 ? T * 0.34 : T * 0.66), y + T / 2);
			b.moveTo(x + (o1 ? T * 0.68 : T * 0.32), y + T / 2);
			b.lineTo(x + (o1 ? T * 0.68 : T * 0.32), y + T);
			b.stroke();
			const n = v < 0.3 ? 2 : 1;
			for (let i = 0; i < n; i++) {
				blob(x + k() * T * 0.7 + 3, y + k() * T * 0.55 + 3, 5 + k() * 4, 3 + k() * 2.5, '#f4f9fd');
				blob(x + k() * T * 0.8, y + k() * T * 0.6, 3 + k() * 3, 1.5 + k() * 1.5, '#ffffff');
			}
		}
		b.strokeStyle = 'rgba(255,255,240,.4)';
		b.lineWidth = 2;
		b.save();
		b.translate(-1.2, -1.2);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.stroke();
		b.restore();
		b.strokeStyle = 'rgba(30,45,38,.32)';
		b.save();
		b.translate(1.2, 1.2);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.stroke();
		b.restore();
		b.restore();
		if (v > 0.96) {
			const px = x + 6 + k() * (T - 12);
			const py = y + 6 + k() * (T - 12);
			for (let i = 0; i < 4; i++) {
				blob(
					px + k() * 6 - 3,
					py + k() * 5 - 2.5,
					1.8,
					1.8,
					['#d9333a', '#ff6b6b', '#ffffff'][(k() * 3) | 0],
					0
				);
			}
			blob(px, py, 1, 1, '#ffd45e', 0);
		}
	}
	for (const [r, c] of WL) {
		const k = tileRandom(r + 9, c + 9);
		for (const [dr, dc] of SIDES) {
			const n = S[r + dr] && S[r + dr][c + dc];
			if ((n && n !== 'ES') || k() < 0.45) {
				continue;
			}
			for (let i = 0; i < 4; i++) {
				const t = k();
				const x = c * T + (dc ? (dc > 0 ? T : 0) : t * T);
				const y = r * T + (dr ? (dr > 0 ? T : 0) : t * T);
				b.strokeStyle = ['#b9c4a6', '#8a9a7a', '#e8eef2'][(k() * 3) | 0];
				b.lineWidth = 1.2;
				b.beginPath();
				b.moveTo(x, y);
				b.lineTo(x + dc * k() * 4 + (k() - 0.5) * 3, y + dr * k() * 4 - 2 - k() * 3);
				b.stroke();
			}
		}
	}

	/* trees: top-down snowy crowns, drawn last so they overhang the meadow */
	for (const o of DEC) {
		const r = o.r ?? 0;
		if (o.k !== 'tree' || !vis(o.x, o.y, r * 2)) {
			continue;
		}
		const k = tileRandom(o.s ?? 0, 7);
		const pal = o.pk ? ['#ffffff', '#9fbfae', '#3b6a58'] : ['#f4f9fd', '#b4c8d8', '#5a7a8e'];
		blob(o.x + r * 0.3, o.y + r * 0.4, r * 1.3, r, 'rgba(55,75,115,.34)', 0);
		for (let i = 0; i < 11; i++) {
			const a = i * 0.62 + k() * 2;
			const d = i ? r * (0.3 + k() * 0.45) : 0;
			const px = o.x + Math.cos(a) * d;
			const py = o.y + Math.sin(a) * d;
			const pr = r * (0.36 + k() * 0.2);
			const g = b.createRadialGradient(px - pr * 0.35, py - pr * 0.35, 1, px, py, pr);
			g.addColorStop(0, pal[0]);
			g.addColorStop(0.55, pal[1]);
			g.addColorStop(1, pal[2]);
			b.fillStyle = g;
			b.beginPath();
			b.arc(px, py, pr, 0, 7);
			b.fill();
		}
		for (let i = 0; i < 24; i++) {
			const a = k() * 6.28;
			const d = Math.sqrt(k()) * r * 0.85;
			blob(
				o.x + Math.cos(a) * d - r * 0.1,
				o.y + Math.sin(a) * d - r * 0.1,
				1.2 + k() * 1.4,
				1 + k(),
				o.pk
					? k() < 0.6
						? 'rgba(255,255,255,.85)'
						: 'rgba(40,90,70,.5)'
					: k() < 0.5
						? 'rgba(255,255,255,.8)'
						: 'rgba(70,95,115,.45)',
				0
			);
		}
		for (let i = 0; i < 8; i++) {
			blob(
				o.x + rr(0.4, 1.9) * r,
				o.y + rr(0.2, 1.7) * r,
				rr(3, 6),
				rr(1.5, 3),
				'rgba(255,255,255,.55)'
			);
		}
	}

	/* seamless edge of the world */
	const X0 = -36 * T;
	const X2 = (C + 36) * T;
	const Y0 = -27 * T;
	const Y2 = (R + 27) * T;
	const F = 6 * T;
	b.fillStyle = BG;
	if (x0 < X0) {
		b.fillRect(x0, y0, X0 - x0, h);
	}
	if (X1 > X2) {
		b.fillRect(X2, y0, X1 - X2, h);
	}
	if (y0 < Y0) {
		b.fillRect(x0, y0, w, Y0 - y0);
	}
	if (Y1 > Y2) {
		b.fillRect(x0, Y2, w, Y1 - Y2);
	}
	for (const [a, c, d, e, f, g, i, j] of [
		[X0, 0, X0 + F, 0, X0, y0, F, h],
		[X2, 0, X2 - F, 0, X2 - F, y0, F, h],
		[0, Y0, 0, Y0 + F, x0, Y0, w, F],
		[0, Y2, 0, Y2 - F, x0, Y2 - F, w, F]
	]) {
		const gr = b.createLinearGradient(a, c, d, e);
		gr.addColorStop(0, BG);
		gr.addColorStop(1, BG + '00');
		b.fillStyle = gr;
		b.fillRect(f, g, i, j);
	}
	return cv;
}
