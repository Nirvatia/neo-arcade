// Bonus life, the cosmic heart: the owner's COLLECTIBLE_BONUS_LIFE.html, texture code 1:1,
// with its heartbeat, flicker and the 16 particles on an elliptic orbit. Not placed in the
// game yet: no pickup grants a life today (lives come from the score thresholds).
import type { CollectibleArt } from './collectibleSprite';
import { drawCollectible } from './collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	// layered nebula glow
	const layers: Array<{ r: number; stops: Array<[number, string]> }> = [
		{
			r: size * 0.5,
			stops: [
				[0, 'rgba(120,255,200,0.4)'],
				[0.3, 'rgba(80,230,160,0.25)'],
				[0.6, 'rgba(40,180,120,0.12)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.35,
			stops: [
				[0, 'rgba(180,255,220,0.3)'],
				[0.5, 'rgba(100,255,180,0.15)'],
				[1, 'rgba(0,0,0,0)']
			]
		}
	];
	for (const layer of layers) {
		const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, layer.r);
		for (const [offset, color] of layer.stops) g.addColorStop(offset, color);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, size, size);
	}

	const scale = size * 0.012;
	ctx.save();
	ctx.translate(cx, cy + scale * 8);
	ctx.scale(scale, scale);

	const heartPath = () => {
		ctx.beginPath();
		ctx.moveTo(0, -10);
		ctx.bezierCurveTo(-10, -22, -22, -12, -22, 0);
		ctx.bezierCurveTo(-22, 12, -12, 22, 0, 28);
		ctx.bezierCurveTo(12, 22, 22, 12, 22, 0);
		ctx.bezierCurveTo(22, -12, 10, -22, 0, -10);
	};

	// outer contour
	ctx.strokeStyle = 'rgba(150,255,200,0.95)';
	ctx.lineWidth = 3;
	ctx.shadowBlur = 12;
	ctx.shadowColor = 'rgba(100,255,180,1)';
	heartPath();
	ctx.stroke();

	// middle contour
	ctx.strokeStyle = 'rgba(180,255,220,0.7)';
	ctx.lineWidth = 2;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(120,255,200,0.8)';
	ctx.beginPath();
	ctx.moveTo(0, -8);
	ctx.bezierCurveTo(-8, -18, -18, -10, -18, 0);
	ctx.bezierCurveTo(-18, 10, -10, 18, 0, 24);
	ctx.bezierCurveTo(10, 18, 18, 10, 18, 0);
	ctx.bezierCurveTo(18, -10, 8, -18, 0, -8);
	ctx.stroke();

	// inner contour
	ctx.strokeStyle = 'rgba(220,255,240,0.5)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 4;
	ctx.shadowColor = 'rgba(150,255,220,0.6)';
	ctx.beginPath();
	ctx.moveTo(0, -6);
	ctx.bezierCurveTo(-7, -15, -15, -8, -15, 0);
	ctx.bezierCurveTo(-15, 8, -8, 15, 0, 20);
	ctx.bezierCurveTo(8, 15, 15, 8, 15, 0);
	ctx.bezierCurveTo(15, -8, 7, -15, 0, -6);
	ctx.stroke();

	// translucent fill
	ctx.shadowBlur = 0;
	const fillGrad = ctx.createRadialGradient(0, 5, 0, 0, 5, 20);
	fillGrad.addColorStop(0, 'rgba(200,255,230,0.4)');
	fillGrad.addColorStop(0.5, 'rgba(120,255,180,0.2)');
	fillGrad.addColorStop(1, 'rgba(60,200,140,0.05)');
	ctx.fillStyle = fillGrad;
	heartPath();
	ctx.fill();

	// core
	const coreLayers: Array<{ r: number; stops: Array<[number, string]> }> = [
		{
			r: 12,
			stops: [
				[0, 'rgba(255,255,255,0.95)'],
				[0.2, 'rgba(220,255,240,0.7)'],
				[0.5, 'rgba(150,255,200,0.3)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: 8,
			stops: [
				[0, 'rgba(255,255,255,1)'],
				[0.4, 'rgba(240,255,250,0.8)'],
				[1, 'rgba(0,0,0,0)']
			]
		}
	];
	for (const layer of coreLayers) {
		const g = ctx.createRadialGradient(0, 2, 0, 0, 2, layer.r);
		for (const [offset, color] of layer.stops) g.addColorStop(offset, color);
		ctx.fillStyle = g;
		ctx.fillRect(-layer.r, -layer.r + 2, layer.r * 2, layer.r * 2);
	}

	// rays from the core
	ctx.strokeStyle = 'rgba(200,255,230,0.4)';
	ctx.lineWidth = 0.8;
	ctx.shadowBlur = 3;
	ctx.shadowColor = 'rgba(150,255,200,0.6)';
	for (let i = 0; i < 4; i++) {
		const angle = (i / 4) * Math.PI * 2;
		const length = 15;
		ctx.beginPath();
		ctx.moveTo(Math.cos(angle) * 3, 2 + Math.sin(angle) * 3);
		ctx.lineTo(Math.cos(angle) * length, 2 + Math.sin(angle) * length);
		ctx.stroke();
	}

	ctx.restore();
}

/** Mock-up display: heart 100 px from a 128 px texture, blooms 140 and 180 px. */
export const BONUS_LIFE_ART: CollectibleArt = {
	size: 128,
	paint,
	bounds: { x0: -34, y0: -11, x1: 34, y1: 55 },
	sprite: 100,
	blooms: [
		{ size: 140, blur: 10 },
		{ size: 180, blur: 20 }
	]
};

/** Fixed per-particle randomness, so the orbit is a function of time. */
const ORBIT = Array.from({ length: 16 }, (_, i) => {
	const r = (n: number) => {
		const x = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
		return x - Math.floor(x);
	};
	return {
		angle: (i / 16) * Math.PI * 2,
		radius: 50 + r(1) * 15,
		speed: 0.6 + r(2) * 0.4,
		size: 0.6 + r(3) * 0.4
	};
});

/** Mock-up display px → texture px. */
const DISPLAY = BONUS_LIFE_ART.size / BONUS_LIFE_ART.sprite;

export function drawBonusLife(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	extent: number,
	time: number
): void {
	const beat = Math.sin(time * 2.5);
	drawCollectible(
		ctx,
		BONUS_LIFE_ART,
		x,
		y,
		extent,
		{
			scale: 1 + beat * 0.06 + beat * beat * 0.03,
			rotation: Math.sin(time * 0.5) * 0.04,
			alpha: 0.88 + Math.sin(time * 10) * 0.06 + Math.sin(time * 18) * 0.03,
			bloomAlpha: [0.45 + Math.sin(time * 7) * 0.1, 0.2 + Math.sin(time * 5) * 0.08]
		},
		(c) => {
			c.globalCompositeOperation = 'lighter';
			c.fillStyle = '#88ffbb';
			const base = c.globalAlpha;
			for (const p of ORBIT) {
				const a = p.angle + p.speed * time;
				const wobble = Math.sin(time * 3 + a * 2) * 3;
				const px = Math.cos(a) * (p.radius + wobble) * DISPLAY;
				const py = Math.sin(a) * (p.radius + wobble) * 0.7 * DISPLAY;
				const side = 2.5 * p.size * (0.8 + Math.sin(time * 5 + a * 2) * 0.3) * DISPLAY;
				c.globalAlpha = base * Math.max(0, 0.5 + Math.sin(time * 6 + a) * 0.3);
				c.fillRect(px - side / 2, py - side / 2, side, side);
			}
			c.globalAlpha = base;
			c.globalCompositeOperation = 'source-over';
		}
	);
}
