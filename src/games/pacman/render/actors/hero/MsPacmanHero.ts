// Ms. Pac-Man, the heroine (stage 10.4): starlight to his fire. Rose candy with peach light and
// lilac shadows; cute through a glossy dark eye with lashes (it blinks, squints happily on a
// bite, sparkles when powered), her bow, red lipstick and a blush, a smaller and softer mouth
// that nibbles quickly and smiles at rest, and a pink glow in her mouth. Her bow lives on a
// spring: it lags behind on turns and bites and sways at rest. Pac-Man keeps no eyes.
// Powered she blooms into starlight: pearl white with lavender shadows and an iridescent rim,
// her bow luminous, stars circling her. Her trail is pastel ribbons shedding twinkles;
// caught, she spins away and bursts into hearts and stars. The machinery is the shared Hero.
import type { RGB } from './RibbonTrail';
import type { HeroDesign, Palette, Particle, ParticleKind } from './Hero';
import { Hero, Spring, css, glow, mix } from './Hero';

const CALM: Palette = {
	light: [255, 240, 228],
	mid: [255, 186, 188],
	shadow: [212, 104, 156],
	deep: [112, 34, 92],
	bounce: [255, 150, 196],
	ink: [70, 14, 46],
	highlight: [255, 255, 255],
	rim: [255, 222, 242]
};
const STARLIGHT: Palette = {
	light: [255, 255, 255],
	mid: [255, 230, 242],
	shadow: [184, 140, 232],
	deep: [96, 60, 150],
	bounce: [200, 176, 255],
	ink: [74, 30, 96],
	highlight: [255, 255, 255],
	rim: [214, 242, 255]
};

/** Her bow: on top of the head, a little behind, on the head's outline. */
const BOW_ANGLE = -0.72 * Math.PI;
const BOW_DISTANCE = 0.8;

let core: HTMLCanvasElement | null = null;
/** The light in her mouth: pearl white, pink, then a soft rose rim. */
function coreSprite(): HTMLCanvasElement {
	if (core) return core;
	core = document.createElement('canvas');
	core.width = core.height = 128;
	const x = core.getContext('2d') as CanvasRenderingContext2D;
	const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
	g.addColorStop(0, 'rgba(255,250,252,1)');
	g.addColorStop(0.3, 'rgba(255,176,214,0.9)');
	g.addColorStop(0.75, 'rgba(236,84,156,0.5)');
	g.addColorStop(1, 'rgba(120,20,70,0)');
	x.fillStyle = g;
	x.fillRect(0, 0, 128, 128);
	return core;
}

const bowCache = new Map<string, HTMLCanvasElement>();
const BOW_SPAN = 1.1;

/**
 * The bow painted once per size, light direction (in the bow's own frame, 16 steps) and look:
 * two rounded loops and two tails round a knot, a crisp shadow shape away from the light, a
 * highlight on the loops, ink thicker on the shadow side. Its own frame: the knot at the
 * centre, up (-y) pointing away from her head.
 */
