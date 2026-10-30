// A character as a baked sprite (stage 10.3/10.4). The body is painted per pixel at a high
// resolution (volume, surface, outline), in a few looping surface frames, for the normal and
// the powered look, then shrunk to the tile's size. Every frame only draws images: the
// mouth is cut out of the body in a scratch canvas (a clean edge with a warm glow inside),
// the trail is one ribbon, particles leave by distance or on events, and the energizer's
// transformation crossfades the two looks. Subclasses give the designs.
//
// Frame space: the actor faces +x, its top is -y, units are body radii; `flip` mirrors y so
// the top stays up after the actor turns round (and keeps the last mirror going up or down).
import type { RGB } from './bakeKit';
import { context, downscale, glowSprite, makeCanvas, paintDisc, rgba } from './bakeKit';
import type { RibbonLayer } from './RibbonTrail';
import { RibbonTrail } from './RibbonTrail';
import { Particles } from './Particles';

export type SpriteEvent = 'dot' | 'energizer' | 'ghost' | 'teleport' | 'death' | 'revive';

export interface SpriteState {
	/** Centre, css px. */
	readonly x: number;
	readonly y: number;
	/** Heading, radians (0 = right). */
	readonly angle: number;
	readonly moving: boolean;
	/** The energizer is on. */
	readonly power: boolean;
	/** ...and running out. */
	readonly ending: boolean;
}

interface Baked {
	/** Device px per body radius. */
	readonly unit: number;
	/** Body frames by look (0 normal, 1 powered). */
	readonly body: readonly [HTMLCanvasElement[], HTMLCanvasElement[]];
	readonly extra: readonly [HTMLCanvasElement, HTMLCanvasElement] | null;
	readonly corona: HTMLCanvasElement[] | null;
}

interface Ring {
	x: number;
	y: number;
	kind: 'dot' | 'pill' | 'ghost' | 'warp';
	t: number;
	max: number;
	spin: number;
}

/** Baked canvases span ±2 body radii round the centre. */
const SPAN = 2;
const POWER_EASE = 0.3;
const DEATH_TIME = 2;
const SHADOW = glowSprite([20, 10, 0]);

const cache = new Map<string, Baked>();

/** A position in a loop of `n` frames, always in [0, n). */
function cycle(t: number, n: number): number {
	const f = ((t % n) + n) % n;
	return Number.isFinite(f) ? f : 0;
}

export abstract class CharacterSprite {
	protected x = 0;
	protected y = 0;
	protected angle = 0;
	protected flip = 1;
	private lastH = 1;
	protected moving = false;
	protected time = 0;
	/** Energizer look 0..1, eased. */
	protected power = 0;
	private ending = false;
	private mouthPhase = 0;
	protected r = 10;
	private dpr = 1;
	private baked: Baked | null = null;
	private scratch: HTMLCanvasElement | null = null;
	protected readonly trail = new RibbonTrail();
	protected readonly particles: Particles;
	private readonly rings: Ring[] = [];
	private travelled = 0;
	private deathClock = 0;
	/** Seconds into the death, or -1. */
	protected dying = -1;
	private flash = 0;
	private flashMax = 1;

	protected constructor(seed: number) {
		this.particles = new Particles(220, seed);
	}

	// ── the design ──
	protected abstract readonly id: string;
	protected abstract readonly surfaceFrames: number;
	/** Surface frames per second. */
	protected abstract readonly surfaceRate: number;
	protected abstract readonly mouthMax: number;
	protected abstract readonly mouthSpeed: number;
	/** The body's colour at a unit-disc point, for a look and a surface frame. */
	protected abstract shader(look: 0 | 1, frame: number): (x: number, y: number, z: number) => RGB;
	protected abstract outline(look: 0 | 1): RGB;
	/** The open mouth's glow: centre and rim colours with their alphas. */
	protected abstract mouthGlow(look: 0 | 1): readonly [RGB, number, RGB, number];
	protected abstract trailLayers(look: 0 | 1): readonly RibbonLayer[];
	/** Trail length in body radii. */
	protected abstract readonly trailLength: number;
	/** Paints things attached to the body (her bow) on a hi-res frame canvas, R = radius. */
	protected paintExtra?(ctx: CanvasRenderingContext2D, R: number, look: 0 | 1): void;
	/** Paints one frame of a flame or halo behind the body, on a hi-res frame canvas. */
	protected paintCorona?(
		ctx: CanvasRenderingContext2D,
		R: number,
		frame: number,
		frames: number
	): void;
	/** Every `trailEmit` radii travelled; spawn particles behind. */
	protected abstract emitWhileMoving(): void;
	protected abstract emitOnEvent(event: SpriteEvent): void;
	/** During the collapse, every few hundredths of a second: jets of particles. */
	protected abstract emitWhileDying(): void;
	/** Live decorations over the body (in world space), e.g. her stars. */
	protected drawOver?(ctx: CanvasRenderingContext2D): void;
	protected readonly coronaFrames: number = 8;
	protected readonly trailEmit: number = 1;

