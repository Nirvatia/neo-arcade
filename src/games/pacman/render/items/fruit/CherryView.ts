// Cherry, redrawn for the tile (stage 10.1, the painting kit in `render/common/itemPaint`):
// a pair of glossy red cherries on green stems joined at the top, with a leaf, outlined in
// dark wine.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';
import { beginItem, gloss, outline, sparkle } from '../../common/itemPaint';

const OUTLINE = 'rgba(70,6,24,0.95)';
const STEM_OUTLINE = 'rgba(16,50,20,0.95)';

/** The two cherries: centre and radius, design units (the right one in front). */
const LEFT = { x: -36, y: 36, r: 34 };
const RIGHT = { x: 30, y: 46, r: 38 };
const JOINT = { x: 12, y: -74 };

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);

	const ball = (c: { x: number; y: number; r: number }) => () => {
		ctx.beginPath();
		ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
	};
	const stems = () => {
		ctx.beginPath();
		ctx.moveTo(LEFT.x + 4, LEFT.y - LEFT.r + 4);
		ctx.quadraticCurveTo(-20, -40, JOINT.x, JOINT.y);
		ctx.moveTo(RIGHT.x - 2, RIGHT.y - RIGHT.r + 4);
		ctx.quadraticCurveTo(26, -20, JOINT.x, JOINT.y);
	};
	const leaf = () => {
		ctx.beginPath();
		ctx.moveTo(JOINT.x, JOINT.y);
		ctx.quadraticCurveTo(34, -96, 64, -76);
		ctx.quadraticCurveTo(40, -56, JOINT.x, JOINT.y);
		ctx.closePath();
	};

	// 1. outline
	outline(ctx, [stems], STEM_OUTLINE, 18);
	outline(ctx, [leaf], STEM_OUTLINE);
	outline(ctx, [ball(LEFT), ball(RIGHT)], OUTLINE);

	// 2. stems and leaf
	ctx.strokeStyle = 'rgba(110,190,70,1)';
	ctx.lineWidth = 7;
	stems();
	ctx.stroke();
	const green = ctx.createLinearGradient(JOINT.x, -96, 64, -60);
	green.addColorStop(0, 'rgba(160,240,110,1)');
	green.addColorStop(1, 'rgba(40,150,60,1)');
	ctx.fillStyle = green;
	leaf();
	ctx.fill();

	// 3. cherries: the back one a little darker, an outline between them
	for (const [c, dark] of [
		[LEFT, 0.85],
		[RIGHT, 1]
	] as const) {
		if (c === RIGHT) {
			outline(ctx, [ball(RIGHT)], OUTLINE);
		}
		const g = ctx.createRadialGradient(c.x - c.r * 0.4, c.y - c.r * 0.4, 2, c.x, c.y, c.r);
		g.addColorStop(0, `rgba(255,${Math.round(140 * dark)},${Math.round(150 * dark)},1)`);
		g.addColorStop(0.45, `rgba(${Math.round(240 * dark)},30,60,1)`);
		g.addColorStop(1, `rgba(${Math.round(140 * dark)},6,30,1)`);
		ctx.fillStyle = g;
		ctx.shadowBlur = 10;
		ctx.shadowColor = 'rgba(255,60,100,0.9)';
		ball(c)();
		ctx.fill();
		ctx.shadowBlur = 0;
		gloss(ctx, c.x - c.r * 0.4, c.y - c.r * 0.38, c.r * 0.3, c.r * 0.2, -0.6);
	}

	sparkle(ctx, RIGHT.x + 16, RIGHT.y - 18, 2.5, 'rgba(255,200,220,1)');

	ctx.restore();
}

export const CHERRY_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
