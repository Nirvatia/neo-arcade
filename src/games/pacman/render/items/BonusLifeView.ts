// Bonus life, redrawn for the tile (stage 10.1, the painting kit in
// `render/common/itemPaint`): a mint heart with a white plus, outlined in deep teal, with
// the mock-up's heartbeat, flicker and the 16 particles on an elliptic orbit around it
// (closer than in the mock-up, so all of it fits the tile). Not placed in the game yet: no
// pickup grants a life today (lives come from the score thresholds).
import type { CollectibleArt, CollectibleMotion } from './collectibleSprite';
import { drawCollectible } from './collectibleSprite';
import { beginItem, gloss, outline } from '../common/itemPaint';

const OUTLINE = 'rgba(4,50,44,0.95)';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);

	const heart = () => {
		ctx.beginPath();
		ctx.moveTo(0, 74);
		ctx.bezierCurveTo(-56, 36, -84, -2, -76, -34);
		ctx.bezierCurveTo(-68, -70, -20, -78, 0, -44);
		ctx.bezierCurveTo(20, -78, 68, -70, 76, -34);
		ctx.bezierCurveTo(84, -2, 56, 36, 0, 74);
		ctx.closePath();
	};
	const plus = () => {
		ctx.beginPath();
		ctx.moveTo(0, -22);
		ctx.lineTo(0, 34);
		ctx.moveTo(-28, 6);
		ctx.lineTo(28, 6);
	};

	// 1. outline
	outline(ctx, [heart], OUTLINE);

	// 2. body: light from the upper left
	const body = ctx.createRadialGradient(-30, -30, 6, 0, 0, 90);
	body.addColorStop(0, 'rgba(220,255,240,1)');
	body.addColorStop(0.35, 'rgba(110,240,180,1)');
	body.addColorStop(0.75, 'rgba(30,180,130,1)');
	body.addColorStop(1, 'rgba(10,110,90,1)');
	ctx.fillStyle = body;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(120,255,200,0.9)';
	heart();
	ctx.fill();
	ctx.shadowBlur = 0;

	// 3. the plus: one more life
	ctx.strokeStyle = OUTLINE;
	ctx.lineWidth = 32;
	plus();
	ctx.stroke();
	ctx.strokeStyle = 'rgba(255,255,255,1)';
	ctx.lineWidth = 18;
	plus();
	ctx.stroke();

	// 4. highlights
	gloss(ctx, -44, -38, 16, 10, -0.6);

	ctx.restore();
}

/** The mock-up's ticker: the heartbeat, a slight sway, the flicker. */
function heartMotion(time: number): CollectibleMotion {
	const beat = Math.sin(time * 2.5);
	return {
		scale: 1 + beat * 0.06 + beat * beat * 0.03,
		rotation: Math.sin(time * 0.5) * 0.04,
		alpha: 0.88 + Math.sin(time * 10) * 0.06 + Math.sin(time * 18) * 0.03,
		bloomAlpha: [0.45 + Math.sin(time * 7) * 0.1, 0.2 + Math.sin(time * 5) * 0.08]
	};
}

/** Mock-up display px → texture px (heart 100 px from a 128 px texture). */
const DISPLAY = 128 / 100;

/** The orbit's largest radius and wobble, mock-up display px (the mock-up's: 65 and 3). */
const ORBIT_RADIUS = 42;
const ORBIT_WOBBLE = 2;
/** The orbit's centre: the heart's, texture px. */
const ORBIT_Y = 0;
/** The orbit's far edge plus half the largest particle, texture px. */
const ORBIT_X_REACH = (ORBIT_RADIUS + ORBIT_WOBBLE + 2) * DISPLAY;
const ORBIT_Y_REACH = (ORBIT_RADIUS + ORBIT_WOBBLE) * 0.7 * DISPLAY + 2 * DISPLAY;

/** Fixed per-particle randomness, so the orbit is a function of time. */
const ORBIT = Array.from({ length: 16 }, (_, i) => {
	const r = (n: number) => {
		const x = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
		return x - Math.floor(x);
	};
	return {
		angle: (i / 16) * Math.PI * 2,
		radius: ORBIT_RADIUS - 8 + r(1) * 8,
		speed: 0.6 + r(2) * 0.4,
		size: 0.6 + r(3) * 0.4
	};
});

/** The blooms hug the heart (stage 10.1; the mock-up's were 140 and 180 px). */
export const BONUS_LIFE_ART: CollectibleArt = {
	size: 128,
	paint,
	sprite: 100,
	blooms: [
		{ size: 105, blur: 4 },
		{ size: 115, blur: 8 }
	],
	motion: heartMotion,
	extraBounds: {
		x0: -ORBIT_X_REACH,
		y0: ORBIT_Y - ORBIT_Y_REACH,
		x1: ORBIT_X_REACH,
		y1: ORBIT_Y + ORBIT_Y_REACH
	}
};

export function drawBonusLife(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	tile: number,
	time: number
): void {
	drawCollectible(ctx, BONUS_LIFE_ART, x, y, tile, time, (c) => {
		c.globalCompositeOperation = 'lighter';
		c.fillStyle = '#88ffbb';
		const base = c.globalAlpha;
		for (const p of ORBIT) {
			const a = p.angle + p.speed * time;
			const wobble = Math.sin(time * 3 + a * 2) * ORBIT_WOBBLE;
			const px = Math.cos(a) * (p.radius + wobble) * DISPLAY;
			const py = ORBIT_Y + Math.sin(a) * (p.radius + wobble) * 0.7 * DISPLAY;
			const side = 2.5 * p.size * (0.8 + Math.sin(time * 5 + a * 2) * 0.3) * DISPLAY;
			c.globalAlpha = base * Math.max(0, 0.5 + Math.sin(time * 6 + a) * 0.3);
			c.fillRect(px - side / 2, py - side / 2, side, side);
		}
		c.globalAlpha = base;
		c.globalCompositeOperation = 'source-over';
	});
}
