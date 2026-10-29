// Live part of the CLAUDE_GRID_DOOM_v3 prototype: camera, animated world objects and the
// screen-space post effects (mist, ash dust, embers storm, hellish night with lights).
import type { GridMatrix } from '../../config/gridConfig';
import { isTeleportToken } from '../../config/gridConfig';
import type { GridLayout } from '../GridView';
import { DoomLightmap } from './DoomLightmap';
import { bakeDoomWorld, doomDecor, DOOM_BG, DOOM_TILE, streamY } from './DoomBake';
import {
	fogTexture,
	glowTexture,
	litTexture,
	streakTexture,
	vignetteTexture,
	washTexture
} from './DoomSprites';

const T = DOOM_TILE;
const REBAKE_DELAY_MS = 160;
const SHADE_SCALE = 0.25;
const FOG_LIFE = 0.85;

export interface DoomLight {
	readonly x: number;
	readonly y: number;
	readonly r: number;
	readonly tint: number;
	readonly a: number;
}

interface StaticLight extends DoomLight {
	readonly flicker: boolean;
}

interface WorldObject {
	draw(ctx: CanvasRenderingContext2D, t: number): void;
}

interface Mist {
	x: number;
	y: number;
	w: number;
	h: number;
	v: number;
	alpha: number;
}

interface Dust {
	alpha: number;
	px: number;
	py: number;
	v: number;
	ph: number;
	sz: number;
}

interface Flake {
	st: boolean;
	s: number;
	px: number;
	py: number;
	vx: number;
	vy: number;
	ph: number;
	alpha: number;
	vis: boolean;
	rot: number;
	im: HTMLCanvasElement;
}

function img(
	ctx: CanvasRenderingContext2D,
	c: HTMLCanvasElement,
	x: number,
	y: number,
	w: number,
	h: number,
	a = 1,
	add = false
): void {
	if (a <= 0) {
		return;
	}
	ctx.globalAlpha = a > 1 ? 1 : a;
	ctx.globalCompositeOperation = add ? 'lighter' : 'source-over';
	ctx.drawImage(c, x, y, w, h);
}

export class DoomWorld {
	private readonly S: GridMatrix;
	private readonly R: number;
	private readonly C: number;
	private readonly objects: WorldObject[] = [];
	/** Lamps and cabins outside the maze: radial glows as in the prototype. */
	private readonly lights: StaticLight[] = [];
	/** Portals, pickups and the lair: sources of the maze light map. */
	private readonly mazeLights: DoomLight[] = [];
	private readonly lightmap: DoomLightmap;
	private shade: HTMLCanvasElement | null = null;
	private readonly fogs: Array<{
		x: number;
		y: number;
		age: number;
		sparks: Array<{ a: number; v: number; s: number; up: number }>;
	}> = [];
	private readonly smoke: Array<{ cx: number; cy: number; u: number; ph: number }> = [];
	private readonly mist: Mist[];
	private readonly dust: Dust[];
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

	constructor(S: GridMatrix, pickupTiles: ReadonlyArray<{ x: number; y: number }>) {
		this.S = S;
		this.R = S.length;
		this.C = S[0].length;
		const reduce =
			typeof window !== 'undefined' &&
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion:reduce)').matches;
		this.motion = reduce ? 0.2 : 1;

		const ctr = (r: number, c: number) => ({ x: (c + 0.5) * T, y: (r + 0.5) * T });
		let portalIndex = 0;
		this.S.forEach((row, r) =>
			row.forEach((tt, c) => {
				if (isTeleportToken(tt)) {
					const p = ctr(r, c);
					this.objects.push(this.portal(p.x, p.y, portalIndex++, r + c));
					this.mazeLights.push({ x: c + 0.5, y: r + 0.5, r: 2.5, tint: 0xff3a2a, a: 0.8 });
				}
			})
		);
		for (const tile of pickupTiles) {
			this.mazeLights.push({ x: tile.x + 0.5, y: tile.y + 0.5, r: 2.5, tint: 0xff7a2a, a: 0.8 });
		}
		this.mazeLights.push({
			x: Math.floor((this.C - 1) / 2) + 0.5,
			y: Math.floor((this.R - 1) / 2) + 0.5,
			r: 4,
			tint: 0xffd9a0,
			a: 0.55
		});
		this.lightmap = new DoomLightmap(S);
		for (let i = 0; i < 22; i++) {
			const x = (-18 + (i * (this.C + 36)) / 22) * T + Math.random() * T * 2;
			const y = streamY(this.R, x) + (Math.random() - 0.5) * 10;
			const ph = Math.random() * 6;
			this.objects.push({
				draw(ctx, t) {
					const a = Math.pow(Math.max(0, Math.sin(t * 2 + ph)), 3) * 0.8;
					const s = (64 * 0.3) / 3;
					img(ctx, glowTexture(0xff8a2a), x - s / 2, y - s / 2, s, s, a, true);
				}
			});
		}
		for (const o of doomDecor(this.R, this.C)) {
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
		this.mist = [0, 1, 2, 3].map((i) => ({
			x: 0,
			y: 0,
			w: 0,
			h: 0,
			v: 0.15 + i * 0.04,
			alpha: 0.1
		}));
		this.dust = Array.from({ length: 80 }, () => ({
			alpha: 0.3 + Math.random() * 0.3,
			px: Math.random(),
			py: Math.random(),
			v: 0.0004 + Math.random() * 0.0004,
			ph: Math.random() * 6,
			sz: 0
		}));
	}

