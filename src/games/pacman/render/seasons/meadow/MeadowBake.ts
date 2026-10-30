// Static meadow world, ported 1:1 from the owner's CLAUDE_GRID_<SEASON> canvas mock-ups:
// the bake is the same code in every season, the colours and three decorations come from
// the season's theme. World units: one maze tile is MEADOW_TILE wide, the maze's top-left
// corner is the origin; cabins, pond, trees and the stream live in the meadow around it.
import type { GridMatrix } from '../../../config/gridConfig';
import { isTeleportToken } from '../../../config/gridConfig';
import { canvasContext, makeCanvas } from '../../common/textures';
import type { BakeKit, MeadowBakeTheme } from './MeadowTheme';

export const MEADOW_TILE = 24;

const T = MEADOW_TILE;
const LAIR: ReadonlySet<string> = new Set(['LT', 'BY', 'IY', 'PY', 'CE', 'DB']);

type Rng = () => number;

export type MeadowDecorKind =
	'cabin' | 'pond' | 'landmark' | 'lamp' | 'bridge' | 'tree' | 'rock' | 'bush' | 'fl';

export interface MeadowDecor {
	k: MeadowDecorKind;
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

/** Seeded per-tile generator (Park–Miller), identical to the mock-ups' `hs`. */
export function tileRandom(a: number, b: number): Rng {
	let s = (((a + 50) * 7919 + (b + 50) * 104729) % 2147483646) + 1;
	return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Stream centre line (world y for a world x). */
export function streamY(rows: number, x: number): number {
	return (rows + 4.7) * T + Math.sin(x / (9 * T)) * 2.5 * T + Math.sin(x / (3.7 * T) + 1) * 0.6 * T;
}

const decorCache = new Map<string, MeadowDecor[]>();

/**
 * Fixed landmarks plus seeded scatter, sorted back to front. Shared with the live layer.
 * The landmarks' keep-out radii differ per season and shift the scatter, as in the mock-ups.
 */
export function meadowDecor(
	rows: number,
	cols: number,
	landmarkEx: readonly [number, number]
): MeadowDecor[] {
	const cacheKey = `${rows}x${cols}:${landmarkEx[0]},${landmarkEx[1]}`;
	const cached = decorCache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const R = rows;
	const C = cols;
	const TY = 12.5 * T;
	let s = 91;
	const fixed: MeadowDecor[] = [
		{ k: 'cabin', x: -8.5, y: 7, w: 7, h: 5, ex: 4.2 },
		{ k: 'cabin', x: 33.5, y: 19, w: 7, h: 5, ex: 4.2 },
		{ k: 'cabin', x: 23.5, y: -5, w: 6, h: 4.4, ex: 3.8 },
		{ k: 'pond', x: 1.5, y: -4.5, rx: 3.6, ry: 2.4, ex: 4.2 },
		{ k: 'landmark', x: -3.6, y: 3.2, r: 0.8, ex: landmarkEx[0] },
		{ k: 'landmark', x: 28.6, y: 23.5, r: 0.7, ex: landmarkEx[1] },
		{ k: 'lamp', x: -2, y: -2, ex: 1 },
		{ k: 'lamp', x: 27, y: -2, ex: 1 },
		{ k: 'lamp', x: -2, y: 28, ex: 1 },
		{ k: 'lamp', x: 27, y: 28, ex: 1 }
	];
	const P: MeadowDecor[] = fixed.map((o) => {
		const q: MeadowDecor = { ...o, x: o.x * T, y: o.y * T };
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
		k: MeadowDecorKind,
		n: number,
		dist: number,
		m: number,
		f: () => Partial<MeadowDecor>
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
 * per world unit: meadow, stream, decorations, path cells, lair, portals, walls and tree
 * crowns, faded into the background colour at the edge of the world.
 */
export function bakeMeadow(
	S: GridMatrix,
	P: MeadowBakeTheme,
	x0: number,
	y0: number,
	w: number,
	h: number,
	RS: number
): HTMLCanvasElement {
	const R = S.length;
	const C = S[0].length;
	const BG = P.bg;
	const DEC = meadowDecor(R, C, P.landmark.ex);
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
	const shade = (alpha: number) => `rgba(${P.shadow},${alpha})`;
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
	const kit: BakeKit = { b, rnd, rr, pick, blob, fl5, sph, lin, shade };

	/* ground: one meadow for the whole screen */
	const q = b.createRadialGradient((C * T) / 2, (R * T) / 2, 0, (C * T) / 2, (R * T) / 2, 38 * T);
	q.addColorStop(0, P.groundCenter);
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
		g.addColorStop(0, d ? P.groundBlobs[0] : P.groundBlobs[1]);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		b.fillStyle = g;
		b.fillRect(x - r, y - r, 2 * r, 2 * r);
	}
	for (let i = 0; i < A / 1100; i++) {
		b.strokeStyle = pick(P.grass);
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
		b.strokeStyle = P.curls;
		b.lineWidth = 1.4;
		b.beginPath();
		b.moveTo(x, y);
		b.quadraticCurveTo(x + L / 2, y - rr(2, 6), x + L, y);
		b.stroke();
	}

	/* stream */
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
			[40, P.stream[0]],
			[32, P.stream[1]],
			[27, P.stream[2]],
			[13, P.stream[3]]
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
			P.flowerPatch(kit, o);
		} else if (o.k === 'bush') {
			blob(o.x + 3, o.y + 4, r, r * 0.7, shade(0.3), 0);
			for (let i = 0; i < 4; i++) {
				const px = o.x + rr(-0.5, 0.5) * r;
				const py = o.y + rr(-0.4, 0.4) * r;
				const g = b.createRadialGradient(px - 2, py - 2, 1, px, py, r * 0.7);
				g.addColorStop(0, P.bush[0]);
				g.addColorStop(1, P.bush[1]);
				b.fillStyle = g;
				b.beginPath();
				b.arc(px, py, r * 0.7, 0, 7);
				b.fill();
			}
		} else if (o.k === 'pond') {
			const rx = o.rx ?? 0;
			const ry = o.ry ?? 0;
			blob(o.x + 3, o.y + 4, rx * 1.05, ry * 1.05, shade(0.25), 0);
			blob(o.x, o.y, rx * 1.1, ry * 1.12, P.pond.sand, 0);
			b.fillStyle = lin(o.x - rx, o.y - ry, o.x + rx, o.y + ry, P.pond.water[0], P.pond.water[1]);
			b.beginPath();
			b.ellipse(o.x, o.y, rx, ry, 0, 0, 7);
			b.fill();
			b.strokeStyle = P.pond.rim;
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
			blob(o.x - rx * 0.35, o.y - ry * 0.4, rx * 0.3, ry * 0.1, P.pond.highlight, -0.3);
			P.pondExtras?.(kit, o);
			for (let i = 0; i < 9; i++) {
				const a = i * 0.7 + rnd() * 0.4;
				blob(
					o.x + Math.cos(a) * rx * 1.05,
					o.y + Math.sin(a) * ry * 1.07,
					rr(3, 5),
					rr(2, 3.4),
					P.pond.stones
				);
			}
		} else if (o.k === 'landmark') {
			P.landmark.draw(kit, o);
		} else if (o.k === 'lamp') {
			blob(o.x + 2, o.y + 3, 5, 3.5, shade(0.35), 0);
			sph(o.x, o.y, 4.2, '#7b7268', '#2f2a27');
			sph(o.x, o.y, 2.6, '#fff6cf', '#ffc561');
			blob(o.x - 2.6, o.y - 3, 2.4, 1.2, '#ffffff', 0);
		} else if (o.k === 'bridge') {
			const bx = o.x - 26;
			const by = o.y - 34;
			b.fillStyle = shade(0.35);
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
				blob(px + 3, py + 1, 2.8, 1.6, P.bridge.caps, 0);
			}
			blob(bx + 26, by + 20, 7, 2.6, P.bridge.middle, 0.2);
		} else if (o.k === 'cabin') {
			const ow = o.w ?? 0;
			const oh = o.h ?? 0;
			const X = o.x - ow / 2;
			const Y = o.y - oh / 2;
			b.fillStyle = shade(0.3);
			rp(X + 6, Y + 8, ow, oh, [4, 4, 4, 4]);
			b.fill();
			b.save();
			rp(X, Y, ow, oh, [4, 4, 4, 4]);
			b.clip();
			b.fillStyle = lin(X, Y, X, o.y, P.cabin.walls[0], P.cabin.walls[1]);
			b.fillRect(X, Y, ow, oh / 2);
			b.fillStyle = lin(X, o.y, X, Y + oh, P.cabin.walls[2], P.cabin.walls[3]);
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
				blob(X + rnd() * ow, Y + rnd() * oh, rr(8, 18), rr(4, 8), P.cabin.roofBlobs);
			}
			b.restore();
			b.lineCap = 'round';
			b.strokeStyle = P.cabin.ridge;
			b.lineWidth = 4;
			b.beginPath();
			b.moveTo(X + 3, o.y);
			b.lineTo(X + ow - 3, o.y);
			b.stroke();
			b.strokeStyle = P.cabin.ridgeShadow;
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
			b.fillStyle = shade(0.35);
			b.fillRect(cx - 2, cy - 1, 12, 12);
			b.fillStyle = '#8c8179';
			b.fillRect(cx - 6, cy - 6, 12, 12);
			b.fillStyle = '#2b2523';
			b.fillRect(cx - 3.5, cy - 3.5, 7, 7);
			blob(cx - 4, cy - 5, 3, 1.5, P.cabin.chimneyCap, 0);
		} else if (o.k === 'rock') {
			blob(o.x + 3, o.y + 5, r * 1.1, r * 0.7, shade(0.35), 0);
			b.fillStyle = lin(o.x - r, o.y - r, o.x + r, o.y + r, P.rock[0], P.rock[1]);
			b.beginPath();
			b.ellipse(o.x, o.y, r, r * 0.75, 0, 0, 7);
			b.fill();
			blob(o.x - r * 0.3, o.y - r * 0.35, r * 0.6, r * 0.28, P.rock[2], 0);
			blob(o.x + r * 0.4, o.y - r * 0.2, r * 0.25, r * 0.15, P.rock[3], 0);
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
				b.fillStyle = P.lair.base;
				b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
				for (let i = 0; i < 2; i++) {
					for (let j = 0; j < 2; j++) {
						b.fillStyle = P.lair.tiles[(k() * 3) | 0];
						rp(x + (i * T) / 2 + 1, y + (j * T) / 2 + 1, T / 2 - 2, T / 2 - 2, [3, 3, 3, 3]);
						b.fill();
					}
				}
				blob(x + k() * T, y + k() * T, 3, 1.4, 'rgba(255,255,255,.9)', 0);
				continue;
			}
			b.fillStyle = P.floor.tiles[(k() * 3) | 0];
			b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
			for (let i = 0; i < 3; i++) {
				blob(
					x + k() * T,
					y + k() * T,
					0.6 + k() * 1.4,
					0.5 + k(),
					P.floor.specks[(k() * 3) | 0],
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
				blob(xx, yy, 11 - 5 * u + rr(0, 2), 10 - 4 * u, P.portal.trail(a));
			}
		}
		for (let i = 0; i < 260; i++) {
			const u = rnd();
			const xx = px + dir * u * L;
			const yy = py + Math.sin(u * 6 + dir) * 5 * u + (rnd() < 0.5 ? 1 : -1) * (rr(9, 14) - 5 * u);
			if (u > 0.1 && vis(xx, yy, 10)) {
				b.strokeStyle = pick(P.portal.grass);
				b.lineWidth = 1.2;
				b.beginPath();
				b.moveTo(xx, yy);
				b.lineTo(xx + rr(-3, 3), yy - rr(3, 7));
				b.stroke();
			}
		}
		blob(px + 1.5, py + 2, 10, 9.5, shade(0.38), 0);
		b.fillStyle = lin(x, y, x + T, y + T, P.portal.plate[0], P.portal.plate[1]);
		rp(x + 1.5, y + 1.5, T - 3, T - 3, [6, 6, 6, 6]);
		b.fill();
		b.strokeStyle = 'rgba(255,255,255,.55)';
		b.lineWidth = 1;
		rp(x + 2.5, y + 2.5, T - 5, T - 5, [5, 5, 5, 5]);
		b.stroke();
		const q2 = b.createRadialGradient(px, py, 1, px, py, 8.5);
		q2.addColorStop(0, P.portal.core[0]);
		q2.addColorStop(0.45, P.portal.core[1]);
		q2.addColorStop(1, P.portal.core[2]);
		b.fillStyle = q2;
		b.beginPath();
		b.arc(px, py, 8.5, 0, 7);
		b.fill();
		b.strokeStyle = P.portal.ring;
		b.lineWidth = 1.2;
		b.stroke();
		for (const [dx, dy] of [
			[5, 5],
			[T - 5, 5],
			[5, T - 5],
			[T - 5, T - 5]
		]) {
			blob(x + dx, y + dy, 1.5, 1.2, P.portal.corners, 0);
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
	const W = P.wall;
	for (const [r, c] of WL) {
		for (const [dr, dc] of SIDES) {
			const n = S[r + dr] && S[r + dr][c + dc];
			if (!n || n === 'ES' || n === 'WL') {
				continue;
			}
			b.fillStyle = LAIR.has(n) ? P.lair.base : P.floor.tiles[0];
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
	b.shadowColor = W.shadow;
	b.shadowBlur = 7 * RS;
	b.shadowOffsetX = 2 * RS;
	b.shadowOffsetY = 3 * RS;
	b.fillStyle = W.base;
	for (const [r, c] of WL) {
		wsh(r, c, 0, -0.4, 8, false);
		b.fill();
	}
	b.restore();
	b.fillStyle = W.base;
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
			? lin(x, y, x + T, y + T, W.moss[0], W.moss[1])
			: lin(x, y, x + T, y + T, W.top[(k() * 3) | 0], W.bottom[(k() * 3) | 0]);
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
					W.mossSpecks[(k() * 3) | 0],
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
					k() < 0.5 ? W.specks[0] : W.specks[1],
					k() * 3
				);
			}
			b.strokeStyle = W.crack;
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(x + 4 + k() * (T - 8), y);
			b.lineTo(x + 4 + k() * (T - 8), y + T * 0.6);
			b.lineTo(x + 4 + k() * (T - 8), y + T);
			b.stroke();
			const o1 = (r + c) & 1;
			b.strokeStyle = W.joints;
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
				blob(
					x + k() * T * 0.7 + 3,
					y + k() * T * 0.55 + 3,
					5 + k() * 4,
					3 + k() * 2.5,
					W.drifts[0]
				);
				blob(x + k() * T * 0.8, y + k() * T * 0.6, 3 + k() * 3, 1.5 + k() * 1.5, W.drifts[1]);
			}
		}
		b.strokeStyle = W.light;
		b.lineWidth = 2;
		b.save();
		b.translate(-1.2, -1.2);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.stroke();
		b.restore();
		b.strokeStyle = W.dark;
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
				blob(px + k() * 6 - 3, py + k() * 5 - 2.5, 1.8, 1.8, W.flowers[(k() * 3) | 0], 0);
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
				b.strokeStyle = P.edgeGrass[(k() * 3) | 0];
				b.lineWidth = 1.2;
				b.beginPath();
				b.moveTo(x, y);
				b.lineTo(x + dc * k() * 4 + (k() - 0.5) * 3, y + dr * k() * 4 - 2 - k() * 3);
				b.stroke();
			}
		}
	}

	/* trees: top-down crowns, drawn last so they overhang the meadow */
	const TR = P.trees;
	for (const o of DEC) {
		const r = o.r ?? 0;
		if (o.k !== 'tree' || !vis(o.x, o.y, r * 2)) {
			continue;
		}
		const k = tileRandom(o.s ?? 0, 7);
		const pal = o.pk ? TR.accent : TR.plain;
		blob(o.x + r * 0.3, o.y + r * 0.4, r * 1.3, r, shade(0.34), 0);
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
			// same order of draws from k() as the mock-up's argument list: rx, ry, colour
			const rx = 1.2 + k() * 1.4;
			const ry = 1 + k();
			const dots = o.pk ? TR.accentDots : TR.plainDots;
			const light = o.pk ? k() < 0.6 : k() < 0.5;
			blob(
				o.x + Math.cos(a) * d - r * 0.1,
				o.y + Math.sin(a) * d - r * 0.1,
				rx,
				ry,
				light ? dots[0] : dots[1],
				0
			);
		}
		for (let i = 0; i < 8; i++) {
			blob(o.x + rr(0.4, 1.9) * r, o.y + rr(0.2, 1.7) * r, rr(3, 6), rr(1.5, 3), TR.drifts);
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
