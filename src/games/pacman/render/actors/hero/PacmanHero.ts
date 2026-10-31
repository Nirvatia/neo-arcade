// Pac-Man, the hero (stage 10.3, from scratch): "hunger awoken as fire", in a stylised,
// hand-painted VFX style. What gives him life:
// - a painted body: a crisp shadow shape, hue-shifted shading (red-orange shadows, pale gold
//   light), a hard highlight, a bounce light, a rim light from behind and brush texture;
//   the key light stays fixed in the world while he turns; ink that is thicker on the
//   shadow side;
// - his signature: a core of light deep in his mouth that spills out when he opens it;
// - acting: curved lips with a grin (the jaw drops more than the lid), a fast open and a
//   biting close, breathing and the odd snap of the jaws at rest; the body stays round,
//   its size on a spring (a small punch on every bite, a crouch before the burst and an
//   overshoot after it);
// - the energizer as a beat: wind-up (he crouches, the core charges), burst (a white flash
//   of the silhouette, a ring and impact rays), the new look (white-hot, molten cracks,
//   painted flames streaming back), calming down slowly as the power ends;
// - a trail of a few streaming strands that waves, with embers drifting off it.
// Frame space: he faces +x, his top is -y, units are body radii.
import type { RGB, RibbonLayer } from './RibbonTrail';
import { RibbonTrail } from './RibbonTrail';

export interface HeroState {
	/** Centre, css px. */
	readonly x: number;
	readonly y: number;
	/** Heading, radians (0 = right). */
	readonly angle: number;
	readonly moving: boolean;
	readonly power: boolean;
	/** The power is running out. */
	readonly ending: boolean;
	/** He was caught: the death plays once, from when this turns true. */
	readonly dying?: boolean;
	/** Just respawned: ghosts pass through him. */
	readonly invulnerable?: boolean;
}

interface Palette {
	readonly light: RGB;
	readonly mid: RGB;
	readonly shadow: RGB;
	readonly deep: RGB;
	readonly bounce: RGB;
	readonly ink: RGB;
	readonly highlight: RGB;
	readonly rim: RGB;
}

const CALM: Palette = {
	light: [255, 230, 128],
	mid: [255, 192, 48],
	shadow: [228, 104, 30],
	deep: [132, 34, 14],
	bounce: [255, 120, 70],
	ink: [40, 12, 4],
	highlight: [255, 252, 232],
	rim: [255, 238, 176]
};
const AWOKEN: Palette = {
	light: [255, 251, 230],
	mid: [255, 218, 96],
	shadow: [238, 80, 24],
	deep: [150, 18, 8],
	bounce: [255, 90, 40],
	ink: [58, 6, 4],
	highlight: [255, 255, 255],
	rim: [255, 210, 130]
};