function paintedBow(deviceR: number, lightAngle: number, look: 0 | 1): HTMLCanvasElement {
	const R = Math.max(4, Math.round(deviceR));
	const step = Math.round((((lightAngle / (Math.PI * 2)) % 1) + 1) * 16) % 16;
	const key = `${R}:${step}:${look}`;
	let c = bowCache.get(key);
	if (c) return c;
	if (bowCache.size > 200) bowCache.clear();
	const a = (step / 16) * Math.PI * 2;
	const lx = Math.cos(a);
	const ly = Math.sin(a);
	c = document.createElement('canvas');
	c.width = c.height = Math.ceil(R * BOW_SPAN * 2);
	const ctx = c.getContext('2d') as CanvasRenderingContext2D;
	ctx.translate(c.width / 2, c.height / 2);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	const base: RGB = look ? [255, 236, 250] : [236, 30, 76];
	const shade: RGB = look ? [196, 160, 246] : [156, 10, 52];
	const knotC: RGB = look ? [255, 214, 110] : [204, 18, 62];
	const ink: RGB = look ? [84, 40, 110] : [70, 6, 26];
	const loop = (side: number) => {
		// a rounded teardrop from the knot, out to the side and a little up
		const ux = Math.cos(-0.22 * side) * side;
		const uy = Math.sin(-0.22 * side) * side * side;
		const px = -uy;
		const py = ux;
		const len = R * 0.62;
		const wid = R * 0.3;
		const ex = ux * len;
		const ey = uy * len - R * 0.06;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.bezierCurveTo(
			ux * len * 0.25 + px * wid * 1.1,
			uy * len * 0.25 + py * wid * 1.1,
			ex + px * wid * 1.05,
			ey + py * wid * 1.05,
			ex + ux * R * 0.06,
			ey + uy * R * 0.06
		);
		ctx.bezierCurveTo(
			ex - px * wid * 1.05,
			ey - py * wid * 1.05,
			ux * len * 0.25 - px * wid * 1.1,
			uy * len * 0.25 - py * wid * 1.1,
			0,
			0
		);
		ctx.closePath();
	};
	const tail = (side: number) => {
		ctx.beginPath();
		ctx.moveTo(-R * 0.06 * side, R * 0.04);
		ctx.lineTo(R * 0.22 * side, R * 0.42);
		ctx.lineTo(R * 0.12 * side, R * 0.36);
		ctx.lineTo(R * 0.05 * side, R * 0.44);
		ctx.lineTo(R * 0.06 * side, R * 0.04);
		ctx.closePath();
	};
	const knot = () => {
		ctx.beginPath();
		ctx.ellipse(0, 0, R * 0.17, R * 0.15, 0, 0, Math.PI * 2);
	};
	const parts = [() => tail(-1), () => tail(1), () => loop(-1), () => loop(1), knot];
	// ink, thicker on the side away from the light
	ctx.save();
	ctx.translate(-lx * R * 0.035, -ly * R * 0.035);
	ctx.fillStyle = css(ink);
	ctx.strokeStyle = css(ink);
	ctx.lineWidth = R * 0.12;
	for (const part of parts) {
		part();
		ctx.fill();
		ctx.stroke();
	}
	ctx.restore();
	for (const [i, part] of parts.entries()) {
		part();
		ctx.fillStyle = css(i < 2 ? mix(base, shade, 0.35) : i === 4 ? knotC : base);
		ctx.fill();
		// the shadow shape: the part shifted towards the light, cut out of a shaded copy
		ctx.save();
		part();
		ctx.clip();
		ctx.beginPath();
		ctx.rect(-R * 2, -R * 2, R * 4, R * 4);
		ctx.save();
		ctx.translate(lx * R * 0.1, ly * R * 0.1);
		part();
		ctx.restore();
		ctx.fillStyle = css(shade, 0.85);
		ctx.fill('evenodd');
		ctx.restore();
	}
	// satin highlights on the loops and a glint on the knot
	ctx.strokeStyle = 'rgba(255,255,255,0.85)';
	ctx.lineWidth = R * 0.05;
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(side * R * 0.16 + lx * R * 0.05, -R * 0.1 + ly * R * 0.05);
		ctx.quadraticCurveTo(
			side * R * 0.38 + lx * R * 0.08,
			-R * 0.26 + ly * R * 0.08,
			side * R * 0.56 + lx * R * 0.04,
			-R * 0.14 + ly * R * 0.04
		);
		ctx.stroke();
	}
	ctx.fillStyle = 'rgba(255,255,255,0.9)';
	ctx.beginPath();
	ctx.arc(lx * R * 0.06, ly * R * 0.06, R * 0.045, 0, Math.PI * 2);
	ctx.fill();
	bowCache.set(key, c);
	return c;
}

