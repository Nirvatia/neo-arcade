// Three concept pairs for Pac-Man (mighty) and Ms. Pac-Man (cute). Each pair is
// complementary, each has a trail, a bow on her and a transformation under the energizer.
import type { ActorState, CharacterArt, Concept, Point } from './kit';
import {
	along,
	bow,
	heart,
	inFrame,
	mix,
	mouthAngle,
	ribbon,
	star4,
	wedge
} from './kit';

type Stops = ReadonlyArray<readonly [number, readonly number[]]>;

/** A radial body gradient lit from the upper back, blended between two palettes. */
function bodyFill(
	ctx: CanvasRenderingContext2D,
	R: number,
	normal: Stops,
	power: Stops,
	p: number
): CanvasGradient {
	const g = ctx.createRadialGradient(-R * 0.35, -R * 0.42, R * 0.05, 0, 0, R * 1.08);
	normal.forEach(([o, c], i) => g.addColorStop(o, mix(c, power[i][1], p)));
	return g;
}

/** The body: a wide dark outline, then the fill over it. */
function body(
	ctx: CanvasRenderingContext2D,
	R: number,
	half: number,
	line: string,
	lw: number,
	fill: string | CanvasGradient
): void {
	ctx.lineJoin = 'round';
	ctx.strokeStyle = line;
	ctx.lineWidth = lw;
	wedge(ctx, R, half);
	ctx.stroke();
	ctx.fillStyle = fill;
	wedge(ctx, R, half);
	ctx.fill();
}

function glossSpot(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	rx: number,
	ry: number,
	rot: number,
	a = 0.85
): void {
	const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
	g.addColorStop(0, `rgba(255,255,255,${a})`);
	g.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
	ctx.fill();
}

/** The energizer's last seconds: a white flash on the body, on and off. */
function endingFlash(ctx: CanvasRenderingContext2D, s: ActorState, R: number, half: number): void {
	if (s.ending <= 0 || Math.sin(s.t * 22) < 0) return;
	ctx.fillStyle = 'rgba(255,255,255,0.55)';
	wedge(ctx, R, half);
	ctx.fill();
}

