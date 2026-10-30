// Apple, redrawn for the tile (stage 10.1, the painting kit in `render/common/itemPaint`):
// a red apple with the dip at the top, a brown stem and a leaf, a yellow blush on the lit
// side, outlined in dark wine.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';
import { beginItem, gloss, outline, sparkle } from '../../common/itemPaint';

const OUTLINE = 'rgba(70,6,20,0.95)';
const LEAF_OUTLINE = 'rgba(16,50,20,0.95)';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);

	const apple = () => {
		ctx.beginPath();
		ctx.moveTo(0, -40);
		ctx.bezierCurveTo(24, -64, 74, -60, 74, -6);
		ctx.bezierCurveTo(74, 46, 42, 82, 20, 80);
		ctx.bezierCurveTo(10, 79, 6, 74, 0, 74);
		ctx.bezierCurveTo(-6, 74, -10, 79, -20, 80);
		ctx.bezierCurveTo(-42, 82, -74, 46, -74, -6);
		ctx.bezierCurveTo(-74, -60, -24, -64, 0, -40);
		ctx.closePath();
	};
	const stem = () => {
		ctx.beginPath();
		ctx.moveTo(0, -38);
		ctx.quadraticCurveTo(0, -62, 10, -78);
	};
	const leaf = () => {
		ctx.beginPath();
		ctx.moveTo(6, -62);
		ctx.quadraticCurveTo(26, -92, 60, -78);
		ctx.quadraticCurveTo(38, -50, 6, -62);
		ctx.closePath();
	};

	// 1. outline
	outline(ctx, [stem], OUTLINE, 20);
	outline(ctx, [leaf], LEAF_OUTLINE);
	outline(ctx, [apple], OUTLINE);

	// 2. stem and leaf
	ctx.strokeStyle = 'rgba(140,90,40,1)';
	ctx.lineWidth = 8;
	stem();
	ctx.stroke();
	const green = ctx.createLinearGradient(6, -90, 60, -56);
	green.addColorStop(0, 'rgba(160,240,110,1)');
	green.addColorStop(1, 'rgba(40,150,60,1)');
	ctx.fillStyle = green;
	leaf();
	ctx.fill();

	// 3. body: light from the upper left
	const body = ctx.createRadialGradient(-30, -20, 6, 0, 10, 90);
	body.addColorStop(0, 'rgba(255,150,130,1)');
	body.addColorStop(0.35, 'rgba(240,40,40,1)');
	body.addColorStop(0.75, 'rgba(190,16,24,1)');
	body.addColorStop(1, 'rgba(120,6,16,1)');
	ctx.fillStyle = body;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(255,70,70,0.9)';
	apple();
	ctx.fill();
	ctx.shadowBlur = 0;

	// a yellow blush on the lit side
	ctx.save();
	apple();
	ctx.clip();
	const blush = ctx.createRadialGradient(-44, 10, 0, -44, 10, 40);
	blush.addColorStop(0, 'rgba(255,210,80,0.45)');
	blush.addColorStop(1, 'rgba(255,210,80,0)');
	ctx.fillStyle = blush;
	ctx.fillRect(-90, -40, 90, 100);
	ctx.restore();

	// the dip around the stem
	ctx.strokeStyle = 'rgba(110,10,20,0.6)';
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(-16, -44);
	ctx.quadraticCurveTo(0, -34, 16, -44);
	ctx.stroke();

	// 4. highlights
	gloss(ctx, -36, -24, 14, 24, 0.4);
	sparkle(ctx, 44, 30, 2.5, 'rgba(255,200,200,1)');

	ctx.restore();
}

export const APPLE_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
