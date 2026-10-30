// Ms. Pac-Man, "Stardust Heart" (the owner's MS_PACMAN.html), as a baked sprite: a rose
// candy with a glowing pink rim (brighter towards the heading), a glossy highlight, stardust
// twinkling inside in a looping cycle, a dark plum outline for the light maze and a big
// shaded bow. Under the energizer she turns pale pink with a gold rim and a gold bow, with
// stars circling her. Trail: a pink ribbon (gold when powered) shedding sparkles.
import type { RGB } from './bakeKit';
import { glowSprite, mixRGB, ramp, rgba, seeded } from './bakeKit';
import type { RibbonLayer } from './RibbonTrail';
import type { SpriteEvent } from './CharacterSprite';
import { CharacterSprite } from './CharacterSprite';

const BODY: readonly [
	ReadonlyArray<readonly [number, RGB]>,
	ReadonlyArray<readonly [number, RGB]>
] = [
	[
		[0, [200, 56, 122]],
		[0.5, [222, 70, 136]],
		[0.8, [250, 112, 172]],
		[0.95, [255, 172, 210]],
		[1, [255, 202, 226]]
	],
	[
		[0, [246, 140, 192]],
		[0.5, [255, 176, 212]],
		[0.8, [255, 208, 226]],
		[0.95, [255, 226, 166]],
		[1, [255, 236, 176]]
	]
];
const L = (() => {
	const v = [-0.45, -0.6, 0.66];
	const n = Math.hypot(v[0], v[1], v[2]);
	return v.map((c) => c / n);
})();
const H = (() => {
	const v = [L[0], L[1], L[2] + 1];
	const n = Math.hypot(v[0], v[1], v[2]);
	return v.map((c) => c / n);
})();

/** Stardust inside the body: fixed points, each twinkling on its own phase. */
const STARDUST = (() => {
	const rnd = seeded(41);
	const out: Array<{ x: number; y: number; ph: number; s: number }> = [];
	while (out.length < 16) {
		const x = rnd() * 2 - 1;
		const y = rnd() * 2 - 1;
		if (x * x + y * y < 0.7) out.push({ x, y, ph: rnd(), s: 0.025 + rnd() * 0.025 });
	}
	return out;
})();

/** The bow's angle in the frame: behind and above the head. */
const BOW_ANGLE = -0.85 * Math.PI;
const GOLD_STAR = glowSprite([255, 214, 110]);

export class StardustMsPacmanSprite extends CharacterSprite {
	protected readonly id = 'stardust-ms-pacman';
	protected readonly surfaceFrames = 6;
	protected readonly surfaceRate = 4;
	protected readonly mouthMax = Math.PI / 3.2;
	protected readonly mouthSpeed = 8.5;
	protected readonly trailLength = 4;

	constructor() {
		super(19);
	}