/** Seeded jitter, stable within a time slot. */
function jitter(seed: number): number {
	const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

// ───────────────────────── A · Sun and Moon ─────────────────────────

const SUN: Stops = [
	[0, [255, 246, 184]],
	[0.45, [255, 210, 31]],
	[0.85, [242, 154, 0]],
	[1, [179, 84, 0]]
];
const SUN_HOT: Stops = [
	[0, [255, 255, 255]],
	[0.45, [255, 243, 138]],
	[0.85, [255, 160, 30]],
	[1, [230, 70, 0]]
];

const sunPac: CharacterArt = {
	draw(ctx, s) {
		const { r, t } = s;
		const p = s.power;
		// trail: a thick golden ribbon, molten under the energizer, with embers
		ribbon(
			ctx,
			s.trail,
			r * (0.8 + 0.2 * p),
			r * 0.08,
			[
				[0, mix([255, 214, 60], [255, 250, 200], p, 0.9)],
				[0.45, mix([255, 150, 20], [255, 90, 0], p, 0.5)],
				[1, 'rgba(255,90,0,0)']
			],
			r * 0.1 * p,
			t
		);
		if (p > 0.05) {
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			for (let i = 0; i < 7; i++) {
				const at = along(s.trail, r * (0.9 + i * 0.55));
				if (!at) break;
				const a = p * (1 - i / 7) * (0.5 + 0.5 * Math.sin(t * 17 + i * 2));
				ctx.fillStyle = `rgba(255,${180 + i * 8},60,${a})`;
				ctx.beginPath();
				ctx.arc(at.x + Math.sin(t * 9 + i) * r * 0.3, at.y + Math.cos(t * 7 + i) * r * 0.3, r * 0.09, 0, 7);
				ctx.fill();
			}
			ctx.restore();
		}
		inFrame(ctx, s, () => {
			const R = r * (1 + 0.12 * p);
			const half = mouthAngle(s.mouth);
			// the corona: flame spikes turning behind the body
			if (p > 0.01) {
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				ctx.rotate(t * 1.4);
				const g = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 1.45);
				g.addColorStop(0, `rgba(255,255,220,${p})`);
				g.addColorStop(0.5, `rgba(255,190,40,${0.8 * p})`);
				g.addColorStop(1, 'rgba(255,80,0,0)');
				ctx.fillStyle = g;
				ctx.beginPath();
				const n = 12;
				for (let i = 0; i <= n * 2; i++) {
					const a = (i / (n * 2)) * Math.PI * 2;
					const out = i % 2 === 0;
					const rr = out ? R * (1.36 + 0.08 * Math.sin(t * 11 + i)) : R * 0.98;
					ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
				}
				ctx.closePath();
				ctx.fill();
				ctx.restore();
			}
			body(ctx, R, half, '#3d1a00', R * 0.22, bodyFill(ctx, R, SUN, SUN_HOT, p));
			// weight: a warm shade on the lower back
			ctx.save();
			wedge(ctx, R, half);
			ctx.clip();
			const shade = ctx.createRadialGradient(-R * 0.1, R * 0.85, 0, -R * 0.1, R * 0.85, R * 0.9);
			shade.addColorStop(0, `rgba(150,50,0,${0.4 * (1 - p)})`);
			shade.addColorStop(1, 'rgba(150,50,0,0)');
			ctx.fillStyle = shade;
			ctx.fillRect(-R, -R, R * 2, R * 2);
			if (p > 0) {
				ctx.globalCompositeOperation = 'lighter';
				const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
				core.addColorStop(0, `rgba(255,255,230,${0.6 * p})`);
				core.addColorStop(1, 'rgba(255,200,80,0)');
				ctx.fillStyle = core;
				ctx.fillRect(-R, -R, R * 2, R * 2);
			}
			ctx.restore();
			glossSpot(ctx, -R * 0.38, -R * 0.48, R * 0.3, R * 0.16, -0.6);
			ctx.fillStyle = 'rgba(255,255,255,0.95)';
			ctx.beginPath();
			ctx.arc(-R * 0.12, -R * 0.68, R * 0.055, 0, 7);
			ctx.fill();
			endingFlash(ctx, s, R, half);
		});
	}
};

const MOON: Stops = [
	[0, [255, 246, 251]],
	[0.45, [255, 198, 222]],
	[0.85, [247, 143, 189]],
	[1, [201, 85, 143]]
];
const MOON_BRIGHT: Stops = [
	[0, [255, 255, 255]],
	[0.45, [255, 227, 241]],
	[0.85, [255, 177, 214]],
	[1, [228, 122, 176]]
];

