// Live part of the CLAUDE_GRID_WINTER mock-up: camera, the baked world, animated maze
// objects (ice pellets, snow-crystal energizers, portal swirls, stream glints, chimney
// smoke) and the screen-space atmosphere (mist, drifting snow, blizzard, blue night).
import type { GridMatrix } from '../../../config/gridConfig';
import { isTeleportToken } from '../../../config/gridConfig';
import type { GridLayout } from '../../maze/GridView';
import { bakeWinterWorld, streamY, WINTER_BG, WINTER_TILE, winterDecor } from './WinterBake';
import {
	crystalTexture,
	fogTexture,
	glowTexture,
	litTexture,
	pelletTexture,
	ringTexture,
	streakTexture,
	swirlTexture,
	vignetteTexture,
	washTexture
} from './WinterSprites';

const T = WINTER_TILE;
const REBAKE_DELAY_MS = 160;

interface Point {
	readonly x: number;
	readonly y: number;
}

interface Light extends Point {
	readonly r: number;
	readonly tint: number;
	readonly a: number;
	readonly flicker: boolean;
}

interface Flake {
	readonly st: boolean;
	readonly s: number;
	readonly vx: number;
	readonly vy: number;
	readonly ph: number;
	readonly im: HTMLCanvasElement;
	px: number;
	py: number;
}

/** Centred sprite; `size` in the current transform's units. */
function sprite(
	ctx: CanvasRenderingContext2D,
	im: HTMLCanvasElement,
	x: number,
	y: number,
	w: number,
	h: number,
	a = 1,
	rot = 0,
	add = false
): void {
	if (a <= 0.003 || w <= 0 || h <= 0) {
		return;
	}
	ctx.globalAlpha = a > 1 ? 1 : a;
	ctx.globalCompositeOperation = add ? 'lighter' : 'source-over';
	if (rot) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rot);
		ctx.drawImage(im, -w / 2, -h / 2, w, h);
		ctx.restore();
	} else {
		ctx.drawImage(im, x - w / 2, y - h / 2, w, h);
	}
}

export class WinterWorld {
	private readonly S: GridMatrix;
	private readonly R: number;
	private readonly C: number;
	private readonly pellets: Array<Point & { r: number; c: number }> = [];
	private readonly crystals: Array<Point & { r: number; c: number; ph: number }> = [];
	private readonly portals: Array<Point & { i: number; ph: number }> = [];
	private readonly glints: Array<Point & { ph: number }> = [];
	private readonly smoke: Array<{ cx: number; cy: number; u: number; ph: number }> = [];
	private readonly lights: Light[] = [];
	private readonly mist: Array<{ x: number; y: number; w: number; h: number; v: number }>;
	private readonly snow: Array<{
		a: number;
		px: number;
		py: number;
		v: number;
		ph: number;
		k: number;
		sz: number;
	}>;
	private flakes: Flake[] = [];
	private readonly motion: number;
	private vw = 0;
	private vh = 0;
	private dpr = 1;
	private sc = 1;
	private wx = 0;
	private wy = 0;
	private t = 0;
	private d = 0;
	private stormV = 0;
	private stormT = 0;
	private nightV = 0;
	private nightT = 0;
	private bg: HTMLCanvasElement | null = null;
	private bgX = 0;
	private bgY = 0;
	private bgRS = 1;
	private rebakeAt = 0;

	constructor(S: GridMatrix) {
		this.S = S;
		this.R = S.length;
		this.C = S[0].length;
		const reduce =
			typeof window !== 'undefined' &&
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion:reduce)').matches;
		this.motion = reduce ? 0.2 : 1;