	/** Body radius in css px and the device pixel ratio; rebakes when they change. */
	setSize(r: number, dpr: number): void {
		this.r = r;
		this.dpr = dpr;
		const unit = Math.max(4, Math.round(r * dpr));
		const key = `${this.id}:${unit}`;
		let baked = cache.get(key);
		if (!baked) {
			baked = this.bake(unit);
			cache.set(key, baked);
		}
		this.baked = baked;
		const side = Math.ceil(unit * SPAN * 2);
		if (!this.scratch || this.scratch.width !== side) {
			this.scratch = makeCanvas(side, side);
		}
	}

	private bake(unit: number): Baked {
		const hiR = Math.max(96, Math.ceil(unit * 1.3));
		const hiSide = Math.ceil(hiR * SPAN * 2);
		const side = Math.ceil(unit * SPAN * 2);
		const frame = (paint: (ctx: CanvasRenderingContext2D) => void) => {
			const c = makeCanvas(hiSide, hiSide);
			const ctx = context(c);
			ctx.translate(hiSide / 2, hiSide / 2);
			paint(ctx);
			return downscale(c, side, side);
		};
		const looks = [0, 1] as const;
		const body = looks.map((look) =>
			Array.from({ length: this.surfaceFrames }, (_, k) => {
				const disc = paintDisc(
					Math.ceil(hiR * 2 + 4),
					hiR,
					this.shader(look, k),
					this.outline(look),
					0.09
				);
				return frame((ctx) => ctx.drawImage(disc, -disc.width / 2, -disc.height / 2));
			})
		) as unknown as [HTMLCanvasElement[], HTMLCanvasElement[]];
		const extra = this.paintExtra
			? (looks.map((look) => frame((ctx) => this.paintExtra?.(ctx, hiR, look))) as unknown as [
					HTMLCanvasElement,
					HTMLCanvasElement
				])
			: null;
		const corona = this.paintCorona
			? Array.from({ length: this.coronaFrames }, (_, k) =>
					frame((ctx) => this.paintCorona?.(ctx, hiR, k, this.coronaFrames))
				)
			: null;
		return { unit, body, extra, corona };
	}

	reset(): void {
		this.trail.reset();
		this.particles.reset();
		this.rings.length = 0;
		this.dying = -1;
		this.power = 0;
		this.flash = 0;
	}

