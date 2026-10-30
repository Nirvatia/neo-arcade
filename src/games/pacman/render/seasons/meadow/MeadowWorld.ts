// Live part of the meadow mock-ups: camera, the baked world, animated maze objects (food,
// portal swirls, stream glints, chimney smoke) and the screen-space atmosphere (mist, sun
// rays, drifting particles, weather, night with lamp and cabin lights). The season's theme
// supplies every colour, sprite and particle behaviour.
import type { GridMatrix } from '../../../config/gridConfig';
import { isTeleportToken } from '../../../config/gridConfig';
import type { GridLayout } from '../../maze/GridView';
import { bakeMeadow, meadowDecor, MEADOW_TILE, streamY } from './MeadowBake';
import type { MeadowTheme, WeatherParticle } from './MeadowTheme';
import { glowTexture, rayTexture, swirlTexture } from './meadowSprites';

const T = MEADOW_TILE;
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

interface Drift {
	readonly im: HTMLCanvasElement;
	readonly a: number;
	readonly v: number;
	readonly ph: number;
	readonly rand: number;
	px: number;
	py: number;
	w: number;
	h: number;
}

/** Centred sprite; size in the current transform's units. */
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

export class MeadowWorld {
	private readonly S: GridMatrix;
	private readonly theme: MeadowTheme;
	private readonly R: number;
	private readonly C: number;
	private readonly ring: HTMLCanvasElement;
	private readonly pellets: Array<Point & { r: number; c: number }> = [];
	private readonly energizers: Array<Point & { r: number; c: number; ph: number }> = [];
	private readonly portals: Array<Point & { i: number; ph: number }> = [];
	/** Lair gates: runs of LE tiles, world units from x0 to x1 at height y. */
	private readonly gates: Array<{ x0: number; x1: number; y: number }> = [];
	private gateOpen = 0;
	private readonly glints: Array<Point & { ph: number }> = [];
	private readonly smoke: Array<{ cx: number; cy: number; u: number; ph: number }> = [];
	private readonly lights: Light[] = [];
	private readonly mist: Array<{ x: number; y: number; w: number; h: number; v: number }>;
	private readonly drift: Drift[];
	private weather: WeatherParticle[] = [];
	private readonly motion: number;
	private vw = 0;
	private vh = 0;
	private dpr = 1;
	private sc = 1;
	private wx = 0;
	private wy = 0;
	private t = 0;
	private stormV = 0;
	private stormT = 0;
	private nightV = 0;
	private nightT = 0;
	private bg: HTMLCanvasElement | null = null;
	private bgX = 0;
	private bgY = 0;
	private bgRS = 1;
	private rebakeAt = 0;