const DESIGN: HeroDesign = {
	id: 'ms-pacman',
	calm: CALM,
	awoken: STARLIGHT,
	// a smaller, softer mouth than his: fully open about 72 degrees
	mouthSpan: 0.58,
	grinRest: 0.1,
	grinRun: 0.04,
	chompRate: 4.8,
	core: coreSprite,
	spill: [255, 170, 214],
	aura: [214, 176, 255],
	flare: [255, 210, 240],
	trailCalm: [
		{
			width: 0.32,
			offset: 0.3,
			wave: 0.32,
			phase: 0,
			stops: [
				[0, [255, 214, 232], 0.85],
				[0.6, [240, 150, 200], 0.42],
				[1, [214, 140, 230], 0]
			]
		},
		{
			width: 0.28,
			offset: -0.3,
			wave: 0.34,
			phase: 2.1,
			stops: [
				[0, [255, 226, 210], 0.8],
				[0.6, [214, 170, 240], 0.4],
				[1, [190, 150, 240], 0]
			]
		},
		{
			width: 0.2,
			offset: 0,
			wave: 0.24,
			phase: 4.2,
			stops: [
				[0, [255, 250, 252], 0.95],
				[0.5, [255, 196, 224], 0.55],
				[1, [240, 160, 210], 0]
			]
		}
	],
	trailAwoken: [
		{
			width: 0.46,
			offset: 0.38,
			wave: 0.4,
			phase: 0,
			stops: [
				[0, [255, 255, 255], 0.95],
				[0.5, [200, 180, 255], 0.6],
				[1, [150, 200, 255], 0]
			]
		},
		{
			width: 0.4,
			offset: -0.36,
			wave: 0.42,
			phase: 2.1,
			stops: [
				[0, [255, 246, 252], 0.9],
				[0.5, [255, 180, 220], 0.55],
				[1, [200, 160, 255], 0]
			]
		},
		{
			width: 0.28,
			offset: 0,
			wave: 0.3,
			phase: 4.2,
			stops: [
				[0, [255, 255, 255], 1],
				[0.5, [214, 242, 255], 0.7],
				[1, [255, 200, 240], 0]
			]
		}
	],
	death: 'spin'
};

export class MsPacmanHero extends Hero {
	protected readonly design = DESIGN;
	/** The bow's sway, radians, on a soft spring. */
	private readonly bow = new Spring(0);
	/** Seconds into a blink, or -1; the next blink is due at `nextBlink`. */
	private blink = -1;
	private nextBlink = 1.8;
	private blinks = 0;
	/** A happy squint after a bite, 1 → 0. */
	private squint = 0;

	protected resetLooks(): void {
		this.bow.value = 0;
		this.bow.velocity = 0;
	}

	protected onBite(): void {
		this.bow.velocity += 3.2;
		this.squint = 1;
	}

	protected onTurn(): void {
		this.bow.velocity += this.random() < 0.5 ? 4.5 : -4.5;
	}