const moonMs: CharacterArt = {
	draw(ctx, s) {
		const { r, t } = s;
		const p = s.power;
		// trail: a pastel ribbon that waves, with twinkling stars; a rainbow when powered
		ribbon(
			ctx,
			s.trail,
			r * 0.55,
			r * 0.05,
			p > 0.5
				? [
						[0, 'rgba(255,214,236,0.85)'],
						[0.3, 'rgba(200,190,255,0.6)'],
						[0.6, 'rgba(150,235,230,0.4)'],
						[1, 'rgba(255,240,150,0)']
					]
				: [
						[0, 'rgba(255,190,220,0.8)'],
						[0.6, 'rgba(210,170,255,0.4)'],
						[1, 'rgba(210,170,255,0)']
					],
			r * 0.12,
			t
		);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 4 + Math.round(p * 4); i++) {
			const at = along(s.trail, r * (0.9 + i * 0.7));
			if (!at) break;
			const a = (1 - i / 8) * (0.4 + 0.6 * Math.max(0, Math.sin(t * 6 + i * 1.7)));
			ctx.fillStyle = `rgba(255,250,220,${a})`;
			star4(ctx, at.x, at.y + Math.sin(t * 4 + i) * r * 0.35, r * (0.16 + 0.06 * p));
			ctx.fill();
		}
		ctx.restore();
		inFrame(ctx, s, () => {
			const R = r * 0.94 * (1 + 0.06 * p);
			const half = mouthAngle(s.mouth, 0.48);
			// starlight: a crown of stars circling her
			if (p > 0.01) {
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				for (let i = 0; i < 5; i++) {
					const a = t * 2 + (i / 5) * Math.PI * 2;
					const x = Math.cos(a) * R * 1.5;
					const y = Math.sin(a) * R * 1.5;
					const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.35);
					g.addColorStop(0, `rgba(255,230,250,${0.6 * p})`);
					g.addColorStop(1, 'rgba(255,180,230,0)');
					ctx.fillStyle = g;
					ctx.fillRect(x - R * 0.35, y - R * 0.35, R * 0.7, R * 0.7);
					ctx.fillStyle = `rgba(255,255,240,${p})`;
					star4(ctx, x, y, R * (0.2 + 0.05 * Math.sin(t * 8 + i)));
					ctx.fill();
				}
				ctx.restore();
			}
			body(ctx, R, half, '#5a1846', R * 0.18, bodyFill(ctx, R, MOON, MOON_BRIGHT, p));
			// blush, a happy closed eye with lashes, a beauty mark
			ctx.fillStyle = 'rgba(255,110,160,0.5)';
			ctx.beginPath();
			ctx.ellipse(R * 0.1, -R * 0.2, R * 0.17, R * 0.1, 0, 0, 7);
			ctx.fill();
			ctx.strokeStyle = '#5a1846';
			ctx.lineWidth = R * 0.085;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.arc(-R * 0.02, -R * 0.44, R * 0.15, Math.PI + 0.3, Math.PI * 2 - 0.3);
			ctx.stroke();
			ctx.lineWidth = R * 0.06;
			ctx.beginPath();
			ctx.moveTo(-R * 0.15, -R * 0.5);
			ctx.lineTo(-R * 0.26, -R * 0.6);
			ctx.moveTo(-R * 0.08, -R * 0.57);
			ctx.lineTo(-R * 0.14, -R * 0.7);
			ctx.stroke();
			ctx.fillStyle = '#5a1846';
			ctx.beginPath();
			ctx.arc(R * 0.5, -R * 0.42, R * 0.045, 0, 7);
			ctx.fill();
			glossSpot(ctx, -R * 0.45, -R * 0.2, R * 0.2, R * 0.12, -0.9, 0.75);
			endingFlash(ctx, s, R, half);
			bow(
				ctx,
				-R * 0.32,
				-R * 0.86,
				R * (0.44 + 0.04 * p),
				-0.35,
				p > 0.5 ? '#ff5f8f' : '#ff2e63',
				'#5a0f24',
				'rgba(255,255,255,0.75)',
				true
			);
		});
	}
};

// ───────────────────────── B · Neon pop ─────────────────────────

/** A cel-shaded disc: shade colour, then the base offset up-back, leaving a crescent. */
function celBody(
	ctx: CanvasRenderingContext2D,
	R: number,
	half: number,
	base: string,
	shade: string
): void {
	body(ctx, R, half, '#111111', R * 0.24, shade);
	ctx.save();
	wedge(ctx, R, half);
	ctx.clip();
	ctx.fillStyle = base;
	ctx.beginPath();
	ctx.arc(-R * 0.14, -R * 0.14, R * 0.93, 0, 7);
	ctx.fill();
	ctx.restore();
}

function celShine(ctx: CanvasRenderingContext2D, R: number): void {
	ctx.fillStyle = 'rgba(255,255,255,0.95)';
	ctx.beginPath();
	ctx.ellipse(-R * 0.42, -R * 0.42, R * 0.22, R * 0.09, -0.8, 0, 7);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(-R * 0.66, -R * 0.12, R * 0.05, 0, 7);
	ctx.fill();
}

