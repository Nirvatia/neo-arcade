// Pac-Man, "Solar Flare" (the owner's PACMAN.html), as a baked sprite: a small sun with real
// volume — a bright core darkening to a red-orange limb, boiling granulation in a looping
// cycle, light from the upper left, a hot rim towards the heading and a dark outline for the
// light maze. Under the energizer he goes supernova: a white-hot body inside a ring of
// flames. Trail: a plasma ribbon shedding embers.
import type { RGB } from './bakeKit';
import { context, loopingField, mixRGB, ramp } from './bakeKit';
import type { RibbonLayer } from './RibbonTrail';
import type { SpriteEvent } from './CharacterSprite';
import { CharacterSprite } from './CharacterSprite';

const LIMB: readonly [
	ReadonlyArray<readonly [number, RGB]>,
	ReadonlyArray<readonly [number, RGB]>
] = [
	[
		[0, [255, 244, 190]],
		[0.35, [255, 208, 82]],
		[0.68, [252, 145, 32]],
		[0.9, [222, 80, 12]],
		[1, [168, 40, 6]]
	],
	[
		[0, [255, 255, 246]],
		[0.35, [255, 243, 178]],
		[0.68, [255, 196, 86]],
		[0.9, [255, 124, 34]],
		[1, [226, 62, 12]]
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

const FIRE: ReadonlyArray<readonly [number, RGB]> = [
	[0, [230, 40, 0]],
	[0.45, [255, 140, 30]],
	[0.8, [255, 222, 120]],
	[1, [255, 252, 225]]
];

export class SolarPacmanSprite extends CharacterSprite {
	protected readonly id = 'solar-pacman';
	protected readonly surfaceFrames = 8;
	protected readonly surfaceRate = 7;
	protected readonly mouthMax = Math.PI / 2.9;
	protected readonly mouthSpeed = 10;
	protected readonly trailLength = 4.2;
	private readonly granulation = loopingField(112, 3.4, 11);
	private readonly flames = loopingField(128, 5.5, 23);

	constructor() {
		super(7);
	}

	protected shader(look: 0 | 1, frame: number): (x: number, y: number, z: number) => RGB {
		const stops = LIMB[look];
		return (x, y, z) => {
			const t = 1 - z;
			const base = ramp(stops, Math.pow(t, 0.85));
			// granulation: bright cells and dark lanes, stronger when supernova
			const g = this.granulation(frame, this.surfaceFrames, x, y);
			const cells = look ? 0.72 + 0.56 * g : 0.8 + 0.4 * g;
			const lam = 0.8 + 0.28 * (x * L[0] + y * L[1] + z * L[2]);
			const spec = Math.pow(Math.max(0, x * H[0] + y * H[1] + z * H[2]), 34) * (look ? 0.15 : 0.32);
			const rim = Math.pow(t, 2.5) * Math.max(0, x) * 0.55;
			let col = mixRGB(base, [255, 232, 168], rim);
			col = [col[0] * cells * lam, col[1] * cells * lam, col[2] * cells * lam];
			return [
				Math.min(255, col[0] + 255 * spec),
				Math.min(255, col[1] + 250 * spec),
				Math.min(255, col[2] + 230 * spec)
			];
		};
	}

	protected outline(look: 0 | 1): RGB {
		return look ? [140, 44, 0] : [84, 22, 0];
	}

	protected mouthGlow(look: 0 | 1): readonly [RGB, number, RGB, number] {
		// a dark throat warming towards the lips: it reads as a mouth, not a cut
		return look
			? [[150, 50, 0], 0.7, [255, 210, 120], 0.55]
			: [[90, 22, 0], 0.72, [255, 150, 40], 0.4];
	}

	protected trailLayers(look: 0 | 1): readonly RibbonLayer[] {
		return look
			? [
					{
						width: 1.1,
						stops: [
							[0, [255, 160, 60], 0.45],
							[0.6, [255, 80, 10], 0.2],
							[1, [220, 40, 0], 0]
						]
					},
					{
						width: 0.6,
						stops: [
							[0, [255, 255, 240], 1],
							[0.5, [255, 220, 120], 0.75],
							[1, [255, 140, 40], 0]
						]
					}
				]
			: [
					{
						width: 0.85,
						stops: [
							[0, [255, 110, 20], 0.35],
							[0.6, [230, 60, 10], 0.15],
							[1, [200, 40, 0], 0]
						]
					},
					{
						width: 0.42,
						stops: [
							[0, [255, 240, 170], 0.95],
							[0.5, [255, 170, 60], 0.6],
							[1, [255, 110, 20], 0]
						]
					}
				];
	}

	/** A ring of flames round the body, one frame of a looping cycle. */
	protected paintCorona(
		ctx: CanvasRenderingContext2D,
		R: number,
		frame: number,
		frames: number
	): void {
		const c = ctx.canvas;
		const img = context(c).createImageData(c.width, c.height);
		const d = img.data;
		const mid = c.width / 2;
		for (let py = 0; py < c.height; py++) {
			for (let px = 0; px < c.width; px++) {
				const dx = px + 0.5 - mid;
				const dy = py + 0.5 - mid;
				const rr = Math.hypot(dx, dy) / R;
				if (rr < 0.85 || rr > 1.85) continue;
				const f = this.flames(frame, frames, dx / (1.85 * R), dy / (1.85 * R));
				const h = 0.22 + 0.6 * Math.max(0, f - 0.25);
				const k = 1 - (rr - 0.92) / h;
				if (k <= 0) continue;
				const heat = Math.min(1, k);
				const col = ramp(FIRE, heat);
				const a = Math.pow(heat, 1.3) * Math.min(1, (rr - 0.85) / 0.1);
				const o = (py * c.width + px) * 4;
				d[o] = col[0];
				d[o + 1] = col[1];
				d[o + 2] = col[2];
				d[o + 3] = a * 235;
			}
		}
		context(c).putImageData(img, 0, 0);
	}

	protected ringColor(): RGB {
		return [255, 196, 90];
	}

	protected emitWhileMoving(): void {
		const rnd = this.particles.random;
		if (rnd() > 0.5 + 0.4 * this.power) return;
		const b = this.backPoint(0.9);
		const speed = this.r * (2 + rnd() * 2.5);
		this.particles.spawn({
			x: b.x + (rnd() - 0.5) * this.r * 0.6,
			y: b.y + (rnd() - 0.5) * this.r * 0.6,
			vx: Math.cos(b.angle) * speed,
			vy: Math.sin(b.angle) * speed,
			life: 0.35 + rnd() * 0.3,
			size: this.r * (0.09 + rnd() * 0.06),
			color: this.power > 0.5 ? [255, 236, 170] : [255, 180, 70],
			shape: 'ember'
		});
	}

	protected emitOnEvent(event: SpriteEvent): void {
		const rnd = this.particles.random;
		const burst = (n: number, speed: number, color: RGB, life: number) => {
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
				const v = this.r * speed * (0.6 + rnd() * 0.8);
				this.particles.spawn({
					x: this.x + Math.cos(a) * this.r * 0.6,
					y: this.y + Math.sin(a) * this.r * 0.6,
					vx: Math.cos(a) * v,
					vy: Math.sin(a) * v,
					life: life * (0.7 + rnd() * 0.6),
					size: this.r * (0.08 + rnd() * 0.08),
					color,
					shape: 'ember'
				});
			}
		};
		if (event === 'energizer') burst(22, 9, [255, 220, 120], 0.6);
		else if (event === 'ghost') burst(18, 11, [255, 245, 200], 0.55);
		else if (event === 'teleport') burst(10, 6, [255, 200, 90], 0.4);
	}

	/** Jets of plasma out of both poles of the collapsing star. */
	protected emitWhileDying(): void {
		const rnd = this.particles.random;
		for (let i = 0; i < 3; i++) {
			const jet = rnd() < 0.5;
			const a = jet
				? this.angle + (rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + (rnd() - 0.5) * 0.5
				: rnd() * Math.PI * 2;
			const v = this.r * (jet ? 9 + rnd() * 8 : 3 + rnd() * 4);
			this.particles.spawn({
				x: this.x,
				y: this.y,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: 0.4 + rnd() * 0.5,
				size: this.r * (0.07 + rnd() * 0.1),
				color: [255, 200 + rnd() * 55, 120],
				shape: 'ember'
			});
		}
	}
}