	/** Board placement for the grid views: one tile = DOOM_TILE world units. */
	get layout(): GridLayout {
		return { tileSize: T * this.sc, offsetX: this.wx, offsetY: this.wy };
	}

	/** Ash storm and hellish night ease in and out like the prototype toggles. */
	setMood(storm: boolean, night: boolean): void {
		this.stormT = storm ? 1 : 0;
		this.nightT = night ? 1 : 0;
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
		this.dust.forEach((p) => (p.sz = 64 * this.sc * (0.035 + Math.random() * 0.05)));
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
		for (const f of this.mist) {
			f.x += f.v * d * (1 + 6 * this.stormV);
			f.alpha = 0.1 + 0.22 * this.stormV;
			if (f.x > this.vw + f.w / 2) {
				f.x = -f.w / 2;
			}
		}
		const ez = Math.min(1, 0.04 * d);
		this.stormV += (this.stormT - this.stormV) * ez;
		this.nightV += (this.nightT - this.nightV) * ez;
		for (const p of this.flakes) {
			p.vis = this.stormV > 0.02;
			if (!p.vis) {
				continue;
			}
			p.alpha = this.stormV * (p.st ? 0.6 : 0.95) * (0.7 + 0.3 * Math.sin(t * 6 + p.ph));
			p.px += p.vx * d * this.stormV + Math.sin(t * 2 + p.ph) * 0.4;
			p.py += p.vy * d * this.stormV;
			if (p.py < -30) {
				p.py = this.vh + 30;
				p.px = Math.random() * this.vw;
			}
			if (p.px > this.vw + 30) {
				p.px = -30;
			}
		}
		for (const p of this.dust) {
			p.py += p.v * d * 16;
			p.px += Math.sin(t * 0.9 + p.ph) * 0.0004;
			if (p.py > 1.03) {
				p.py = -0.03;
				p.px = Math.random();
			}
		}
		for (const q of this.smoke) {
			q.u = (q.u + 0.0025 * d) % 1;
		}
		for (let i = this.fogs.length - 1; i >= 0; i -= 1) {
			this.fogs[i].age += ms / 1000;
			if (this.fogs[i].age >= FOG_LIFE) {
				this.fogs.splice(i, 1);
			}
		}
	}

	/** Background, maze and animated world objects. Leaves the context untransformed. */
	drawWorld(ctx: CanvasRenderingContext2D): void {
		if (this.rebakeAt > 0 && performance.now() >= this.rebakeAt) {
			this.rebake();
		}
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = DOOM_BG;
		ctx.fillRect(0, 0, this.vw, this.vh);
		ctx.translate(this.wx, this.wy);
		ctx.scale(this.sc, this.sc);
		if (this.bg) {
			img(ctx, this.bg, this.bgX, this.bgY, this.bg.width / this.bgRS, this.bg.height / this.bgRS);
		}
		for (const o of this.objects) {
			o.draw(ctx, this.t);
		}
		for (const q of this.smoke) {
			const x = q.cx + q.u * 26 + Math.sin(this.t * 1.5 + q.ph) * 4;
			const y = q.cy - q.u * 34;
			const s = 8 + q.u * 22;
			img(
				ctx,
				glowTexture(0xf2f6fa),
				x - s / 2,
				y - s / 2,
				s,
				s,
				(1 - q.u) * 0.5 * Math.min(1, q.u * 8)
			);
		}
		ctx.restore();
	}