/** A jagged bolt between two points. */
function bolt(ctx: CanvasRenderingContext2D, a: Point, b: Point, seed: number, amp: number): void {
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	const n = 5;
	const nx = -(b.y - a.y);
	const ny = b.x - a.x;
	const len = Math.hypot(nx, ny) || 1;
	for (let i = 1; i < n; i++) {
		const k = i / n;
		const j = (jitter(seed + i) - 0.5) * 2 * amp;
		ctx.lineTo(a.x + (b.x - a.x) * k + (nx / len) * j, a.y + (b.y - a.y) * k + (ny / len) * j);
	}
	ctx.lineTo(b.x, b.y);
}

const neonPac: CharacterArt = {
	draw(ctx, s) {
		const { r, t } = s;
		const p = s.power;
		// trail: afterimages and speed lines; a crackling bolt when powered
		ctx.save();
		for (const [d, a] of [
			[r * 1.6, 0.28],
			[r * 2.8, 0.14]
		]) {
			const at = along(s.trail, d);
			if (!at) continue;
			ctx.fillStyle = p > 0.5 ? `rgba(120,230,255,${a})` : `rgba(255,225,26,${a})`;
			ctx.beginPath();
			ctx.arc(at.x, at.y, r * 0.85, 0, 7);
			ctx.fill();
		}
		ctx.restore();
		const head = s.trail[0];
		const tail = along(s.trail, r * 4.5) ?? s.trail[s.trail.length - 1];
		if (head && tail) {
			const dx = head.x - tail.x;
			const dy = head.y - tail.y;
			const len = Math.hypot(dx, dy);
			if (len > r) {
				const nx = -dy / len;
				const ny = dx / len;
				ctx.save();
				ctx.lineCap = 'round';
				for (const k of [-0.55, 0, 0.55]) {
					const g = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
					g.addColorStop(0, p > 0.5 ? 'rgba(200,250,255,0.9)' : 'rgba(255,250,200,0.9)');
					g.addColorStop(1, 'rgba(255,255,255,0)');
					ctx.strokeStyle = g;
					ctx.lineWidth = r * (k === 0 ? 0.16 : 0.11);
					ctx.beginPath();
					ctx.moveTo(head.x - (dx / len) * r * 1.1 + nx * k * r, head.y - (dy / len) * r * 1.1 + ny * k * r);
					ctx.lineTo(tail.x + nx * k * r, tail.y + ny * k * r);
					ctx.stroke();
				}
				if (p > 0.05) {
					ctx.globalCompositeOperation = 'lighter';
					const seed = Math.floor(t * 14);
					ctx.strokeStyle = `rgba(90,220,255,${p})`;
					ctx.lineWidth = r * 0.22;
					bolt(ctx, head, tail, seed, r * 0.6);
					ctx.stroke();
					ctx.strokeStyle = `rgba(255,255,255,${p})`;
					ctx.lineWidth = r * 0.07;
					bolt(ctx, head, tail, seed, r * 0.6);
					ctx.stroke();
				}
				ctx.restore();
			}
		}
		inFrame(ctx, s, () => {
			const R = r * (1 + 0.1 * p);
			const half = mouthAngle(s.mouth);
			// overdrive: electric, bolts crackling around the body
			if (p > 0.01) {
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				const halo = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 1.6);
				halo.addColorStop(0, `rgba(90,220,255,${0.55 * p})`);
				halo.addColorStop(1, 'rgba(90,220,255,0)');
				ctx.fillStyle = halo;
				ctx.beginPath();
				ctx.arc(0, 0, R * 1.6, 0, 7);
				ctx.fill();
				const seed = Math.floor(t * 12);
				for (let i = 0; i < 4; i++) {
					const a0 = jitter(seed * 7 + i) * Math.PI * 2;
					const a1 = a0 + 0.9 + jitter(seed + i * 3) * 0.8;
					const pa = { x: Math.cos(a0) * R * 1.08, y: Math.sin(a0) * R * 1.08 };
					const pb = { x: Math.cos(a1) * R * 1.45, y: Math.sin(a1) * R * 1.45 };
					ctx.strokeStyle = `rgba(140,235,255,${p})`;
					ctx.lineWidth = R * 0.12;
					bolt(ctx, pa, pb, seed + i * 11, R * 0.25);
					ctx.stroke();
					ctx.strokeStyle = `rgba(255,255,255,${p})`;
					ctx.lineWidth = R * 0.04;
					bolt(ctx, pa, pb, seed + i * 11, R * 0.25);
					ctx.stroke();
				}
				ctx.restore();
			}
			const base = mix([255, 225, 26], [214, 250, 255], p);
			const shade = mix([240, 160, 0], [30, 160, 230], p);
			celBody(ctx, R, half, base, shade);
			celShine(ctx, R);
			endingFlash(ctx, s, R, half);
		});
	}
};