	update(dt: number, s: SpriteState): void {
		// a frame's timestamp can come before the previous one: never step back in time
		if (!Number.isFinite(dt) || dt < 0) dt = 0;
		this.time += dt;
		const dx = s.x - this.x;
		const dy = s.y - this.y;
		const step = Math.hypot(dx, dy);
		this.x = s.x;
		this.y = s.y;
		this.angle = s.angle;
		this.moving = s.moving;
		this.ending = s.ending;
		if (Math.abs(Math.cos(s.angle)) > 0.5) this.lastH = Math.cos(s.angle) > 0 ? 1 : -1;
		const vertical = Math.abs(Math.sin(s.angle)) > 0.5;
		this.flip = (vertical ? this.lastH : Math.cos(s.angle) > 0 ? 1 : -1) < 0 ? -1 : 1;
		const target = s.power ? 1 : 0;
		this.power +=
			Math.sign(target - this.power) * Math.min(Math.abs(target - this.power), dt / POWER_EASE);
		if (this.moving) this.mouthPhase += dt * this.mouthSpeed * (1 + 0.35 * this.power);
		this.flash = Math.max(0, this.flash - dt);

		if (this.dying >= 0) {
			this.dying += dt;
			this.trail.shrink(this.r * 12 * dt);
			if (this.dying >= 0.3 && this.dying < 1.8) {
				this.deathClock += dt;
				const every = 0.06 - Math.min(1, (this.dying - 0.3) / 1.5) * 0.035;
				while (this.deathClock > every) {
					this.deathClock -= every;
					this.emitWhileDying();
				}
			}
		} else {
			this.trail.push(
				s.x,
				s.y,
				this.r * 0.25,
				this.r * this.trailLength * (1 + 0.3 * this.power),
				this.r * 3
			);
			if (!this.moving) this.trail.shrink(this.r * 6 * dt);
			if (step < this.r * 3) {
				this.travelled += step;
				while (this.travelled > this.r * this.trailEmit) {
					this.travelled -= this.r * this.trailEmit;
					this.emitWhileMoving();
				}
			}
		}
		this.particles.update(dt);
		for (let i = this.rings.length - 1; i >= 0; i--) {
			this.rings[i].t += dt;
			if (this.rings[i].t >= this.rings[i].max) this.rings.splice(i, 1);
		}
	}

	/** A game moment: eating, the energizer, a ghost, a teleport (at the exit), dying. */
	trigger(event: SpriteEvent): void {
		if (event === 'death') {
			if (this.dying < 0) {
				this.dying = 0;
				this.deathClock = 0;
			}
		} else if (event === 'revive') {
			this.reset();
		} else if (event === 'dot') {
			const a = this.angle;
			this.ring(
				'dot',
				this.x + Math.cos(a) * this.r * 0.9,
				this.y + Math.sin(a) * this.r * 0.9,
				0.22
			);
		} else if (event === 'energizer') {
			this.ring('pill', this.x, this.y, 0.55);
			this.flash = this.flashMax = 0.45;
		} else if (event === 'ghost') {
			this.ring('ghost', this.x, this.y, 0.45);
			this.flash = this.flashMax = 0.4;
		} else if (event === 'teleport') {
			this.ring('warp', this.x, this.y, 0.4);
			this.trail.reset();
		}
		this.emitOnEvent(event);
	}

	private ring(kind: Ring['kind'], x: number, y: number, max: number): void {
		this.rings.push({ x, y, kind, t: 0, max, spin: this.particles.random() * Math.PI });
	}

	/** The mouth's half-opening, radians. */
	protected mouthAngle(): number {
		if (this.dying >= 0) return 0.06;
		const open = this.moving ? Math.abs(Math.sin(this.mouthPhase)) : 0.22;
		return Math.max(0.06, open * this.mouthMax * (1 + 0.15 * this.power));
	}

	/** The body's scale this frame: power swell, death convulsion and collapse. */
	protected bodyScale(): number {
		let s = 1 + 0.08 * this.power;
		if (this.dying >= 0) {
			const d = this.dying;
			if (d < 0.3) s *= 1 + Math.sin(d * 45) * 0.1 * (1 - d / 0.3);
			else s *= Math.max(0, 1 - ((d - 0.3) / 1.5) * 0.88);
		}
		return s;
	}

	/** The look actually drawn: power, a calm blink at its end, white-hot while dying. */
	protected look(): number {
		let p = this.power;
		if (this.ending && p > 0.5) p = 0.55 + 0.45 * (0.5 + 0.5 * Math.cos(this.time * 9));
		if (this.dying >= 0.3) p = Math.max(p, Math.min(1, (this.dying - 0.3) / 1.2));
		return p;
	}