		const ctr = (r: number, c: number): Point => ({ x: (c + 0.5) * T, y: (r + 0.5) * T });
		S.forEach((row, r) =>
			row.forEach((tt, c) => {
				const p = ctr(r, c);
				if (tt === 'DT') {
					this.pellets.push({ ...p, r, c });
				} else if (tt === 'EU') {
					this.crystals.push({ ...p, r, c, ph: Math.random() * 6 });
					this.lights.push({ ...p, r: 1.7 * T, tint: 0x7fd8ff, a: 0.8, flicker: false });
				} else if (isTeleportToken(tt)) {
					this.portals.push({ ...p, i: this.portals.length, ph: r + c });
					this.lights.push({ ...p, r: 1.6 * T, tint: 0x9fd8ff, a: 0.7, flicker: false });
				}
			})
		);
		const lair = ctr(Math.floor((this.R - 1) / 2), Math.floor((this.C - 1) / 2));
		this.lights.push({ ...lair, r: 3.4 * T, tint: 0xffd9a0, a: 0.4, flicker: false });
		for (let i = 0; i < 22; i++) {
			const x = (-18 + (i * (this.C + 36)) / 22) * T + Math.random() * T * 2;
			this.glints.push({
				x,
				y: streamY(this.R, x) + (Math.random() - 0.5) * 10,
				ph: Math.random() * 6
			});
		}
		for (const o of winterDecor(this.R, this.C)) {
			if (o.k === 'lamp') {
				this.lights.push({ x: o.x, y: o.y, r: 4 * T, tint: 0xffd890, a: 0.85, flicker: true });
			} else if (o.k === 'cabin') {
				const w = o.w ?? 0;
				const h = o.h ?? 0;
				this.lights.push({ x: o.x, y: o.y, r: 5 * T, tint: 0xffc77a, a: 0.5, flicker: false });
				for (let i = 0; i < 5; i++) {
					this.smoke.push({ cx: o.x + w * 0.25, cy: o.y - h * 0.22, u: i / 5, ph: i });
				}
			}
		}
		this.mist = [0, 1, 2, 3].map((i) => ({ x: 0, y: 0, w: 0, h: 0, v: 0.15 + i * 0.04 }));
		this.snow = Array.from({ length: 80 }, () => ({
			a: 0.55 + Math.random() * 0.35,
			px: Math.random(),
			py: Math.random(),
			v: 0.0004 + Math.random() * 0.0004,
			ph: Math.random() * 6,
			k: 0.035 + Math.random() * 0.05,
			sz: 0
		}));
	}

	/** Board placement for the actors: one tile = WINTER_TILE world units. */
	get layout(): GridLayout {
		return { tileSize: T * this.sc, offsetX: this.wx, offsetY: this.wy };
	}

	/** Blizzard and night targets, 0..1; both ease in and out like the mock-up toggles. */
	setMood(storm: number, night: number): void {
		this.stormT = storm;
		this.nightT = night;
	}

	resize(vw: number, vh: number, dpr: number): void {
		if (vw === this.vw && vh === this.vh && dpr === this.dpr) {
			return;
		}
		const first = this.vw === 0;
		this.vw = vw;
		this.vh = vh;
		this.dpr = dpr;
		this.sc = 0.75 * Math.min(vw / ((this.C + 2.5) * T), vh / ((this.R + 2.5) * T));
		this.wx = vw / 2 - ((this.C * T) / 2) * this.sc;
		this.wy = vh / 2 - ((this.R * T) / 2) * this.sc;
		const W = Math.max(vw, vh);
		this.mist.forEach((f, i) => {
			f.w = W * 0.8;
			f.h = W * 0.5;
			f.y = vh * (0.15 + i * 0.22);
		});
		this.snow.forEach((p) => (p.sz = 64 * this.sc * p.k));
		if (first) {
			this.flakes = this.makeFlakes();
			this.rebake();
		} else {
			this.rebakeAt = performance.now() + REBAKE_DELAY_MS;
		}
	}

	update(dt: number): void {
		const ms = Math.min(Math.max(dt * 1000, 0), 100);
		const k = this.motion;
		this.t += (ms / 1000) * k;
		this.d = ms * 0.06 * k;
		const d = this.d;
		const t = this.t;
		const ez = Math.min(1, 0.04 * d);
		this.stormV += (this.stormT - this.stormV) * ez;
		this.nightV += (this.nightT - this.nightV) * ez;
		for (const f of this.mist) {
			f.x += f.v * d * (1 + 6 * this.stormV);
			if (f.x > this.vw + f.w / 2) {
				f.x = -f.w / 2;
			}
		}
		for (const p of this.snow) {
			p.py += p.v * d * 16;
			p.px += Math.sin(t * 0.9 + p.ph) * 0.0004;
			if (p.py > 1.03) {
				p.py = -0.03;
				p.px = Math.random();
			}
		}
		if (this.stormV > 0.02) {
			for (const p of this.flakes) {
				p.px += p.vx * d * this.stormV;
				p.py += p.vy * d * this.stormV + (p.st ? 0 : Math.sin(t * 2 + p.ph) * 0.3);
				if (p.px > this.vw + 30) {
					p.px = -30;
					p.py = Math.random() * this.vh;
				}
				if (p.py > this.vh + 30) {
					p.py = -30;
					p.px = Math.random() * this.vw;
				}
			}
		}
		for (const q of this.smoke) {
			q.u = (q.u + 0.0025 * d) % 1;
		}
	}

	/**
	 * Background, maze, pellets still on the board and the animated world objects.
	 * `collected(x, y)` tells which pellets were eaten. Leaves the context untransformed.
	 */
	drawWorld(ctx: CanvasRenderingContext2D, collected: (x: number, y: number) => boolean): void {
		if (this.rebakeAt > 0 && performance.now() >= this.rebakeAt) {
			this.rebake();
		}
		const t = this.t;
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = WINTER_BG;
		ctx.fillRect(0, 0, this.vw, this.vh);
		ctx.translate(this.wx, this.wy);
		ctx.scale(this.sc, this.sc);
		if (this.bg) {
			ctx.drawImage(
				this.bg,
				this.bgX,
				this.bgY,
				this.bg.width / this.bgRS,
				this.bg.height / this.bgRS
			);
		}
		const pellet = pelletTexture();
		for (const p of this.pellets) {
			if (!collected(p.c, p.r)) {
				ctx.drawImage(pellet, p.x - 5, p.y - 5, 10, 10);
			}
		}
		const crystalGlow = glowTexture(0x7fd8ff);
		for (const o of this.crystals) {
			if (collected(o.c, o.r)) {
				continue;
			}
			const s = 1 + 0.05 * Math.sin(t * 2.6 + o.ph);
			sprite(ctx, crystalGlow, o.x, o.y, 13.23 * s, 13.23 * s, 0.7, 0, true);
			sprite(ctx, crystalTexture(), o.x, o.y, 20 * s, 20 * s, 1, t * 0.4);
		}
		for (const o of this.portals) {
			sprite(
				ctx,
				glowTexture(0xa8d8ff),
				o.x,
				o.y,
				19.2,
				19.2,
				0.5 + 0.3 * Math.sin(t * 1.8 + o.i),
				0,
				true
			);
			sprite(ctx, swirlTexture(), o.x, o.y, 20, 20, 0.7 + 0.2 * Math.sin(t * 1.6 + o.ph), t * 0.9);
			sprite(ctx, swirlTexture(), o.x, o.y, 12.4, 12.4, 0.75, -t * 1.5);
			const br = 0.5 + 0.5 * Math.sin(t * 1.8 + o.ph);
			const rs = 20 * (0.94 + 0.08 * br);
			sprite(ctx, ringTexture(), o.x, o.y, rs, rs, 0.45 + 0.5 * br);
		}
		const glint = glowTexture(0xffffff);
		for (const g of this.glints) {
			const a = Math.pow(Math.max(0, Math.sin(t * 2 + g.ph)), 3) * 0.8;
			sprite(ctx, glint, g.x, g.y, 6.4, 6.4, a, 0, true);
		}
		const puff = glowTexture(0xf2f6fa);
		for (const q of this.smoke) {
			const s = 8 + q.u * 22;
			sprite(
				ctx,
				puff,
				q.cx + q.u * 26 + Math.sin(t * 1.5 + q.ph) * 4,
				q.cy - q.u * 34,
				s,
				s,
				(1 - q.u) * 0.5 * Math.min(1, q.u * 8)
			);
		}
		ctx.restore();
	}

	/** Atmosphere under the actors: mist, light, drifting snow, wash, blizzard haze, night. */
	drawMood(ctx: CanvasRenderingContext2D): void {
		const vw = this.vw;
		const vh = this.vh;
		const t = this.t;
		ctx.save();
		const fog = fogTexture();
		for (const f of this.mist) {
			sprite(ctx, fog, f.x, f.y, f.w, f.h, 0.1 + 0.22 * this.stormV);
		}
		const W = Math.max(vw, vh) * 1.5;
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'lighter';
		ctx.drawImage(litTexture(), 0, 0, W, W);
		const flake = glowTexture(0xffffff);
		for (const p of this.snow) {
			sprite(ctx, flake, p.px * vw, p.py * vh, p.sz, p.sz, p.a);
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(washTexture(), 0, 0, vw, vh);
		if (this.stormV > 0.002) {
			ctx.globalAlpha = 0.24 * this.stormV;
			ctx.fillStyle = '#e4edf6';
			ctx.fillRect(0, 0, vw, vh);
		}
		if (this.nightV > 0.002) {
			ctx.globalAlpha = 0.55 * this.nightV;
			ctx.globalCompositeOperation = 'multiply';
			ctx.fillStyle = '#5a6ea6';
			ctx.fillRect(0, 0, vw, vh);
			ctx.save();
			ctx.translate(this.wx, this.wy);
			ctx.scale(this.sc, this.sc);
			for (const g of this.lights) {
				const a = this.nightV * g.a * (g.flicker ? 0.88 + 0.12 * Math.sin(t * 7 + g.x) : 1);
				sprite(ctx, glowTexture(g.tint), g.x, g.y, 2 * g.r, 2 * g.r, a, 0, true);
			}
			ctx.restore();
		}
		ctx.restore();
	}

	/** Screen-space layer over the actors: blizzard flakes and the vignette. */
	drawOverlay(ctx: CanvasRenderingContext2D): void {
		ctx.save();
		if (this.stormV > 0.02) {
			for (const p of this.flakes) {
				if (p.st) {
					sprite(ctx, p.im, p.px, p.py, 16 * p.s, 2 * p.s, this.stormV * 0.7, 0.3);
				} else {
					const s = (64 * p.s) / 3;
					sprite(ctx, p.im, p.px, p.py, s, s, this.stormV * 0.9);
				}
			}
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(vignetteTexture(), 0, 0, this.vw, this.vh);
		ctx.restore();
	}

	private makeFlakes(): Flake[] {
		return Array.from({ length: 220 }, (_, i) => {
			const st = i % 2 === 0;
			return {
				st,
				s: st ? 0.8 + Math.random() : 0.14 + Math.random() * 0.2,
				px: Math.random() * this.vw,
				py: Math.random() * this.vh,
				vx: st ? 12 + Math.random() * 8 : 3 + Math.random() * 3,
				vy: st ? 4 + Math.random() * 3 : 2 + Math.random() * 2,
				ph: Math.random() * 6,
				im: st ? streakTexture(i % 4 === 0 ? 0xffffff : 0xa9bdd6) : glowTexture(0xffffff)
			};
		});
	}

	private rebake(): void {
		this.rebakeAt = 0;
		const m = 2 * T;
		const bx = -this.wx / this.sc - m;
		const by = -this.wy / this.sc - m;
		const bw = this.vw / this.sc + 2 * m;
		const bh = this.vh / this.sc + 2 * m;
		let RS = this.sc * this.dpr;
		while (RS * RS * bw * bh > 1.3e7) {
			RS *= 0.92;
		}
		this.bg = bakeWinterWorld(this.S, bx, by, bw, bh, RS);
		this.bgX = bx;
		this.bgY = by;
		this.bgRS = RS;
	}
}