const neonMs: CharacterArt = {
	draw(ctx, s) {
		const { r, t } = s;
		const p = s.power;
		// trail: a short soft ribbon and hearts popping out of it
		ribbon(
			ctx,
			s.trail,
			r * 0.45,
			r * 0.04,
			[
				[0, p > 0.5 ? 'rgba(255,140,200,0.7)' : 'rgba(255,230,120,0.7)'],
				[1, 'rgba(255,120,170,0)']
			]
		);
		for (let i = 0; i < 4 + Math.round(p * 3); i++) {
			const at = along(s.trail, r * (1.1 + i * 0.85));
			if (!at) break;
			const pop = (t * 1.5 + i * 0.37) % 1;
			const a = (1 - i / 7) * (1 - pop);
			const size = r * (0.2 + 0.18 * pop) * (1 + 0.4 * p);
			ctx.save();
			ctx.lineJoin = 'round';
			ctx.strokeStyle = `rgba(17,17,17,${a})`;
			ctx.lineWidth = size * 0.35;
			heart(ctx, at.x, at.y - pop * r * 0.8, size);
			ctx.stroke();
			ctx.fillStyle = `rgba(255,60,110,${a})`;
			heart(ctx, at.x, at.y - pop * r * 0.8, size);
			ctx.fill();
			ctx.restore();
		}
		inFrame(ctx, s, () => {
			const R = r * 0.95 * (1 + 0.08 * p);
			const half = mouthAngle(s.mouth, 0.5);
			// heart rush: hearts circling and beating
			if (p > 0.01) {
				ctx.save();
				for (let i = 0; i < 6; i++) {
					const a = -t * 1.6 + (i / 6) * Math.PI * 2;
					const beat = 1 + 0.2 * Math.sin(t * 10 + i);
					const x = Math.cos(a) * R * 1.5;
					const y = Math.sin(a) * R * 1.5;
					ctx.strokeStyle = `rgba(17,17,17,${p})`;
					ctx.lineWidth = R * 0.08;
					heart(ctx, x, y, R * 0.2 * beat);
					ctx.stroke();
					ctx.fillStyle = `rgba(255,70,140,${p})`;
					heart(ctx, x, y, R * 0.2 * beat);
					ctx.fill();
				}
				ctx.restore();
			}
			const base = mix([255, 225, 26], [255, 214, 236], p);
			const shade = mix([240, 160, 0], [255, 100, 170], p);
			celBody(ctx, R, half, base, shade);
			// lipstick on the mouth's front edges
			ctx.strokeStyle = '#ff1f3d';
			ctx.lineWidth = R * 0.13;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(Math.cos(half) * R * 0.62, Math.sin(half) * R * 0.62);
			ctx.lineTo(Math.cos(half) * R * 0.95, Math.sin(half) * R * 0.95);
			ctx.moveTo(Math.cos(-half) * R * 0.62, Math.sin(-half) * R * 0.62);
			ctx.lineTo(Math.cos(-half) * R * 0.95, Math.sin(-half) * R * 0.95);
			ctx.stroke();
			// an open eye with lashes, a beauty mark
			ctx.fillStyle = '#ffffff';
			ctx.strokeStyle = '#111111';
			ctx.lineWidth = R * 0.06;
			ctx.beginPath();
			ctx.ellipse(R * 0.06, -R * 0.45, R * 0.15, R * 0.19, 0, 0, 7);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#111111';
			ctx.beginPath();
			ctx.arc(R * 0.11, -R * 0.43, R * 0.09, 0, 7);
			ctx.fill();
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.arc(R * 0.14, -R * 0.47, R * 0.035, 0, 7);
			ctx.fill();
			ctx.strokeStyle = '#111111';
			ctx.lineWidth = R * 0.055;
			ctx.lineCap = 'round';
			ctx.beginPath();
			for (const [x0, y0, x1, y1] of [
				[-0.06, -0.6, -0.16, -0.72],
				[0.02, -0.64, -0.03, -0.78],
				[0.12, -0.64, 0.12, -0.78]
			]) {
				ctx.moveTo(R * x0, R * y0);
				ctx.lineTo(R * x1, R * y1);
			}
			ctx.stroke();
			ctx.fillStyle = '#111111';
			ctx.beginPath();
			ctx.arc(R * 0.5, -R * 0.36, R * 0.045, 0, 7);
			ctx.fill();
			celShine(ctx, R * 0.9);
			endingFlash(ctx, s, R, half);
			bow(ctx, -R * 0.3, -R * 0.86, R * 0.46, -0.3, '#ff1f3d', '#111111', 'rgba(255,255,255,0.9)');
		});
	}
};