	/**
	 * Atmosphere under the actors: mist, dust and wash, the ash storm tint and the hellish
	 * night. At night the darkness is cut away by a per-tile light map that spreads along
	 * corridors and stops at walls; `actorLights` (tile-center coordinates, radius in
	 * tiles) are added to the maze's own lights.
	 */
	drawMood(ctx: CanvasRenderingContext2D, actorLights: readonly DoomLight[] = []): void {
		const vw = this.vw;
		const vh = this.vh;
		const t = this.t;
		ctx.save();
		for (const f of this.mist) {
			img(ctx, fogTexture(), f.x - f.w / 2, f.y - f.h / 2, f.w, f.h, f.alpha);
		}
		const W = Math.max(vw, vh);
		img(ctx, litTexture(), 0, 0, W * 1.5, W * 1.5, 1, true);
		const pg = glowTexture(0xa89a90);
		for (const p of this.dust) {
			img(ctx, pg, p.px * vw - p.sz / 2, p.py * vh - p.sz / 2, p.sz, p.sz, p.alpha);
		}
		img(ctx, washTexture(), 0, 0, vw, vh);
		if (this.stormV > 0) {
			ctx.globalCompositeOperation = 'source-over';
			ctx.globalAlpha = 0.26 * this.stormV;
			ctx.fillStyle = 'rgb(138,42,16)';
			ctx.fillRect(0, 0, vw, vh);
		}
		// darker than the prototype's red wash so the light map actually reads as light
		const na = (0.82 + 0.06 * Math.sin(t * 3.2)) * this.nightV;
		if (na > 0) {
			const light = this.lightmap.compute([...this.mazeLights, ...actorLights]);
			const shade = this.shadeLayer(light, t);
			ctx.globalCompositeOperation = 'multiply';
			ctx.globalAlpha = na;
			ctx.drawImage(shade, 0, 0, vw, vh);
			// the prototype's glows around lamps and cabins outside the maze
			ctx.save();
			ctx.translate(this.wx, this.wy);
			ctx.scale(this.sc, this.sc);
			for (const g of this.lights) {
				const a = this.nightV * g.a * (g.flicker ? 0.88 + 0.12 * Math.sin(t * 7 + g.x) : 1);
				img(ctx, glowTexture(g.tint), g.x - g.r, g.y - g.r, 2 * g.r, 2 * g.r, a, true);
			}
			ctx.restore();
		}
		ctx.restore();
	}

	/** Screen-space layer over the actors: wind-blown embers and the vignette. */
	drawOverlay(ctx: CanvasRenderingContext2D): void {
		ctx.save();
		for (const p of this.flakes) {
			if (!p.vis) {
				continue;
			}
			if (p.st) {
				const w = 16 * p.s;
				const h = 2 * p.s * 0.6;
				ctx.save();
				ctx.translate(p.px, p.py);
				ctx.rotate(p.rot);
				img(ctx, p.im, -w / 2, -h / 2, w, h, p.alpha);
				ctx.restore();
			} else {
				const s = (64 * p.s) / 3;
				img(ctx, p.im, p.px - s / 2, p.py - s / 2, s, s, p.alpha, true);
			}
		}
		img(ctx, vignetteTexture(), 0, 0, this.vw, this.vh);
		ctx.restore();
	}

	/**
	 * Night tint with holes where light falls, multiplied over the world. Rendered at a
	 * quarter of the screen resolution: upscaling it is the blur, and it stays cheap.
	 */
	private shadeLayer(light: HTMLCanvasElement, t: number): HTMLCanvasElement {
		const q = SHADE_SCALE;
		const w = Math.max(1, Math.ceil(this.vw * q));
		const h = Math.max(1, Math.ceil(this.vh * q));
		if (!this.shade || this.shade.width !== w || this.shade.height !== h) {
			this.shade = document.createElement('canvas');
			this.shade.width = w;
			this.shade.height = h;
		}
		const g = this.shade.getContext('2d');
		if (!g) {
			return this.shade;
		}
		g.setTransform(q, 0, 0, q, 0, 0);
		g.globalCompositeOperation = 'source-over';
		g.globalAlpha = 1;
		g.fillStyle = 'rgb(118,34,22)';
		g.fillRect(0, 0, this.vw, this.vh);
		g.globalCompositeOperation = 'destination-out';
		g.translate(this.wx, this.wy);
		g.scale(this.sc, this.sc);
		g.imageSmoothingEnabled = true;
		g.drawImage(light, 0, 0, this.C * T, this.R * T);
		for (const l of this.lights) {
			const a = l.a * (l.flicker ? 0.88 + 0.12 * Math.sin(t * 7 + l.x) : 1);
			g.globalAlpha = Math.min(1, a);
			g.drawImage(glowTexture(0xffffff), l.x - l.r, l.y - l.r, 2 * l.r, 2 * l.r);
		}
		g.globalAlpha = 1;
		return this.shade;
	}