	draw(ctx: CanvasRenderingContext2D): void {
		const baked = this.baked;
		const scratch = this.scratch;
		if (!baked || !scratch) return;
		if (this.dying >= DEATH_TIME) {
			this.particles.draw(ctx);
			return;
		}
		const r = this.r;
		const p = this.look();
		const scale = this.bodyScale();

		// trail, then a soft contact shadow
		const layersN = this.trailLayers(0);
		const layersP = this.trailLayers(1);
		this.trail.draw(ctx, r, layersN, 1 - this.power);
		this.trail.draw(ctx, r, layersP, this.power);
		ctx.globalAlpha = 0.32 * Math.min(1, scale);
		ctx.drawImage(
			SHADOW,
			this.x - r * 1.1 + r * 0.12,
			this.y - r * 0.55 + r * 0.42,
			r * 2.2,
			r * 1.1
		);
		ctx.globalAlpha = 1;

		// the body with its mouth cut, composed in the frame canvas
		const sx = context(scratch);
		const side = scratch.width;
		const u = baked.unit;
		const c = side / 2;
		sx.setTransform(1, 0, 0, 1, 0, 0);
		sx.globalCompositeOperation = 'source-over';
		sx.globalAlpha = 1;
		sx.clearRect(0, 0, side, side);
		const n = this.surfaceFrames;
		const f = cycle(this.time * this.surfaceRate, n);
		const k0 = Math.floor(f);
		const k1 = (k0 + 1) % n;
		const blend = f - k0;
		const layer = (look: 0 | 1, alpha: number) => {
			if (alpha <= 0.001) return;
			sx.globalAlpha = alpha;
			sx.drawImage(baked.body[look][k0], 0, 0);
			if (n > 1) {
				sx.globalAlpha = alpha * blend;
				sx.drawImage(baked.body[look][k1], 0, 0);
			}
		};
		layer(0, 1);
		layer(1, p);
		sx.globalAlpha = 1;
		const m = this.mouthAngle();
		const wedge = () => {
			sx.beginPath();
			sx.moveTo(c - u * 0.08, c);
			sx.lineTo(c + Math.cos(m) * u * 1.2, c + Math.sin(m) * u * 1.2);
			sx.lineTo(c + Math.cos(-m) * u * 1.2, c + Math.sin(-m) * u * 1.2);
			sx.closePath();
		};
		sx.globalCompositeOperation = 'destination-out';
		wedge();
		sx.fill();
		sx.globalCompositeOperation = 'source-over';
		// a warm glow inside the open mouth
		const [g0, a0, g1, a1] = this.mouthGlow(p > 0.5 ? 1 : 0);
		sx.save();
		wedge();
		sx.clip();
		const glow = sx.createRadialGradient(c, c, 0, c, c, u * 0.92);
		glow.addColorStop(0, rgba(g0, a0));
		glow.addColorStop(1, rgba(g1, a1));
		sx.fillStyle = glow;
		sx.beginPath();
		sx.arc(c, c, u * 0.92, 0, Math.PI * 2);
		sx.fill();
		sx.restore();
		// the lips: the outline continues along the cut
		const line = this.outline(p > 0.5 ? 1 : 0);
		sx.strokeStyle = rgba(line, 0.9);
		sx.lineWidth = Math.max(1, u * 0.1);
		sx.lineCap = 'round';
		sx.beginPath();
		sx.moveTo(c + Math.cos(m) * u * 0.96, c + Math.sin(m) * u * 0.96);
		sx.lineTo(c - u * 0.06, c);
		sx.lineTo(c + Math.cos(-m) * u * 0.96, c + Math.sin(-m) * u * 0.96);
		sx.stroke();

		// into the world: corona behind, body, then what the body wears
		const css = side / this.dpr;
		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.rotate(this.angle);
		ctx.scale(scale, scale * this.flip);
		if (baked.corona && p > 0.01) {
			const cf = cycle(this.time * 12, baked.corona.length);
			ctx.globalAlpha = p;
			ctx.drawImage(baked.corona[Math.floor(cf)], -css / 2, -css / 2, css, css);
			ctx.globalAlpha = p * (cf - Math.floor(cf));
			ctx.drawImage(
				baked.corona[(Math.floor(cf) + 1) % baked.corona.length],
				-css / 2,
				-css / 2,
				css,
				css
			);
			ctx.globalAlpha = 1;
		}
		ctx.drawImage(scratch, -css / 2, -css / 2, css, css);
		if (baked.extra) {
			ctx.drawImage(baked.extra[0], -css / 2, -css / 2, css, css);
			if (p > 0.001) {
				ctx.globalAlpha = p;
				ctx.drawImage(baked.extra[1], -css / 2, -css / 2, css, css);
				ctx.globalAlpha = 1;
			}
		}
		ctx.restore();
		this.drawOver?.(ctx);

		// event flashes and rings
		if (this.flash > 0) {
			const a = this.flash / this.flashMax;
			const g = this.flashGlow();
			ctx.globalAlpha = a * 0.75;
			const s = r * (1.6 + (1 - a) * 1.4);
			ctx.drawImage(g, this.x - s, this.y - s, s * 2, s * 2);
			ctx.globalAlpha = 1;
		}
		this.drawRings(ctx);
		this.drawDeath(ctx);
		this.particles.draw(ctx);
	}