// ───────────────────────── C · Heroes with eyes ─────────────────────────

const EMBER: Stops = [
	[0, [255, 236, 140]],
	[0.5, [255, 184, 31]],
	[0.9, [232, 116, 10]],
	[1, [156, 67, 0]]
];
const BLAZE: Stops = [
	[0, [255, 241, 160]],
	[0.5, [255, 120, 30]],
	[0.9, [220, 45, 10]],
	[1, [130, 15, 0]]
];

/** A teardrop flame pointing up from (0, 0), `h` tall. */
function flame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
	ctx.beginPath();
	ctx.moveTo(x - w, y);
	ctx.quadraticCurveTo(x - w, y - h * 0.55, x, y - h);
	ctx.quadraticCurveTo(x + w, y - h * 0.55, x + w, y);
	ctx.quadraticCurveTo(x, y + w * 0.6, x - w, y);
	ctx.closePath();
}

const heroPac: CharacterArt = {
	draw(ctx, s) {
		const { r, t } = s;
		const p = s.power;
		// trail: dust puffs; fire under the energizer
		for (let i = 7; i >= 0; i--) {
			const at = along(s.trail, r * (0.8 + i * 0.5));
			if (!at) continue;
			const k = 1 - i / 8;
			const rr = r * (0.18 + 0.42 * k) * (1 + 0.1 * Math.sin(t * 12 + i));
			const a = 0.55 * k;
			ctx.fillStyle =
				p > 0.5
					? `rgba(255,${Math.round(90 + 120 * k)},${Math.round(30 * k)},${a + 0.2})`
					: `rgba(230,190,130,${a})`;
			ctx.beginPath();
			ctx.arc(at.x + Math.sin(i * 2.1) * r * 0.15, at.y + Math.cos(i * 1.7) * r * 0.15, rr, 0, 7);
			ctx.fill();
		}
		inFrame(ctx, s, () => {
			const R = r * (1 + 0.14 * p);
			const half = mouthAngle(s.mouth);
			// beast mode: a crest of flames along the head
			if (p > 0.01) {
				ctx.save();
				for (let i = 0; i < 4; i++) {
					const a = -Math.PI * 0.5 - 0.95 + i * 0.42;
					const x = Math.cos(a) * R * 0.78;
					const y = Math.sin(a) * R * 0.78;
					const h = R * (0.75 + 0.18 * Math.sin(t * 14 + i * 1.3)) * p;
					ctx.save();
					ctx.translate(x, y);
					ctx.rotate(a + Math.PI / 2 - 0.25);
					const g = ctx.createLinearGradient(0, 0, 0, -h);
					g.addColorStop(0, 'rgba(255,90,0,0.95)');
					g.addColorStop(0.6, 'rgba(255,190,40,0.95)');
					g.addColorStop(1, 'rgba(255,250,200,0.9)');
					ctx.strokeStyle = '#3b1600';
					ctx.lineWidth = R * 0.12;
					flame(ctx, 0, 0, R * 0.2, h);
					ctx.stroke();
					ctx.fillStyle = g;
					flame(ctx, 0, 0, R * 0.2, h);
					ctx.fill();
					ctx.restore();
				}
				ctx.restore();
			}
			body(ctx, R, half, '#3b1600', R * 0.2, bodyFill(ctx, R, EMBER, BLAZE, p));
			glossSpot(ctx, -R * 0.45, -R * 0.35, R * 0.22, R * 0.12, -0.8, 0.7);
			// a determined eye under a heavy brow; glowing white when powered
			ctx.fillStyle = p > 0.5 ? '#fffbe0' : '#ffffff';
			ctx.strokeStyle = '#3b1600';
			ctx.lineWidth = R * 0.06;
			ctx.beginPath();
			ctx.ellipse(R * 0.1, -R * 0.43, R * 0.15, R * 0.15, 0, 0, 7);
			ctx.fill();
			ctx.stroke();
			if (p <= 0.5) {
				ctx.fillStyle = '#1a0a00';
				ctx.beginPath();
				ctx.arc(R * 0.16, -R * 0.42, R * 0.085, 0, 7);
				ctx.fill();
				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(R * 0.19, -R * 0.45, R * 0.03, 0, 7);
				ctx.fill();
			} else {
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				const glow = ctx.createRadialGradient(R * 0.1, -R * 0.43, 0, R * 0.1, -R * 0.43, R * 0.4);
				glow.addColorStop(0, `rgba(255,240,180,${p})`);
				glow.addColorStop(1, 'rgba(255,160,40,0)');
				ctx.fillStyle = glow;
				ctx.fillRect(-R * 0.3, -R * 0.83, R * 0.8, R * 0.8);
				ctx.restore();
			}
			ctx.strokeStyle = '#3b1600';
			ctx.lineWidth = R * 0.12;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(-R * 0.1, -R * 0.68);
			ctx.lineTo(R * 0.3, -R * 0.56);
			ctx.stroke();
			endingFlash(ctx, s, R, half);
		});
	}
};