	/** Live teleporter: the engraving smoulders and pulses, embers rise off the plate. */
	private portal(x: number, y: number, i: number, ph: number): WorldObject {
		return {
			draw(ctx, t) {
				ctx.save();
				ctx.translate(x, y);
				const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + ph);
				const gs = 26;
				img(ctx, glowTexture(0xff3a1a), -gs / 2, -gs / 2, gs, gs, 0.35 + 0.35 * pulse, true);
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = 0.55 + 0.45 * pulse;
				ctx.lineJoin = 'round';
				const r = 6.6;
				for (const [color, width] of [
					['rgba(255,60,20,.55)', 2.6],
					['#ffb070', 0.8]
				] as const) {
					ctx.strokeStyle = color;
					ctx.lineWidth = width;
					ctx.beginPath();
					ctx.arc(0, 0, r, 0, Math.PI * 2);
					for (let k = 0; k <= 5; k += 1) {
						const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5 + Math.sin(t * 0.5 + i) * 0.02;
						const ex = Math.cos(a) * r * 0.93;
						const ey = Math.sin(a) * r * 0.93;
						if (k) {
							ctx.lineTo(ex, ey);
						} else {
							ctx.moveTo(ex, ey);
						}
					}
					ctx.stroke();
				}
				// embers drifting up from the plate
				for (let k = 0; k < 9; k += 1) {
					const u = (t * (0.35 + (k % 3) * 0.08) + k / 9 + i * 0.37) % 1;
					const ex = Math.sin(k * 12.7 + i) * 6 + Math.sin(t * 2 + k) * 1.5;
					const ey = 5 - u * 22;
					const sz = 3.2 * (1 - u);
					img(
						ctx,
						glowTexture(k % 2 ? 0xff8a2a : 0xffd27a),
						ex - sz,
						ey - sz,
						sz * 2,
						sz * 2,
						(1 - u) * 0.9,
						true
					);
				}
				ctx.restore();
			}
		};
	}

	/** Doom's teleport fog, in tile-center coordinates. */
	teleportFog(x: number, y: number): void {
		const sparks = Array.from({ length: 26 }, () => {
			const a = Math.random() * Math.PI * 2;
			const v = 24 + Math.random() * 56;
			return { a, v, s: 1.6 + Math.random() * 2.6, up: 14 + Math.random() * 34 };
		});
		this.fogs.push({ x: x * T, y: y * T, age: 0, sparks });
	}

	/** Short-lived effects drawn over the actors (inside the shaken world transform). */
	drawFx(ctx: CanvasRenderingContext2D): void {
		if (this.fogs.length === 0) {
			return;
		}
		ctx.save();
		ctx.translate(this.wx, this.wy);
		ctx.scale(this.sc, this.sc);
		for (const fog of this.fogs) {
			const u = fog.age / FOG_LIFE;
			const k = 1 - u;
			// column of light, then green-white sparks and a ring
			const flash = Math.min(1, u * 8) * k;
			img(
				ctx,
				glowTexture(0xd8ffd0),
				fog.x - 18,
				fog.y - 64 * k - 10,
				36,
				74 * k + 20,
				flash,
				true
			);
			img(ctx, glowTexture(0x40ff50), fog.x - 34, fog.y - 34, 68, 68, flash, true);
			img(ctx, glowTexture(0xffffff), fog.x - 12, fog.y - 12, 24, 24, flash * 0.8, true);
			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = `rgba(150,255,150,${0.8 * k})`;
			ctx.lineWidth = 1.6 * k + 0.3;
			ctx.globalAlpha = 1;
			ctx.beginPath();
			ctx.arc(fog.x, fog.y, 4 + Math.sqrt(u) * 30, 0, Math.PI * 2);
			ctx.stroke();
			for (const sp of fog.sparks) {
				const d = sp.v * Math.sqrt(u);
				const sx = fog.x + Math.cos(sp.a) * d;
				const sy = fog.y + Math.sin(sp.a) * d * 0.6 - sp.up * u;
				const r = sp.s * k + 0.4;
				img(ctx, glowTexture(0xd8ffd0), sx - r * 2, sy - r * 2, r * 4, r * 4, k, true);
			}
		}
		ctx.restore();
	}

	private makeFlakes(): Flake[] {
		const tints = [0xff6a1a, 0xffa030, 0xff3a10];
		return Array.from({ length: 240 }, (_, i) => {
			const st = i % 3 === 0;
			const vx = st ? 10 + Math.random() * 8 : 3 + Math.random() * 4;
			const vy = st ? -(4 + Math.random() * 4) : -(2 + Math.random() * 3);
			return {
				st,
				s: st ? 0.8 + Math.random() * 1.2 : 0.1 + Math.random() * 0.16,
				px: Math.random() * this.vw,
				py: Math.random() * this.vh,
				vx,
				vy,
				ph: Math.random() * 6,
				alpha: 0,
				vis: false,
				rot: st ? Math.atan2(vy, vx) : 0,
				im: st ? streakTexture() : glowTexture(tints[i % 3])
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
		this.bg = bakeDoomWorld(this.S, bx, by, bw, bh, RS);
		this.bgX = bx;
		this.bgY = by;
		this.bgRS = RS;
	}
}
