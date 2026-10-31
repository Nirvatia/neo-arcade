// Pac-Man, the hero (stage 10.3): "hunger awoken as fire". Gold with red-orange shadows,
// wide jaws with a grin, a white-hot core of light in his mouth, a trail of golden strands
// shedding embers. Powered he goes white-hot with molten veins and painted flames streaming
// back; caught, his mouth opens all the way round and he bursts into embers. The machinery
// (painting, acting, energizer beat, trail) is the shared Hero.
import type { HeroDesign, Palette } from './Hero';
import { Hero } from './Hero';

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

const DESIGN: HeroDesign = {
	id: 'pacman',
	calm: CALM,
	awoken: AWOKEN,
	// wide jaws (the owner's review): fully open the mouth spans about 92 degrees
	mouthSpan: 0.76,
	grinRest: 0.2,
	grinRun: 0.08,
	chompRate: 4.2,
	core: coreSprite,
	spill: [255, 196, 90],
	aura: [255, 170, 60],
	flare: [255, 214, 120],
	trailCalm: [
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
	],
	trailAwoken: [
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
	],
	death: 'open'
};

export class PacmanHero extends Hero {
	protected readonly design = DESIGN;

	/** Painted flame tongues streaming back from his head, swaying (no noise: no flicker). */
	protected drawBehind(ctx: CanvasRenderingContext2D, R: number, k: number): void {
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

	/** Molten veins under the skin while powered (in the body's scratch canvas). */
	protected decorate(ctx: CanvasRenderingContext2D, R: number, p: number, k: number): void {
		if (p <= 0.01) return;
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
}