	protected shader(look: 0 | 1, frame: number): (x: number, y: number, z: number) => RGB {
		const stops = BODY[look];
		return (x, y, z) => {
			const t = 1 - z;
			let col = ramp(stops, Math.pow(t, 0.9));
			const lam = 0.84 + 0.22 * (x * L[0] + y * L[1] + z * L[2]);
			col = [col[0] * lam, col[1] * lam, col[2] * lam];
			// the rim glows brighter towards the heading
			col = mixRGB(
				col,
				look ? [255, 236, 170] : [255, 196, 222],
				Math.pow(t, 2.4) * Math.max(0, x) * 0.5
			);
			// stardust twinkling inside
			let dust = 0;
			for (const s of STARDUST) {
				const d2 = (x - s.x) ** 2 + (y - s.y) ** 2;
				const tw = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (frame / this.surfaceFrames + s.ph));
				dust += Math.exp(-d2 / (s.s * s.s)) * tw;
			}
			const nh = Math.max(0, x * H[0] + y * H[1] + z * H[2]);
			const spec = Math.pow(nh, 18) * 0.38 + Math.pow(nh, 140) * 0.9;
			const add = Math.min(1, dust * 0.8) * 0.85 + spec;
			return [
				Math.min(255, col[0] + 255 * add),
				Math.min(255, col[1] + 236 * add),
				Math.min(255, col[2] + 246 * add)
			];
		};
	}

	protected outline(look: 0 | 1): RGB {
		return look ? [150, 70, 100] : [92, 14, 54];
	}

	protected mouthGlow(look: 0 | 1): readonly [RGB, number, RGB, number] {
		// a dark throat warming towards the lips: it reads as a mouth, not a cut
		return look
			? [[140, 50, 90], 0.65, [255, 220, 170], 0.5]
			: [[86, 10, 46], 0.7, [255, 130, 190], 0.38];
	}

	protected trailLayers(look: 0 | 1): readonly RibbonLayer[] {
		return look
			? [
					{
						width: 0.95,
						stops: [
							[0, [255, 210, 130], 0.4],
							[0.6, [255, 150, 180], 0.18],
							[1, [255, 140, 180], 0]
						]
					},
					{
						width: 0.5,
						stops: [
							[0, [255, 252, 225], 1],
							[0.5, [255, 222, 150], 0.7],
							[1, [255, 180, 130], 0]
						]
					}
				]
			: [
					{
						width: 0.75,
						stops: [
							[0, [255, 80, 160], 0.33],
							[0.6, [240, 60, 140], 0.14],
							[1, [240, 60, 140], 0]
						]
					},
					{
						width: 0.36,
						stops: [
							[0, [255, 222, 236], 0.95],
							[0.5, [255, 150, 200], 0.6],
							[1, [255, 120, 180], 0]
						]
					}
				];
	}

	/**
	 * The bow, behind and above the head: two rounded loops lying along the head, a knot and
	 * two short tails, shaded like satin (a crease at the knot, light on the loops' tops).
	 */
	protected paintExtra(ctx: CanvasRenderingContext2D, R: number, look: 0 | 1): void {
		const bx = Math.cos(BOW_ANGLE) * R * 0.86;
		const by = Math.sin(BOW_ANGLE) * R * 0.86;
		const deep: RGB = look ? [206, 128, 18] : [178, 14, 80];
		const mid: RGB = look ? [255, 204, 70] : [255, 58, 136];
		const light: RGB = look ? [255, 244, 180] : [255, 158, 200];
		const line: RGB = look ? [112, 60, 0] : [82, 6, 40];
		const len = R * 0.8;
		const wid = R * 0.6;
		const loop = (dir: number) => {
			const ux = Math.cos(dir);
			const uy = Math.sin(dir);
			const px = -uy;
			const py = ux;
			const ex = bx + ux * len;
			const ey = by + uy * len;
			ctx.beginPath();
			ctx.moveTo(bx, by);
			ctx.bezierCurveTo(
				bx + ux * len * 0.3 + px * wid * 0.75,
				by + uy * len * 0.3 + py * wid * 0.75,
				ex - ux * len * 0.15 + px * wid * 0.6,
				ey - uy * len * 0.15 + py * wid * 0.6,
				ex + ux * len * 0.1,
				ey + uy * len * 0.1
			);
			ctx.bezierCurveTo(
				ex - ux * len * 0.15 - px * wid * 0.6,
				ey - uy * len * 0.15 - py * wid * 0.6,
				bx + ux * len * 0.3 - px * wid * 0.75,
				by + uy * len * 0.3 - py * wid * 0.75,
				bx,
				by
			);
			ctx.closePath();
			return { ex, ey, px, py };
		};
		const tail = (dir: number) => {
			const ux = Math.cos(dir);
			const uy = Math.sin(dir);
			ctx.beginPath();
			ctx.moveTo(bx - uy * R * 0.08, by + ux * R * 0.08);
			ctx.lineTo(bx + ux * R * 0.5 - uy * R * 0.13, by + uy * R * 0.5 + ux * R * 0.13);
			ctx.lineTo(bx + ux * R * 0.42, by + uy * R * 0.42);
			ctx.lineTo(bx + ux * R * 0.5 + uy * R * 0.13, by + uy * R * 0.5 - ux * R * 0.13);
			ctx.lineTo(bx + uy * R * 0.08, by - ux * R * 0.08);
			ctx.closePath();
		};
		// loops lie along the head (its tangent), tilted a little outward
		const along = BOW_ANGLE + Math.PI / 2;
		const dirs = [along - 0.3, along + Math.PI + 0.3];
		const tails = [BOW_ANGLE + Math.PI - 0.45, BOW_ANGLE + Math.PI + 0.45];
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.strokeStyle = rgba(line, 1);
		ctx.lineWidth = R * 0.16;
		for (const d of tails) {
			tail(d);
			ctx.stroke();
		}
		for (const d of dirs) {
			loop(d);
			ctx.stroke();
		}
		ctx.beginPath();
		ctx.arc(bx, by, R * 0.24, 0, Math.PI * 2);
		ctx.stroke();
		for (const d of tails) {
			tail(d);
			ctx.fillStyle = rgba(deep, 1);
			ctx.fill();
		}
		for (const d of dirs) {
			const { ex, ey } = loop(d);
			const g = ctx.createLinearGradient(bx, by, ex, ey);
			g.addColorStop(0, rgba(deep, 1));
			g.addColorStop(0.45, rgba(mid, 1));
			g.addColorStop(1, rgba(light, 1));
			ctx.fillStyle = g;
			ctx.fill();
			// satin light along the loop's top edge
			ctx.save();
			ctx.clip();
			const top = ctx.createLinearGradient(bx, by - R * 0.6, bx, by + R * 0.3);
			top.addColorStop(0, 'rgba(255,255,255,0.55)');
			top.addColorStop(0.45, 'rgba(255,255,255,0)');
			ctx.fillStyle = top;
			ctx.fillRect(bx - R * 1.2, by - R * 1.2, R * 2.4, R * 2.4);
			ctx.restore();
		}
		const k = ctx.createRadialGradient(bx - R * 0.07, by - R * 0.07, 0, bx, by, R * 0.24);
		k.addColorStop(0, rgba(light, 1));
		k.addColorStop(1, rgba(deep, 1));
		ctx.fillStyle = k;
		ctx.beginPath();
		ctx.arc(bx, by, R * 0.24, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,255,255,0.85)';
		ctx.beginPath();
		ctx.arc(bx - R * 0.08, by - R * 0.08, R * 0.06, 0, Math.PI * 2);
		ctx.fill();
	}

	protected ringColor(): RGB {
		return this.power > 0.5 ? [255, 214, 110] : [255, 120, 190];
	}

	/** Powered: five gold stars circling her, twinkling slowly. */
	protected drawOver(ctx: CanvasRenderingContext2D): void {
		const p = this.power;
		if (p <= 0.01 || this.dying >= 0) return;
		const r = this.r;
		for (let i = 0; i < 5; i++) {
			const a = this.time * 1.6 + (i / 5) * Math.PI * 2;
			const x = this.x + Math.cos(a) * r * 1.5;
			const y = this.y + Math.sin(a) * r * 1.5;
			const tw = 0.75 + 0.25 * Math.sin(this.time * 4 + i * 1.3);
			const s = r * 0.32 * tw;
			ctx.globalAlpha = p * 0.8;
			ctx.drawImage(GOLD_STAR, x - s * 1.6, y - s * 1.6, s * 3.2, s * 3.2);
			ctx.globalAlpha = p;
			ctx.fillStyle = 'rgba(255,250,225,1)';
			ctx.beginPath();
			for (let j = 0; j < 4; j++) {
				const an = this.time * 0.8 + (j * Math.PI) / 2;
				ctx.lineTo(x + Math.cos(an) * s, y + Math.sin(an) * s);
				ctx.lineTo(
					x + Math.cos(an + Math.PI / 4) * s * 0.25,
					y + Math.sin(an + Math.PI / 4) * s * 0.25
				);
			}
			ctx.closePath();
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	protected emitWhileMoving(): void {
		const rnd = this.particles.random;
		if (rnd() > 0.45 + 0.4 * this.power) return;
		const b = this.backPoint(1.2);
		const speed = this.r * (1 + rnd() * 1.5);
		this.particles.spawn({
			x: b.x + (rnd() - 0.5) * this.r * 0.8,
			y: b.y + (rnd() - 0.5) * this.r * 0.8,
			vx: Math.cos(b.angle) * speed,
			vy: Math.sin(b.angle) * speed,
			life: 0.5 + rnd() * 0.4,
			size: this.r * (0.1 + rnd() * 0.06),
			color: this.power > 0.5 ? [255, 214, 110] : [255, 140, 200],
			shape: 'star',
			spin: (rnd() - 0.5) * 6
		});
	}

	protected emitOnEvent(event: SpriteEvent): void {
		const rnd = this.particles.random;
		const burst = (n: number, speed: number, color: RGB, shape: 'star' | 'heart', life: number) => {
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
				const v = this.r * speed * (0.6 + rnd() * 0.7);
				this.particles.spawn({
					x: this.x + Math.cos(a) * this.r * 0.5,
					y: this.y + Math.sin(a) * this.r * 0.5,
					vx: Math.cos(a) * v,
					vy: Math.sin(a) * v,
					life: life * (0.7 + rnd() * 0.6),
					size: this.r * (0.12 + rnd() * 0.08),
					color,
					shape,
					spin: (rnd() - 0.5) * 8
				});
			}
		};
		if (event === 'energizer') burst(14, 7, [255, 214, 110], 'star', 0.7);
		else if (event === 'ghost') {
			burst(8, 6, [255, 70, 140], 'heart', 0.8);
			burst(10, 9, [255, 220, 240], 'star', 0.6);
		} else if (event === 'teleport') burst(10, 5, [255, 160, 210], 'star', 0.45);
	}

	/** Hearts and stars spilling out as she fades. */
	protected emitWhileDying(): void {
		const rnd = this.particles.random;
		for (let i = 0; i < 2; i++) {
			const a = rnd() * Math.PI * 2;
			const v = this.r * (3 + rnd() * 6);
			const heart = rnd() < 0.35;
			this.particles.spawn({
				x: this.x + Math.cos(a) * this.r * 0.3,
				y: this.y + Math.sin(a) * this.r * 0.3,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: 0.6 + rnd() * 0.6,
				size: this.r * (0.1 + rnd() * 0.1),
				color: heart ? [255, 70, 140] : [255, 210, 235],
				shape: heart ? 'heart' : 'star',
				spin: (rnd() - 0.5) * 8
			});
		}
	}
}