	constructor(S: GridMatrix, theme: MeadowTheme) {
		this.S = S;
		this.theme = theme;
		this.R = S.length;
		this.C = S[0].length;
		const live = theme.live;
		this.ring = live.portal.ring();
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
					this.energizers.push({ ...p, r, c, ph: Math.random() * 6 });
					this.lights.push({
						...p,
						r: 1.7 * T,
						tint: live.lights.energizer,
						a: 0.8,
						flicker: false
					});
				} else if (isTeleportToken(tt)) {
					this.portals.push({ ...p, i: this.portals.length, ph: r + c });
					this.lights.push({ ...p, r: 1.6 * T, tint: live.lights.portal, a: 0.7, flicker: false });
				}
			})
		);
		S.forEach((row, r) => {
			let start = -1;
			row.forEach((tt, c) => {
				if (tt === 'LE' && start < 0) {
					start = c;
				}
				if (start >= 0 && (tt !== 'LE' || c === row.length - 1)) {
					const end = tt === 'LE' ? c + 1 : c;
					this.gates.push({ x0: start * T, x1: end * T, y: (r + 0.5) * T });
					start = -1;
				}
			});
		});
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
		for (const o of meadowDecor(this.R, this.C, theme.bake.landmark.ex)) {
			if (o.k === 'lamp') {
				this.lights.push({ x: o.x, y: o.y, r: 4 * T, tint: 0xffd890, a: 0.85, flicker: true });
			} else if (o.k === 'cabin') {
				const w = o.w ?? 0;
				const h = o.h ?? 0;
				this.lights.push({ x: o.x, y: o.y, r: 5 * T, tint: 0xffc77a, a: 0.5, flicker: false });
				if (live.chimneySmoke) {
					for (let i = 0; i < 5; i++) {
						this.smoke.push({ cx: o.x + w * 0.25, cy: o.y - h * 0.22, u: i / 5, ph: i });
					}
				}
			}
		}
		this.mist = [0, 1, 2, 3].map((i) => ({ x: 0, y: 0, w: 0, h: 0, v: 0.15 + i * 0.04 }));
		this.drift = Array.from({ length: 80 }, (_, i) => ({
			im: live.drift.texture(i),
			a: 0.55 + Math.random() * 0.35,
			px: Math.random(),
			py: Math.random(),
			v: 0.0004 + Math.random() * 0.0004,
			ph: Math.random() * 6,
			rand: Math.random(),
			w: 0,
			h: 0
		}));
	}

	/** Board placement for the actors: one tile = MEADOW_TILE world units. */
	get layout(): GridLayout {
		return { tileSize: T * this.sc, offsetX: this.wx, offsetY: this.wy };
	}

	/** How far the lair gate is open, 0 (shut) .. 1 (slid into its posts). */
	setLairGate(open: number): void {
		this.gateOpen = Number.isFinite(open) ? Math.max(0, Math.min(1, open)) : 0;
	}

	/** Weather and night targets, 0..1; both ease in and out like the mock-up toggles. */
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
		for (const p of this.drift) {
			[p.w, p.h] = this.theme.live.drift.size(this.sc, p.rand);
		}
		if (first) {
			const weather = this.theme.live.weather;
			this.weather = Array.from({ length: weather.count }, (_, i) => weather.make(i, vw, vh));
			this.rebake();
		} else {
			this.rebakeAt = performance.now() + REBAKE_DELAY_MS;
		}
	}

	update(dt: number): void {
		const live = this.theme.live;
		const ms = Math.min(Math.max(dt * 1000, 0), 100);
		const k = this.motion;
		this.t += (ms / 1000) * k;
		const d = ms * 0.06 * k;
		const t = this.t;
		const ez = Math.min(1, 0.04 * d);
		this.stormV += (this.stormT - this.stormV) * ez;
		this.nightV += (this.nightT - this.nightV) * ez;
		for (const f of this.mist) {
			f.x += f.v * d * live.mistSpeed(this.stormV);
			if (f.x > this.vw + f.w / 2) {
				f.x = -f.w / 2;
			}
		}
		const dir = live.drift.direction;
		for (const p of this.drift) {
			p.py += dir * p.v * d * live.drift.speed;
			p.px += Math.sin(t * 0.9 + p.ph) * 0.0004;
			if (dir > 0 && p.py > 1.03) {
				p.py = -0.03;
				p.px = Math.random();
			} else if (dir < 0 && p.py < -0.03) {
				p.py = 1.03;
				p.px = Math.random();
			}
		}
		if (this.stormV > 0.02) {
			for (const p of this.weather) {
				live.weather.step(p, d, t, this.stormV, this.vw, this.vh);
			}
		}
		for (const q of this.smoke) {
			q.u = (q.u + 0.0025 * d) % 1;
		}
	}

	/**
	 * Background, maze, food still on the board and the animated world objects.
	 * `collected(x, y)` tells which food was eaten. Leaves the context untransformed.
	 */
	drawWorld(ctx: CanvasRenderingContext2D, collected: (x: number, y: number) => boolean): void {
		if (this.rebakeAt > 0 && performance.now() >= this.rebakeAt) {
			this.rebake();
		}
		const live = this.theme.live;
		const t = this.t;
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = this.theme.bake.bg;
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
		this.drawGates(ctx);
		const pellet = live.pellet.texture();
		const ps = live.pellet.size;
		for (const p of this.pellets) {
			if (!collected(p.c, p.r)) {
				ctx.drawImage(pellet, p.x - ps / 2, p.y - ps / 2, ps, ps);
			}
		}
		const en = live.energizer;
		const enGlow = glowTexture(en.glow);
		const enIm = en.texture();
		for (const o of this.energizers) {
			if (collected(o.c, o.r)) {
				continue;
			}
			const s = 1 + 0.05 * Math.sin(t * 2.6 + o.ph);
			const rot = en.motion === 'spin' ? t * 0.4 : Math.sin(t * 2 + o.ph) * 0.12;
			sprite(ctx, enGlow, o.x, o.y, en.glowSize * s, en.glowSize * s, 0.7, 0, true);
			sprite(ctx, enIm, o.x, o.y, en.size * s, en.size * s, 1, rot);
		}
		const portalGlow = glowTexture(live.portal.glow);
		for (const o of this.portals) {
			sprite(ctx, portalGlow, o.x, o.y, 19.2, 19.2, 0.5 + 0.3 * Math.sin(t * 1.8 + o.i), 0, true);
			sprite(ctx, swirlTexture(), o.x, o.y, 20, 20, 0.7 + 0.2 * Math.sin(t * 1.6 + o.ph), t * 0.9);
			sprite(ctx, swirlTexture(), o.x, o.y, 12.4, 12.4, 0.75, -t * 1.5);
			const br = 0.5 + 0.5 * Math.sin(t * 1.8 + o.ph);
			const rs = 20 * (0.94 + 0.08 * br);
			sprite(ctx, this.ring, o.x, o.y, rs, rs, 0.45 + 0.5 * br);
		}
		const glint = glowTexture(live.glints);
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

	/**
	 * The lair gate, as the bake used to paint it: a plank bar between two dark posts with a
	 * flower in the middle. Opening, each half slides into its post and the flower fades.
	 */
	private drawGates(ctx: CanvasRenderingContext2D): void {
		const o = this.gateOpen;
		for (const g of this.gates) {
			const mid = (g.x0 + g.x1) / 2;
			const half = (mid - g.x0) * (1 - o);
			for (const [from, dir] of [
				[g.x0, 1],
				[g.x1, -1]
			] as const) {
				const left = dir > 0 ? from : from - half;
				if (half > 0.01) {
					ctx.fillStyle = '#7a5636';
					ctx.fillRect(left, g.y - 5, half, 10);
					ctx.fillStyle = '#a07848';
					for (let i = 0; i < 3; i++) {
						ctx.fillRect(left, g.y - 4 + i * 3.3, half, 1.2);
					}
				}
				ctx.fillStyle = '#4f3622';
				ctx.fillRect(dir > 0 ? from : from - 4, g.y - 6, 4, 12);
			}
			if (o < 1) {
				ctx.save();
				ctx.globalAlpha *= 1 - o;
				const r = 2.6;
				ctx.fillStyle = '#d9333a';
				for (let k = 0; k < 5; k++) {
					const a = k * 1.2566 + 0.3;
					ctx.beginPath();
					ctx.arc(mid + Math.cos(a) * r * 0.7, g.y - 5 + Math.sin(a) * r * 0.7, r * 0.6, 0, 7);
					ctx.fill();
				}
				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(mid, g.y - 5, r * 0.38, 0, 7);
				ctx.fill();
				ctx.restore();
			}
		}
	}

	/** Atmosphere under the actors: mist, rays, light, drift, wash, weather haze, night. */
	drawMood(ctx: CanvasRenderingContext2D): void {
		const live = this.theme.live;
		const vw = this.vw;
		const vh = this.vh;
		const t = this.t;
		ctx.save();
		const fog = live.fog();
		const mistA = live.mistAlpha(this.stormV);
		for (const f of this.mist) {
			sprite(ctx, fog, f.x, f.y, f.w, f.h, mistA);
		}
		for (let i = 0; i < 2; i++) {
			const a = live.rays(t, i, this.stormV, this.nightV);
			if (a > 0.003) {
				const w = 70 * (1.6 + i);
				const h = vh * 1.6;
				ctx.save();
				ctx.translate(vw * (0.1 + i * 0.22), -20);
				ctx.rotate(-0.5);
				ctx.globalAlpha = Math.min(1, a);
				ctx.globalCompositeOperation = 'lighter';
				ctx.drawImage(rayTexture(), -w / 2, 0, w, h);
				ctx.restore();
			}
		}
		const W = Math.max(vw, vh) * 1.5;
		ctx.globalAlpha = Math.min(1, live.litAlpha(this.stormV, this.nightV));
		ctx.globalCompositeOperation = 'lighter';
		ctx.drawImage(live.lit(), 0, 0, W, W);
		const spin = live.drift.spin;
		for (const p of this.drift) {
			sprite(ctx, p.im, p.px * vw, p.py * vh, p.w, p.h, p.a, spin ? t + p.ph : 0);
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(live.wash(), 0, 0, vw, vh);
		if (this.stormV > 0.002) {
			ctx.globalAlpha = live.stormAlpha * this.stormV;
			ctx.fillStyle = live.stormTint;
			ctx.fillRect(0, 0, vw, vh);
		}
		if (this.nightV > 0.002) {
			ctx.globalAlpha = live.nightAlpha * this.nightV;
			ctx.globalCompositeOperation = 'multiply';
			ctx.fillStyle = live.nightTint;
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

	/** Screen-space layer over the actors: the weather particles and the vignette. */
	drawOverlay(ctx: CanvasRenderingContext2D): void {
		const live = this.theme.live;
		ctx.save();
		if (this.stormV > 0.02) {
			for (const p of this.weather) {
				sprite(ctx, p.im, p.px, p.py, p.w, p.h, live.weather.alpha(p, this.stormV), p.rot, p.add);
			}
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(live.vignette(), 0, 0, this.vw, this.vh);
		ctx.restore();
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
		this.bg = bakeMeadow(this.S, this.theme.bake, bx, by, bw, bh, RS);
		this.bgX = bx;
		this.bgY = by;
		this.bgRS = RS;
	}
}