	protected afterUpdate(dt: number): void {
		this.bow.step(0.07 * Math.sin(this.time * 2.1), dt, 90, 7);
		this.squint = Math.max(0, this.squint - dt / 0.35);
		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > 0.14) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			// irregular, like a living thing; now and then a double blink
			this.nextBlink = this.time + (this.blinks % 4 === 0 ? 0.3 : 2.2 + (this.blinks % 3) * 1.1);
		}
	}

	/** A blush on the cheek under her eye, painted on the skin (cut with the mouth). */
	protected decorate(sc: CanvasRenderingContext2D, R: number): void {
		sc.globalAlpha = 0.55;
		sc.drawImage(glow([255, 110, 150]), -R * 0.08, -R * 0.36, R * 0.44, R * 0.26);
		sc.globalAlpha = 1;
	}

	/**
	 * Her eye, in profile above the mouth, drawn the cute way (a white with a small iris
	 * looked like a stare, the owner's review): one glossy dark oval, warmer at the bottom,
	 * a big glint and a small one, a soft lid and two lashes curling out. It blinks,
	 * squints after a bite (a happy arc), turns lavender with a star glint when she is
	 * powered and stays shut while she dies.
	 */
	private drawEye(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		// above the upper lip even with the mouth wide open, clear of the bow; at tile size
		// (a small radius) the eye grows a little so it still reads
		const lod = R < 20 ? 1.25 : 1;
		const ex = R * 0.27;
		const ey = -R * (0.54 + (lod - 1) * 0.15);
		const rx = R * 0.15 * lod;
		const ry = R * 0.2 * lod;
		const ink = css(mix([60, 12, 40], [70, 30, 100], p));
		const blinkShut = this.blink >= 0 ? Math.sin((this.blink / 0.14) * Math.PI) : 0;
		const shut = this.dying >= 0 ? 1 : Math.max(blinkShut, this.squint > 0.05 ? 1 : 0);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		if (shut > 0.85) {
			// closed: a happy arc (squint) or a soft smiling line (blink, dying)
			const happy = this.squint > 0.05 && this.dying < 0;
			ctx.strokeStyle = ink;
			ctx.lineWidth = R * 0.075;
			ctx.beginPath();
			if (happy) ctx.arc(ex, ey + ry * 0.4, rx * 1.15, Math.PI * 1.12, Math.PI * 1.88);
			else ctx.arc(ex, ey - ry * 0.4, rx * 1.15, Math.PI * 0.2, Math.PI * 0.8);
			ctx.stroke();
			this.lashes(ctx, ex - rx * 0.95, happy ? ey - ry * 0.2 : ey + ry * 0.35, rx, R, ink);
			return;
		}
		const open = Math.max(0.12, 1 - shut);
		ctx.save();
		ctx.translate(ex, ey);
		ctx.scale(1, open);
		// the eye: a glossy dark oval, warmer and lighter at the bottom
		const g = ctx.createLinearGradient(0, -ry, 0, ry);
		g.addColorStop(0, css(mix([40, 10, 34], [60, 30, 110], p)));
		g.addColorStop(0.6, css(mix([70, 20, 56], [100, 70, 190], p)));
		g.addColorStop(1, css(mix([170, 70, 120], [190, 160, 255], p)));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
		ctx.fill();
		// glints: a big one up front, a small one below
		ctx.fillStyle = 'rgba(255,255,255,1)';
		if (p > 0.3) {
			ctx.beginPath();
			for (let j = 0; j < 4; j++) {
				const an = (j * Math.PI) / 2;
				ctx.lineTo(rx * 0.25 + Math.cos(an) * rx * 0.6, -ry * 0.32 + Math.sin(an) * rx * 0.6);
				ctx.lineTo(
					rx * 0.25 + Math.cos(an + Math.PI / 4) * rx * 0.15,
					-ry * 0.32 + Math.sin(an + Math.PI / 4) * rx * 0.15
				);
			}
			ctx.closePath();
			ctx.fill();
		} else {
			ctx.beginPath();
			ctx.ellipse(rx * 0.22, -ry * 0.34, rx * 0.42, ry * 0.3, -0.3, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.beginPath();
		ctx.arc(-rx * 0.3, ry * 0.42, rx * 0.17, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		// a soft lid over the top
		ctx.strokeStyle = ink;
		ctx.lineWidth = R * 0.06;
		ctx.beginPath();
		ctx.ellipse(ex, ey, rx * 1.08, ry * open * 1.06, 0, Math.PI * 1.05, Math.PI * 1.95);
		ctx.stroke();
		this.lashes(ctx, ex - rx * 0.95, ey - ry * open * 0.35, rx, R, ink);
	}

	/** Two lashes curling out at the back corner of the eye. */
	private lashes(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		rx: number,
		R: number,
		ink: string
	): void {
		ctx.strokeStyle = ink;
		ctx.lineWidth = R * 0.055;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.quadraticCurveTo(x - rx * 0.5, y - rx * 0.1, x - rx * 0.8, y - rx * 0.6);
		ctx.moveTo(x + rx * 0.15, y - rx * 0.35);
		ctx.quadraticCurveTo(x - rx * 0.2, y - rx * 0.6, x - rx * 0.3, y - rx * 1.05);
		ctx.stroke();
	}

	/** Red lipstick with a fine dark edge. */
	protected drawLips(
		ctx: CanvasRenderingContext2D,
		lips: () => void,
		R: number,
		pal: Palette
	): void {
		ctx.strokeStyle = css(pal.ink);
		ctx.lineWidth = R * 0.12;
		lips();
		ctx.stroke();
		ctx.strokeStyle = css(mix([232, 28, 72], [255, 120, 180], this.power));
		ctx.lineWidth = R * 0.07;
		lips();
		ctx.stroke();
	}

	/** Her eye, then the bow swaying on its spring, luminous when powered. */
	protected drawWorn(
		ctx: CanvasRenderingContext2D,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void {
		const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
		const turn = BOW_ANGLE + Math.PI / 2 + this.bow.value;
		// the light in the bow's own frame
		const c = Math.cos(-turn);
		const s = Math.sin(-turn);
		const la = Math.atan2(lx * s + ly * c, lx * c - ly * s);
		const scale = 1 + 0.14 * p;
		ctx.save();
		ctx.translate(Math.cos(BOW_ANGLE) * R * BOW_DISTANCE, Math.sin(BOW_ANGLE) * R * BOW_DISTANCE);
		ctx.rotate(turn);
		ctx.scale(scale, scale);
		const half = R * BOW_SPAN;
		ctx.drawImage(paintedBow(R * dpr, la, 0), -half, -half, half * 2, half * 2);
		if (p > 0.01) {
			ctx.globalAlpha = p;
			ctx.drawImage(paintedBow(R * dpr, la, 1), -half, -half, half * 2, half * 2);
			ctx.globalAlpha = 1;
		}
		ctx.restore();
		// the eye last: on her face, in front of the bow
		this.drawEye(ctx, R, p);
	}

	/** Powered: five stars circling her, twinkling slowly. */
	protected drawFront(ctx: CanvasRenderingContext2D): void {
		const p = this.power;
		if (p <= 0.01 || this.dying >= 0) return;
		const R = this.r;
		for (let i = 0; i < 5; i++) {
			const a = this.time * 1.5 + (i / 5) * Math.PI * 2;
			const x = this.x + Math.cos(a) * R * 1.6;
			const y = this.y + Math.sin(a) * R * 1.6;
			const tw = 0.7 + 0.3 * Math.sin(this.time * 3.5 + i * 1.3);
			this.star(ctx, x, y, R * 0.28 * tw, this.time * 0.6 + i, p);
		}
	}

	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		if (moment === 'trail') return 'star';
		return this.random() < 0.45 ? 'heart' : 'star';
	}

	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		if (e.kind === 'heart') {
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = a * 0.6;
			ctx.drawImage(glow([255, 120, 170]), e.x - s * 3, e.y - s * 3, s * 6, s * 6);
			ctx.globalCompositeOperation = 'source-over';
			ctx.globalAlpha = a;
			const h = s * 1.6;
			ctx.fillStyle = 'rgba(255,72,130,1)';
			ctx.beginPath();
			ctx.moveTo(e.x, e.y + h * 0.9);
			ctx.bezierCurveTo(
				e.x - h * 1.3,
				e.y + h * 0.1,
				e.x - h * 0.9,
				e.y - h * 1.1,
				e.x,
				e.y - h * 0.4
			);
			ctx.bezierCurveTo(
				e.x + h * 0.9,
				e.y - h * 1.1,
				e.x + h * 1.3,
				e.y + h * 0.1,
				e.x,
				e.y + h * 0.9
			);
			ctx.fill();
			return;
		}
		this.star(ctx, e.x, e.y, s * 2, e.spin * (1 - e.life / e.max), a);
	}

	/** A four-pointed twinkle with a soft glow. */
	private star(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		s: number,
		rot: number,
		a: number
	): void {
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = a * 0.7;
		ctx.drawImage(
			glow(this.power > 0.5 ? [210, 190, 255] : [255, 160, 210]),
			x - s * 1.5,
			y - s * 1.5,
			s * 3,
			s * 3
		);
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = a;
		ctx.fillStyle = 'rgba(255,252,255,1)';
		ctx.beginPath();
		for (let j = 0; j < 4; j++) {
			const an = rot + (j * Math.PI) / 2;
			ctx.lineTo(x + Math.cos(an) * s, y + Math.sin(an) * s);
			ctx.lineTo(
				x + Math.cos(an + Math.PI / 4) * s * 0.22,
				y + Math.sin(an + Math.PI / 4) * s * 0.22
			);
		}
		ctx.closePath();
		ctx.fill();
		ctx.globalAlpha = 1;
	}
}