	private glowCache: HTMLCanvasElement | null = null;
	private flashGlow(): HTMLCanvasElement {
		if (!this.glowCache) this.glowCache = glowSprite(this.ringColor());
		return this.glowCache;
	}

	/** The colour of rings and flashes. */
	protected abstract ringColor(): RGB;

	private drawRings(ctx: CanvasRenderingContext2D): void {
		const col = this.ringColor();
		const r = this.r;
		for (const ring of this.rings) {
			const k = ring.t / ring.max;
			const a = 1 - k;
			const ease = 1 - Math.pow(1 - k, 3);
			ctx.lineCap = 'round';
			if (ring.kind === 'dot') {
				ctx.strokeStyle = rgba(col, a * 0.9);
				ctx.lineWidth = Math.max(1, r * 0.12 * a);
				ctx.beginPath();
				ctx.arc(ring.x, ring.y, r * 0.4 * (1 - ease * 0.8), 0, Math.PI * 2);
				ctx.stroke();
			} else if (ring.kind === 'pill' || ring.kind === 'ghost') {
				const R = r * (ring.kind === 'pill' ? 3.4 : 2.4) * ease;
				ctx.strokeStyle = rgba(col, a * 0.35);
				ctx.lineWidth = r * 0.5 * a;
				ctx.beginPath();
				ctx.arc(ring.x, ring.y, R, 0, Math.PI * 2);
				ctx.stroke();
				ctx.strokeStyle = rgba([255, 255, 245], a * 0.9);
				ctx.lineWidth = Math.max(1, r * 0.12 * a);
				ctx.stroke();
			} else {
				// a swirl closing in: the warp
				const R = r * 1.8 * (1 - ease * 0.7);
				for (let i = 0; i < 10; i++) {
					const an = ring.spin + (i / 10) * Math.PI * 2 + ease * 4;
					ctx.strokeStyle = rgba(i % 3 === 0 ? [255, 255, 245] : col, a * 0.8);
					ctx.lineWidth = Math.max(1, r * (i % 3 === 0 ? 0.12 : 0.07) * a);
					ctx.beginPath();
					ctx.arc(ring.x, ring.y, R * (0.55 + (0.45 * ((i * 7) % 10)) / 10), an, an + 0.9);
					ctx.stroke();
				}
			}
		}
	}

	/** The end of the collapse: a pop of light, then a fading flash. */
	private drawDeath(ctx: CanvasRenderingContext2D): void {
		const d = this.dying;
		if (d < 1.5) return;
		const g = this.flashGlow();
		const k = Math.min(1, (d - 1.5) / 0.5);
		const a = d < 1.8 ? 1 : 1 - (d - 1.8) / 0.2;
		const s = this.r * (0.6 + k * 3.2);
		ctx.globalAlpha = Math.max(0, a) * 0.85;
		ctx.drawImage(g, this.x - s, this.y - s, s * 2, s * 2);
		ctx.globalAlpha = 1;
	}

	/** Behind the actor, at its back edge. */
	protected backPoint(spread = 0.6): { x: number; y: number; angle: number } {
		const rnd = this.particles.random;
		const angle = this.angle + Math.PI + (rnd() - 0.5) * spread;
		return {
			x: this.x - Math.cos(this.angle) * this.r * 0.75,
			y: this.y - Math.sin(this.angle) * this.r * 0.75,
			angle
		};
	}
}