const LILAC: Stops = [
	[0, [246, 240, 255]],
	[0.45, [205, 184, 255]],
	[0.85, [155, 123, 255]],
	[1, [102, 70, 201]]
];
const FAIRY: Stops = [
	[0, [255, 255, 255]],
	[0.45, [228, 216, 255]],
	[0.85, [190, 165, 255]],
	[1, [140, 110, 230]]
];

const heroMs: CharacterArt = {
	draw(ctx, s) {
		const { r, t } = s;
		const p = s.power;
		// trail: soap bubbles drifting up; sparkles among them when powered
		for (let i = 0; i < 7; i++) {
			const at = along(s.trail, r * (0.9 + i * 0.6));
			if (!at) break;
			const k = 1 - i / 7;
			const rr = r * (0.12 + 0.16 * jitter(i + 3));
			const y = at.y - ((t * 0.8 + i * 0.3) % 1) * r * 0.6;
			ctx.strokeStyle = `rgba(255,255,255,${0.8 * k})`;
			ctx.fillStyle = `rgba(200,190,255,${0.25 * k})`;
			ctx.lineWidth = Math.max(1, r * 0.05);
			ctx.beginPath();
			ctx.arc(at.x + Math.sin(t * 3 + i) * r * 0.25, y, rr, 0, 7);
			ctx.fill();
			ctx.stroke();
			if (p > 0.3 && i % 2 === 0) {
				ctx.fillStyle = `rgba(255,250,210,${p * k})`;
				star4(ctx, at.x, at.y + r * 0.35, r * 0.15);
				ctx.fill();
			}
		}
		inFrame(ctx, s, () => {
			const R = r * 0.94 * (1 + 0.06 * p);
			const half = mouthAngle(s.mouth, 0.48);
			// fairy: translucent wings fluttering behind
			if (p > 0.01) {
				ctx.save();
				const flap = 0.35 * Math.sin(t * 22);
				for (const [rot, size] of [
					[-2.2 + flap, 1],
					[-2.75 - flap, 0.75]
				]) {
					ctx.save();
					ctx.translate(-R * 0.35, -R * 0.35);
					ctx.rotate(rot);
					ctx.beginPath();
					ctx.ellipse(R * 0.75 * size, 0, R * 0.75 * size, R * 0.36 * size, 0, 0, 7);
					ctx.strokeStyle = `rgba(58,36,112,${p})`;
					ctx.lineWidth = R * 0.12;
					ctx.stroke();
					ctx.fillStyle = `rgba(200,235,255,${0.8 * p})`;
					ctx.fill();
					ctx.strokeStyle = `rgba(255,255,255,${0.95 * p})`;
					ctx.lineWidth = R * 0.04;
					ctx.stroke();
					ctx.restore();
				}
				ctx.restore();
			}
			body(ctx, R, half, '#3a2470', R * 0.18, bodyFill(ctx, R, LILAC, FAIRY, p));
			glossSpot(ctx, -R * 0.48, -R * 0.2, R * 0.2, R * 0.12, -0.9, 0.7);
			ctx.fillStyle = 'rgba(255,120,170,0.55)';
			ctx.beginPath();
			ctx.ellipse(R * 0.0, -R * 0.12, R * 0.15, R * 0.09, 0, 0, 7);
			ctx.fill();
			// a big shiny eye with lashes
			ctx.fillStyle = '#ffffff';
			ctx.strokeStyle = '#3a2470';
			ctx.lineWidth = R * 0.06;
			ctx.beginPath();
			ctx.ellipse(R * 0.1, -R * 0.44, R * 0.19, R * 0.23, 0, 0, 7);
			ctx.fill();
			ctx.stroke();
			const iris = ctx.createRadialGradient(R * 0.15, -R * 0.45, 0, R * 0.15, -R * 0.42, R * 0.15);
			iris.addColorStop(0, '#8a5cff');
			iris.addColorStop(1, '#2a1260');
			ctx.fillStyle = iris;
			ctx.beginPath();
			ctx.arc(R * 0.15, -R * 0.42, R * 0.14, 0, 7);
			ctx.fill();
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.arc(R * 0.2, -R * 0.49, R * 0.055, 0, 7);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(R * 0.11, -R * 0.35, R * 0.028, 0, 7);
			ctx.fill();
			ctx.strokeStyle = '#3a2470';
			ctx.lineWidth = R * 0.055;
			ctx.lineCap = 'round';
			ctx.beginPath();
			for (const [x0, y0, x1, y1] of [
				[-0.05, -0.6, -0.17, -0.73],
				[0.04, -0.66, -0.01, -0.81],
				[0.14, -0.67, 0.15, -0.82]
			]) {
				ctx.moveTo(R * x0, R * y0);
				ctx.lineTo(R * x1, R * y1);
			}
			ctx.stroke();
			endingFlash(ctx, s, R, half);
			bow(
				ctx,
				-R * 0.34,
				-R * 0.86,
				R * (0.44 + 0.04 * p),
				-0.35,
				'#ff5fa2',
				'#3a2470',
				'rgba(255,255,255,0.8)',
				true
			);
		});
	}
};

export const CONCEPTS: readonly Concept[] = [
	{
		id: 'A',
		name: 'A · Солнце и Луна',
		note: 'Он — золотое солнце с тяжёлой тенью и огненной короной под энерджайзером; она — розовая луна с закрытым счастливым глазом, звёздами и короной из звёзд.',
		pac: sunPac,
		ms: moonMs
	},
	{
		id: 'B',
		name: 'B · Неон-поп',
		note: 'Классический жёлтый с жирным контуром и cel-тенью; у него шлейф-скорость и молнии, у неё помада, ресницы и сердечки.',
		pac: neonPac,
		ms: neonMs
	},
	{
		id: 'C',
		name: 'C · Герои с глазами',
		note: 'Он — решительный, с тяжёлой бровью, под энерджайзером огненный гребень; она — лавандовая с большими глазами, пузырьками и крылышками феи.',
		pac: heroPac,
		ms: heroMs
	}
];