const mix = (a: RGB, b: RGB, k: number): RGB => [
	a[0] + (b[0] - a[0]) * k,
	a[1] + (b[1] - a[1]) * k,
	a[2] + (b[2] - a[2]) * k
];
const css = (c: RGB, a = 1): string =>
	`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
const easeIn = (t: number): number => Math.pow(clamp01(t), 3);

/** The key light, fixed in the world: from the upper left. */
const LIGHT = (() => {
	const n = Math.hypot(-0.55, -0.83);
	return { x: -0.55 / n, y: -0.83 / n };
})();

/** A damped spring towards a target: overshoot and settle. */
class Spring {
	value: number;
	velocity = 0;
	constructor(value: number) {
		this.value = value;
	}
	step(target: number, dt: number, stiffness = 260, damping = 16): void {
		const a = (target - this.value) * stiffness - this.velocity * damping;
		this.velocity += a * dt;
		this.value += this.velocity * dt;
	}
}

/** Molten veins when he is awoken: from the mouth's hinge back over the body, body radii. */
const CRACKS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
	[
		[-0.12, -0.06],
		[-0.34, -0.2],
		[-0.5, -0.44],
		[-0.58, -0.66]
	],
	[
		[-0.12, 0.06],
		[-0.36, 0.22],
		[-0.52, 0.46],
		[-0.56, 0.7]
	],
	[
		[-0.14, 0],
		[-0.46, 0.02],
		[-0.74, -0.06],
		[-0.9, -0.02]
	],
	[
		[-0.5, -0.44],
		[-0.72, -0.4]
	],
	[
		[-0.52, 0.46],
		[-0.76, 0.42]
	]
];

/** Brush texture: a few hundred short soft strokes, light and dark, made once. */
let brush: HTMLCanvasElement | null = null;
function brushTexture(): HTMLCanvasElement {
	if (brush) return brush;
	const c = document.createElement('canvas');
	c.width = c.height = 256;
	const x = c.getContext('2d') as CanvasRenderingContext2D;
	let seed = 7;
	const rnd = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
	x.lineCap = 'round';
	for (let i = 0; i < 260; i++) {
		const px = rnd() * 256;
		const py = rnd() * 256;
		const a = -0.6 + (rnd() - 0.5) * 0.5;
		const len = 18 + rnd() * 36;
		x.strokeStyle =
			rnd() < 0.5 ? `rgba(255,255,255,${0.25 + rnd() * 0.3})` : `rgba(0,0,0,${0.2 + rnd() * 0.25})`;
		x.lineWidth = 3 + rnd() * 7;
		x.beginPath();
		x.moveTo(px, py);
		x.quadraticCurveTo(
			px + Math.cos(a) * len * 0.5 + 4,
			py + Math.sin(a) * len * 0.5 - 4,
			px + Math.cos(a) * len,
			py + Math.sin(a) * len
		);
		x.stroke();
	}
	brush = c;
	return c;
}

const glowCache = new Map<string, HTMLCanvasElement>();
function glow(c: RGB): HTMLCanvasElement {
	const key = c.join(',');
	let g = glowCache.get(key);
	if (!g) {
		g = document.createElement('canvas');
		g.width = g.height = 64;
		const x = g.getContext('2d') as CanvasRenderingContext2D;
		const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
		gr.addColorStop(0, css(c, 1));
		gr.addColorStop(0.3, css(c, 0.5));
		gr.addColorStop(1, css(c, 0));
		x.fillStyle = gr;
		x.fillRect(0, 0, 64, 64);
		glowCache.set(key, g);
	}
	return g;
}

/** The painted disc spans ±DISC_SPAN body radii (room for the ink-free soft edge). */
const DISC_SPAN = 1.15;
const LIGHT_STEPS = 32;
const POWER_STEPS = 6;
const discCache = new Map<string, HTMLCanvasElement>();

/**
 * The body's painting (base, crisp shadow shape, deep shadow, bounce, brush texture, rim
 * light, highlight) for a body radius in device px, the light's angle in his frame and the
 * look, cached by quantised light and look: drawn once, reused every frame.
 */
function paintedDisc(deviceR: number, lightAngle: number, power: number): HTMLCanvasElement {
	const R = Math.max(4, Math.round(deviceR));
	const step = Math.round((((lightAngle / (Math.PI * 2)) % 1) + 1) * LIGHT_STEPS) % LIGHT_STEPS;
	const look = Math.round(clamp01(power) * POWER_STEPS);
	const key = `${R}:${step}:${look}`;
	let c = discCache.get(key);
	if (c) return c;
	if (discCache.size > 600) discCache.clear();
	const a = (step / LIGHT_STEPS) * Math.PI * 2;
	const lx = Math.cos(a);
	const ly = Math.sin(a);
	const pal = mixPal(CALM, AWOKEN, look / POWER_STEPS);
	const p = look / POWER_STEPS;
	c = document.createElement('canvas');
	c.width = c.height = Math.ceil(R * DISC_SPAN * 2);
	const ctx = c.getContext('2d') as CanvasRenderingContext2D;
	ctx.translate(c.width / 2, c.height / 2);
	ctx.beginPath();
	ctx.arc(0, 0, R, 0, Math.PI * 2);
	ctx.clip();
	const base = ctx.createLinearGradient(lx * R, ly * R, -lx * R, -ly * R);
	base.addColorStop(0, css(pal.light));
	base.addColorStop(0.45, css(pal.mid));
	base.addColorStop(1, css(mix(pal.mid, pal.shadow, 0.6)));
	ctx.fillStyle = base;
	ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	// the shadow shape: a crisp crescent away from the light
	ctx.beginPath();
	ctx.rect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6);
	ctx.arc(lx * R * 0.3, ly * R * 0.3, R * 1.0, 0, Math.PI * 2);
	ctx.fillStyle = css(pal.shadow, 0.88);
	ctx.fill('evenodd');
	const deep = ctx.createRadialGradient(
		-lx * R * 0.95,
		-ly * R * 0.95,
		0,
		-lx * R * 0.95,
		-ly * R * 0.95,
		R * 0.95
	);
	deep.addColorStop(0, css(pal.deep, 0.6));
	deep.addColorStop(1, css(pal.deep, 0));
	ctx.fillStyle = deep;
	ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	// bounce light in the shadow, so the ball stays round
	ctx.beginPath();
	ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2);
	ctx.arc(-lx * R * 0.13, -ly * R * 0.13, R * 0.97, 0, Math.PI * 2);
	ctx.fillStyle = css(pal.bounce, 0.45);
	ctx.fill('evenodd');
	ctx.globalAlpha = 0.16;
	ctx.globalCompositeOperation = 'soft-light';
	ctx.drawImage(brushTexture(), -R, -R, R * 2, R * 2);
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 1;
	// rim light from behind (the frame's -x): the energy pushing him on
	ctx.globalCompositeOperation = 'lighter';
	ctx.beginPath();
	ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2);
	ctx.arc(R * 0.09, 0, R * 1.0, 0, Math.PI * 2);
	ctx.fillStyle = css(pal.rim, 0.5 + 0.3 * p);
	ctx.fill('evenodd');
	ctx.globalCompositeOperation = 'source-over';
	// the hard painted highlight
	const hx = lx * R * 0.52;
	const hy = ly * R * 0.52;
	ctx.fillStyle = css(pal.highlight, 0.95);
	ctx.beginPath();
	ctx.ellipse(hx, hy, R * 0.25, R * 0.12, a + Math.PI / 2, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(
		hx + lx * R * 0.2 - ly * R * 0.18,
		hy + ly * R * 0.2 + lx * R * 0.18,
		R * 0.05,
		0,
		Math.PI * 2
	);
	ctx.fill();
	discCache.set(key, c);
	return c;
}

let flames: [HTMLCanvasElement, HTMLCanvasElement] | null = null;
/** A flame tongue pointing +x, its root at the left edge: an outer glow and a hot inner one. */
function flameSprites(): [HTMLCanvasElement, HTMLCanvasElement] {
	if (flames) return flames;
	const make = (stops: Array<[number, string]>) => {
		const c = document.createElement('canvas');
		c.width = 128;
		c.height = 48;
		const x = c.getContext('2d') as CanvasRenderingContext2D;
		const g = x.createLinearGradient(0, 0, 128, 0);
		for (const [o, col] of stops) g.addColorStop(o, col);
		x.fillStyle = g;
		x.beginPath();
		x.moveTo(0, 2);
		x.quadraticCurveTo(58, 2, 128, 24);
		x.quadraticCurveTo(58, 46, 0, 46);
		x.quadraticCurveTo(-6, 24, 0, 2);
		x.fill();
		return c;
	};
	flames = [
		make([
			[0, 'rgba(255,140,30,1)'],
			[1, 'rgba(220,40,0,0)']
		]),
		make([
			[0, 'rgba(255,248,210,1)'],
			[0.45, 'rgba(255,170,50,0.9)'],
			[1, 'rgba(230,60,10,0)']
		])
	];
	return flames;
}

let core: HTMLCanvasElement | null = null;
/** The light in his mouth: white-hot at the centre, gold, then a dark red rim. */
function coreSprite(): HTMLCanvasElement {
	if (core) return core;
	core = document.createElement('canvas');
	core.width = core.height = 128;
	const x = core.getContext('2d') as CanvasRenderingContext2D;
	const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
	g.addColorStop(0, 'rgba(255,252,236,1)');
	g.addColorStop(0.3, 'rgba(255,210,100,0.9)');
	g.addColorStop(0.75, 'rgba(240,100,25,0.5)');
	g.addColorStop(1, 'rgba(120,20,5,0)');
	x.fillStyle = g;
	x.fillRect(0, 0, 128, 128);
	return core;
}

interface Ember {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	hot: boolean;
}

interface Burst {
	t: number;
	x: number;
	y: number;
	angle: number;
}

const CHOMP_RATE = 4.2;
/** Death: a hit (0..0.3), the mouth opens all the way round (to 1.3), he bursts into embers. */
const DEATH_OPEN = 0.3;
const DEATH_POP = 1.3;
const DEATH_END = 1.75;
const CHARGE = 0.18;

export class PacmanHero {
	private r = 20;
	private x = 0;
	private y = 0;
	private angle = 0;
	private flip = 1;
	private lastH = 1;
	private moving = false;
	private time = 0;
	/** The awoken look, 0..1. */
	private power = 0;
	private powerOn = false;
	private ending = false;
	/** Seconds since the energizer was taken (the wind-up and burst), or -1. */
	private transform = -1;
	/** Seconds into the death, or -1. */
	private dying = -1;
	private invulnerable = false;
	private chomp = 0;
	private bite = -1;
	private snap = -1;
	private nextSnap = 2.4;
	private snaps = 0;
	/**
	 * His size on a spring: he always stays round (a stretched ellipse looks inorganic in
	 * motion, the owner's review); bites, the wind-up and the burst pulse the whole body.
	 */
	private readonly size = new Spring(1);
	private flash = 0;
	private mouthFlash = 0;
	private readonly trail = new RibbonTrail();
	private embers: Ember[] = [];
	private bursts: Burst[] = [];
	private travelled = 0;
	private seed = 11;

	setRadius(r: number): void {
		this.r = r;
	}

	reset(): void {
		this.trail.reset();
		this.embers = [];
		this.bursts = [];
		this.power = 0;
		this.powerOn = false;
		this.transform = -1;
	}

	private random(): number {
		this.seed = (this.seed * 16807) % 2147483647;
		return this.seed / 2147483647;
	}

	/** He eats something small: a quick wind-up, a snapping bite, a punch of the body. */
	/** A dot: just a small glow at the lips (the run's chomp already bites). */
	gulp(): void {
		this.mouthFlash = Math.max(this.mouthFlash, 0.3);
	}

	eat(): void {
		this.bite = 0;
	}

	update(dt: number, s: HeroState): void {
		if (!Number.isFinite(dt) || dt < 0) dt = 0;
		this.time += dt;
		this.invulnerable = Boolean(s.invulnerable);
		if (s.dying) {
			if (this.dying < 0) {
				this.dying = 0;
				this.flash = 0.8;
				this.bite = -1;
			}
			const before = this.dying;
			this.dying += dt;
			if (before < DEATH_POP && this.dying >= DEATH_POP) {
				for (let i = 0; i < 26; i++) {
					this.spawnEmber(this.power > 0.5, (i / 26) * Math.PI * 2, 4 + this.random() * 7);
				}
			}
			this.trail.shrink(this.r * 10 * dt);
			this.size.step(1, dt);
			this.flash = Math.max(0, this.flash - dt / 0.3);
			this.tick(dt);
			return;
		}
		if (this.dying >= 0) {
			this.reset();
			this.dying = -1;
		}
		const step = Math.hypot(s.x - this.x, s.y - this.y);
		this.x = s.x;
		this.y = s.y;
		this.angle = s.angle;
		this.moving = s.moving;
		this.ending = s.ending;
		if (Math.abs(Math.cos(s.angle)) > 0.5) this.lastH = Math.cos(s.angle) > 0 ? 1 : -1;
		const vertical = Math.abs(Math.sin(s.angle)) > 0.5;
		this.flip = (vertical ? this.lastH : Math.cos(s.angle) > 0 ? 1 : -1) < 0 ? -1 : 1;

		// the energizer: wind-up, burst, then the look eases in; easing out slowly at the end
		if (s.power && !this.powerOn) this.transform = 0;
		this.powerOn = s.power;
		// at rest he breathes; running he keeps his size
		let sizeTarget = this.moving ? 1 : 1 + 0.015 * Math.sin(this.time * 2.3);
		if (this.transform >= 0) {
			const before = this.transform;
			this.transform += dt;
			if (this.transform < CHARGE) {
				sizeTarget = 0.88;
			} else if (before < CHARGE) {
				this.flash = 1;
				this.size.velocity += 5;
				this.bursts.push({ t: 0, x: this.x, y: this.y, angle: this.angle });
				for (let i = 0; i < 18; i++)
					this.spawnEmber(true, (i / 18) * Math.PI * 2, 7 + this.random() * 6);
			}
			if (this.transform > 1.2) this.transform = -1;
		}
		const awake = this.powerOn && (this.transform < 0 || this.transform >= CHARGE);
		const rate = awake ? 1 / 0.3 : 1 / 0.7;
		this.power +=
			Math.sign((awake ? 1 : 0) - this.power) *
			Math.min(Math.abs((awake ? 1 : 0) - this.power), dt * rate);

		// the jaws
		if (this.moving) {
			const before = this.chomp % 1;
			this.chomp += dt * CHOMP_RATE * (1 + 0.25 * this.power);
			const after = this.chomp % 1;
			// the bite closes at 0.75 of the cycle: a little punch, felt more than seen
			if (before < 0.75 && after >= 0.75) {
				this.size.velocity -= 0.5;
			}
		} else if (this.snap < 0 && this.bite < 0 && this.time > this.nextSnap) {
			this.snap = 0;
			this.snaps += 1;
			this.nextSnap = this.time + 2.2 + (this.snaps % 3) * 0.9;
		}
		if (this.snap >= 0) {
			this.snap += dt;
			if (this.snap > 0.34) this.snap = -1;
		}
		if (this.bite >= 0) {
			const before = this.bite;
			this.bite += dt;
			if (before < 0.12 && this.bite >= 0.12) {
				this.size.velocity -= 2.2;
				this.mouthFlash = 1;
			}
			if (this.bite > 0.26) this.bite = -1;
		}
		this.size.step(sizeTarget, dt);
		this.flash = Math.max(0, this.flash - dt / 0.16);
		this.mouthFlash = Math.max(0, this.mouthFlash - dt / 0.2);

		// the trail and embers, by distance travelled
		const r = this.r;
		this.trail.push(s.x, s.y, r * 0.34, r * (4.2 + 1.4 * this.power), r * 3);
		if (!this.moving) this.trail.shrink(r * 7 * dt);
		if (step < r * 3) {
			this.travelled += step;
			const every = r * (this.power > 0.5 ? 0.45 : 1.1);
			while (this.travelled > every) {
				this.travelled -= every;
				const a = this.angle + Math.PI + (this.random() - 0.5) * 1.2;
				this.spawnEmber(this.power > 0.5, a, 1.5 + this.random() * 2.5, true);
			}
		}
		this.tick(dt);
	}

	/** Embers drift up and fade; bursts run their course. */
	private tick(dt: number): void {
		const r = this.r;
		for (const e of this.embers) {
			e.life -= dt;
			e.x += e.vx * dt;
			e.y += e.vy * dt;
			const drag = Math.pow(0.9, dt * 60);
			e.vx *= drag;
			e.vy = e.vy * drag - r * 0.8 * dt;
		}
		this.embers = this.embers.filter((e) => e.life > 0);
		for (const b of this.bursts) b.t += dt;
		this.bursts = this.bursts.filter((b) => b.t < 0.5);
	}

	private spawnEmber(hot: boolean, angle: number, speed: number, fromBack = false): void {
		const r = this.r;
		const ox = fromBack ? -Math.cos(this.angle) * r * 0.8 : Math.cos(angle) * r * 0.7;
		const oy = fromBack ? -Math.sin(this.angle) * r * 0.8 : Math.sin(angle) * r * 0.7;
		const life = 0.4 + this.random() * 0.45;
		this.embers.push({
			x: this.x + ox + (this.random() - 0.5) * r * 0.5,
			y: this.y + oy + (this.random() - 0.5) * r * 0.5,
			vx: Math.cos(angle) * speed * r,
			vy: Math.sin(angle) * speed * r,
			life,
			max: life,
			size: r * (0.06 + this.random() * 0.06),
			hot
		});
	}

	/** How open the jaws are, 0..1.15. */
	private openness(): number {
		if (this.bite >= 0) {
			const t = this.bite;
			if (t < 0.08) return 0.3 + 0.85 * easeOut(t / 0.08);
			if (t < 0.12) return 1.15 * (1 - easeIn((t - 0.08) / 0.04));
			return 0.25 * easeOut((t - 0.12) / 0.14);
		}
		if (this.moving) {
			const f = this.chomp % 1;
			if (f < 0.3) return 0.05 + 0.95 * easeOut(f / 0.3);
			if (f < 0.4) return 1;
			if (f < 0.75) return 0.05 + 0.95 * (1 - easeIn((f - 0.4) / 0.35));
			return 0.05;
		}
		const rest = 0.2 + 0.035 * Math.sin(this.time * 2.3);
		if (this.snap >= 0) {
			const t = this.snap;
			if (t < 0.09) return rest + (0.75 - rest) * easeOut(t / 0.09);
			if (t < 0.15) return 0.75 * (1 - easeIn((t - 0.09) / 0.06));
			return rest * easeOut((t - 0.15) / 0.19);
		}
		return rest;
	}

	draw(ctx: CanvasRenderingContext2D): void {
		const r = this.r;
		const p = this.power;
		const pal = mixPal(CALM, AWOKEN, p);
		const pulse = this.ending && p > 0.5 ? 0.62 + 0.38 * (0.5 + 0.5 * Math.cos(this.time * 5)) : 1;

		this.drawTrail(ctx, p);
		const d = this.dying;
		if (d >= DEATH_POP) {
			this.drawEmbers(ctx);
			// the last of him: a fading flare where he was
			const k = clamp01((d - DEATH_POP) / (DEATH_END - DEATH_POP));
			if (k < 1) {
				const gs = r * (1.2 + 2.2 * easeOut(k));
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = 1 - k;
				ctx.drawImage(glow([255, 214, 120]), this.x - gs, this.y - gs, gs * 2, gs * 2);
				ctx.globalAlpha = 1;
				ctx.globalCompositeOperation = 'source-over';
			}
			return;
		}
		this.drawEmbers(ctx);

		const open = this.openness();
		let m = 0.04 + Math.min(1.15, open) * 0.58;
		let grin = this.moving ? 0.08 : 0.2;
		let S = 1 + 0.07 * p;
		if (d >= 0) {
			// dying: the mouth opens all the way round as he shrinks
			const k = clamp01((d - DEATH_OPEN) / (DEATH_POP - DEATH_OPEN));
			const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
			m = 0.3 + (Math.PI - 0.3) * e;
			grin = 0;
			S *= 1 - 0.25 * e;
		}
		const mu = Math.min(Math.PI - 0.01, m * (1 - grin));
		const md = Math.min(Math.PI - 0.01, m * (1 + grin));
		// the light, in the frame (it stays put in the world while he turns)
		const ca = Math.cos(this.angle);
		const sa = Math.sin(this.angle);
		const lx = LIGHT.x * ca + LIGHT.y * sa;
		const ly = (-LIGHT.x * sa + LIGHT.y * ca) * this.flip;

		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.rotate(this.angle);
		ctx.scale(this.size.value * S, this.size.value * S * this.flip);
		const R = r;

		// behind: the aura and the flames of the awoken
		if (p > 0.01) this.drawFlames(ctx, R, p * pulse);
		const charge = this.transform >= 0 && this.transform < CHARGE ? this.transform / CHARGE : 0;
		const aura = Math.max(p * 0.55 * pulse, charge * 0.8);
		if (aura > 0.01) {
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = aura;
			ctx.drawImage(glow([255, 170, 60]), -R * 2.1, -R * 2.1, R * 4.2, R * 4.2);
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'source-over';
		}

		// the core of light inside the mouth: behind the body, seen through the open mouth
		const coreA = Math.min(1, clamp01(open * 1.4) * (0.85 + 0.15 * p) + charge * 0.6);
		if (coreA > 0.01) {
			ctx.globalAlpha = coreA;
			ctx.drawImage(coreSprite(), R * 0.1 - R * 0.92, -R * 0.92, R * 1.84, R * 1.84);
			ctx.globalAlpha = 1;
		}

		// the body: ink (one path), then the painted disc with the mouth cut out
		const A = { x: -0.1 * R, y: 0 };
		const U = { x: Math.cos(mu) * R, y: -Math.sin(mu) * R };
		const Dn = { x: Math.cos(md) * R, y: Math.sin(md) * R };
		const bend = R * 0.09 * clamp01(m * 2.5);
		ctx.save();
		ctx.translate(-lx * R * 0.045, -ly * R * 0.045);
		ctx.scale(1.075, 1.075);
		ctx.beginPath();
		ctx.moveTo(U.x, U.y);
		ctx.arc(0, 0, R, -mu, md, true);
		ctx.quadraticCurveTo((Dn.x + A.x) / 2, (Dn.y + A.y) / 2 - bend, A.x, A.y);
		ctx.quadraticCurveTo((U.x + A.x) / 2, (U.y + A.y) / 2 + bend, U.x, U.y);
		ctx.closePath();
		ctx.fillStyle = css(pal.ink);
		ctx.fill();
		ctx.restore();
		const body = this.composeBody(R, lx, ly, p, pulse, mu, md, bend);
		ctx.drawImage(body.canvas, -body.half, -body.half, body.half * 2, body.half * 2);

		// lips: ink along the cut
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		ctx.moveTo(Dn.x * 0.97, Dn.y * 0.97);
		ctx.quadraticCurveTo((Dn.x + A.x) / 2, (Dn.y + A.y) / 2 - bend, A.x, A.y);
		ctx.quadraticCurveTo((U.x + A.x) / 2, (U.y + A.y) / 2 + bend, U.x * 0.97, U.y * 0.97);
		ctx.strokeStyle = css(pal.ink);
		ctx.lineWidth = R * 0.075;
		ctx.stroke();
		ctx.restore();

		// the light spilling out of the open mouth: a soft glow at the lips, not a beam
		const spill = clamp01(open) * (0.45 + 0.4 * p) + this.mouthFlash * 0.6;
		if (spill > 0.01) {
			const fx = this.x + Math.cos(this.angle) * R * 0.75;
			const fy = this.y + Math.sin(this.angle) * R * 0.75;
			const gs = R * (1.1 + 0.5 * clamp01(open) + 0.3 * p);
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = Math.min(1, spill);
			ctx.drawImage(glow([255, 196, 90]), fx - gs, fy - gs, gs * 2, gs * 2);
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'source-over';
		}
		// just respawned: a soft pulsing halo instead of blinking
		if (this.invulnerable && d < 0) {
			const k = 0.5 + 0.5 * Math.cos(this.time * 9);
			ctx.strokeStyle = `rgba(255,248,220,${0.25 + 0.35 * k})`;
			ctx.lineWidth = Math.max(1, R * 0.1);
			ctx.beginPath();
			ctx.arc(this.x, this.y, R * (1.3 + 0.08 * k), 0, Math.PI * 2);
			ctx.stroke();
		}
		this.drawBursts(ctx);
	}

	private scratch: HTMLCanvasElement | null = null;

	/**
	 * The body this frame: the cached painted disc for this light and look, with the mouth
	 * cut out, molten veins and the flash added, in a small scratch canvas. Only plain
	 * image draws and Porter-Duff operations: no clipping, no blend modes, no gradients.
	 */
	private composeBody(
		R: number,
		lx: number,
		ly: number,
		p: number,
		pulse: number,
		mu: number,
		md: number,
		bend: number
	): { canvas: HTMLCanvasElement; half: number } {
		const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
		const disc = paintedDisc(R * dpr, Math.atan2(ly, lx), p);
		const size = disc.width;
		if (!this.scratch || this.scratch.width !== size) {
			this.scratch = document.createElement('canvas');
			this.scratch.width = this.scratch.height = size;
		}
		const sc = this.scratch.getContext('2d') as CanvasRenderingContext2D;
		const k = size / 2 / (R * DISC_SPAN);
		sc.setTransform(1, 0, 0, 1, 0, 0);
		sc.globalCompositeOperation = 'source-over';
		sc.globalAlpha = 1;
		sc.clearRect(0, 0, size, size);
		sc.drawImage(disc, 0, 0);
		sc.setTransform(k, 0, 0, k, size / 2, size / 2);
		// the mouth: everything past the lips goes
		const A = { x: -0.1 * R, y: 0 };
		const U = { x: Math.cos(mu) * R, y: -Math.sin(mu) * R };
		const Dn = { x: Math.cos(md) * R, y: Math.sin(md) * R };
		sc.globalCompositeOperation = 'destination-out';
		sc.beginPath();
		sc.moveTo(A.x, A.y);
		sc.quadraticCurveTo((U.x + A.x) / 2, (U.y + A.y) / 2 + bend, U.x, U.y);
		sc.lineTo(Math.cos(mu) * R * 1.3, -Math.sin(mu) * R * 1.3);
		sc.arc(0, 0, R * 1.3, -mu, md, false);
		sc.lineTo(Dn.x, Dn.y);
		sc.quadraticCurveTo((Dn.x + A.x) / 2, (Dn.y + A.y) / 2 - bend, A.x, A.y);
		sc.closePath();
		sc.fill();
		sc.globalCompositeOperation = 'source-atop';
		if (p > 0.01) this.drawCracks(sc, R, p * pulse);
		if (this.flash > 0) {
			sc.fillStyle = `rgba(255,255,250,${this.flash})`;
			sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		}
		sc.globalCompositeOperation = 'source-over';
		return { canvas: this.scratch, half: R * DISC_SPAN };
	}

	private drawTrail(ctx: CanvasRenderingContext2D, p: number): void {
		// three strands each: the wide glow layer cost a big gradient fill every frame
		const calm: RibbonLayer[] = [
			{
				width: 0.36,
				offset: 0.34,
				wave: 0.28,
				phase: 0,
				stops: [
					[0, [255, 236, 160], 0.85],
					[0.6, [255, 170, 60], 0.45],
					[1, [255, 120, 30], 0]
				]
			},
			{
				width: 0.3,
				offset: -0.32,
				wave: 0.3,
				phase: 2.1,
				stops: [
					[0, [255, 226, 140], 0.8],
					[0.6, [255, 160, 50], 0.4],
					[1, [255, 110, 30], 0]
				]
			},
			{
				width: 0.22,
				offset: 0,
				wave: 0.22,
				phase: 4.2,
				stops: [
					[0, [255, 250, 220], 0.95],
					[0.5, [255, 210, 120], 0.55],
					[1, [255, 160, 60], 0]
				]
			}
		];
		const awoken: RibbonLayer[] = [
			{
				width: 0.5,
				offset: 0.4,
				wave: 0.4,
				phase: 0,
				stops: [
					[0, [255, 250, 220], 0.95],
					[0.5, [255, 150, 40], 0.6],
					[1, [220, 40, 0], 0]
				]
			},
			{
				width: 0.44,
				offset: -0.38,
				wave: 0.42,
				phase: 2.1,
				stops: [
					[0, [255, 244, 200], 0.9],
					[0.5, [255, 130, 30], 0.55],
					[1, [210, 30, 0], 0]
				]
			},
			{
				width: 0.3,
				offset: 0,
				wave: 0.3,
				phase: 4.2,
				stops: [
					[0, [255, 255, 245], 1],
					[0.5, [255, 220, 130], 0.7],
					[1, [255, 120, 30], 0]
				]
			}
		];
		if (p < 0.99) this.trail.draw(ctx, this.r, calm, 1 - p, this.time);
		if (p > 0.01) this.trail.draw(ctx, this.r, awoken, p, this.time);
	}

	private drawEmbers(ctx: CanvasRenderingContext2D): void {
		for (const e of this.embers) {
			const u = e.life / e.max;
			const a = Math.min(1, (1 - u) * 5) * u;
			const s = e.size * (0.5 + 0.5 * u);
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = a * 0.8;
			const g = glow(e.hot ? [255, 190, 80] : [255, 170, 60]);
			ctx.drawImage(g, e.x - s * 3, e.y - s * 3, s * 6, s * 6);
			ctx.globalCompositeOperation = 'source-over';
			ctx.globalAlpha = a;
			ctx.fillStyle = e.hot ? 'rgba(255,250,225,1)' : 'rgba(255,230,160,1)';
			ctx.beginPath();
			ctx.arc(e.x, e.y, s * 0.6, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	/** Painted flame tongues streaming back from his head, swaying (no noise: no flicker). */
	private drawFlames(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		const t = this.time;
		const [outer, inner] = flameSprites();
		for (const pass of [0, 1]) {
			ctx.globalCompositeOperation = pass === 0 ? 'lighter' : 'source-over';
			const img = pass === 0 ? outer : inner;
			for (let i = 0; i < 7; i++) {
				const a = Math.PI + (i - 3) * 0.36;
				const rx = Math.cos(a) * R * 0.8;
				const ry = Math.sin(a) * R * 0.8;
				// blown back, away from the heading, swaying
				const sway = 0.22 * Math.sin(t * 4.4 + i * 1.3);
				const dir = Math.atan2(Math.sin(a) * 0.8, Math.cos(a) - 0.9) + sway;
				const len =
					R *
					(0.75 + 0.3 * Math.sin(t * 5.2 + i * 1.9) + 0.15 * Math.sin(t * 8.3 + i)) *
					k *
					(pass === 0 ? 1.25 : 1);
				const w = R * (pass === 0 ? 0.6 : 0.4) * (1 - Math.abs(i - 3) * 0.08);
				if (len <= 0.5) continue;
				ctx.save();
				ctx.translate(rx, ry);
				ctx.rotate(dir);
				ctx.globalAlpha = pass === 0 ? 0.6 * k : k;
				ctx.drawImage(img, 0, -w / 2, len, w);
				ctx.restore();
			}
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawCracks(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		const line = () => {
			ctx.beginPath();
			for (const c of CRACKS) {
				ctx.moveTo(c[0][0] * R, c[0][1] * R);
				for (let i = 1; i < c.length; i++) ctx.lineTo(c[i][0] * R, c[i][1] * R);
			}
		};
		// drawn with the caller's composite (source-atop in the body's scratch canvas)
		ctx.strokeStyle = `rgba(255,130,40,${0.5 * k})`;
		ctx.lineWidth = R * 0.09;
		line();
		ctx.stroke();
		ctx.strokeStyle = `rgba(255,250,215,${k})`;
		ctx.lineWidth = R * 0.025;
		line();
		ctx.stroke();
	}

	/** The burst of the awakening: a painted ring and impact rays. */
	private drawBursts(ctx: CanvasRenderingContext2D): void {
		const R = this.r;
		for (const b of this.bursts) {
			const k = b.t / 0.5;
			const ease = easeOut(k);
			const a = 1 - k;
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = `rgba(255,200,110,${0.35 * a})`;
			ctx.lineWidth = R * 0.32 * a;
			ctx.beginPath();
			ctx.arc(0, 0, R * (1 + 2.6 * ease), 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalCompositeOperation = 'source-over';
			ctx.strokeStyle = `rgba(255,252,235,${0.95 * a})`;
			ctx.lineWidth = Math.max(1, R * 0.1 * a);
			ctx.stroke();
			// impact rays: quick, tapered
			const ra = clamp01(1 - b.t / 0.25);
			if (ra > 0) {
				ctx.fillStyle = `rgba(255,248,220,${ra})`;
				for (let i = 0; i < 10; i++) {
					const an = b.angle + (i / 10) * Math.PI * 2 + 0.3;
					const r0 = R * (1.15 + ease * 0.6);
					const r1 = R * (1.9 + ease * 1.6) * (i % 2 ? 0.8 : 1);
					const w = R * 0.07;
					const cx = Math.cos(an);
					const cy = Math.sin(an);
					ctx.beginPath();
					ctx.moveTo(cx * r0 - cy * w, cy * r0 + cx * w);
					ctx.lineTo(cx * r1, cy * r1);
					ctx.lineTo(cx * r0 + cy * w, cy * r0 - cx * w);
					ctx.closePath();
					ctx.fill();
				}
			}
			ctx.restore();
		}
	}
}

function mixPal(a: Palette, b: Palette, k: number): Palette {
	return {
		light: mix(a.light, b.light, k),
		mid: mix(a.mid, b.mid, k),
		shadow: mix(a.shadow, b.shadow, k),
		deep: mix(a.deep, b.deep, k),
		bounce: mix(a.bounce, b.bounce, k),
		ink: mix(a.ink, b.ink, k),
		highlight: mix(a.highlight, b.highlight, k),
		rim: mix(a.rim, b.rim, k)
	};
}
