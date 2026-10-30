// Pear, redrawn for the tile (stage 10.1, the painting kit in `render/common/itemPaint`):
// the mock-up's rounded pear read as a lemon at tile size. A pear silhouette instead: a
// small top, a clear waist and a wide bottom, yellow-green with a warm blush, a brown stem
// and a leaf, with a dark outline so it reads on every season.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';
import { beginItem } from '../../common/itemPaint';

/** Outline: dark olive, wide enough to survive the downscale to a tile. */
const OUTLINE = 'rgba(40,50,8,0.95)';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);

	const pear = () => {
		ctx.beginPath();
		ctx.moveTo(0, -62);
		ctx.bezierCurveTo(20, -62, 28, -48, 26, -30);
		ctx.bezierCurveTo(24, -12, 56, -2, 58, 30);
		ctx.bezierCurveTo(60, 70, 28, 84, 0, 84);
		ctx.bezierCurveTo(-28, 84, -60, 70, -58, 30);
		ctx.bezierCurveTo(-56, -2, -24, -12, -26, -30);
		ctx.bezierCurveTo(-28, -48, -20, -62, 0, -62);
		ctx.closePath();
	};
	const stem = () => {
		ctx.beginPath();
		ctx.moveTo(0, -58);
		ctx.quadraticCurveTo(0, -76, 10, -88);
	};
	const leaf = () => {
		ctx.beginPath();
		ctx.moveTo(4, -72);
		ctx.quadraticCurveTo(22, -96, 50, -84);
		ctx.quadraticCurveTo(30, -60, 4, -72);
		ctx.closePath();
	};

	// 1. outline: every part stroked wide in dark, the fills cover the inner lines
	ctx.strokeStyle = OUTLINE;
	ctx.lineWidth = 14;
	pear();
	ctx.stroke();
	leaf();
	ctx.stroke();
	ctx.lineWidth = 20;
	stem();
	ctx.stroke();

	// 2. leaf and stem
	const leafGrad = ctx.createLinearGradient(4, -90, 50, -66);
	leafGrad.addColorStop(0, 'rgba(150,240,100,1)');
	leafGrad.addColorStop(1, 'rgba(40,150,50,1)');
	ctx.fillStyle = leafGrad;
	leaf();
	ctx.fill();
	ctx.strokeStyle = 'rgba(30,110,40,0.8)';
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(8, -72);
	ctx.quadraticCurveTo(26, -80, 44, -82);
	ctx.stroke();
	ctx.strokeStyle = 'rgba(150,96,40,1)';
	ctx.lineWidth = 9;
	stem();
	ctx.stroke();

	// 3. body: light from the upper left
	const body = ctx.createRadialGradient(-22, -4, 6, 0, 24, 96);
	body.addColorStop(0, 'rgba(250,255,170,1)');
	body.addColorStop(0.35, 'rgba(214,236,80,1)');
	body.addColorStop(0.75, 'rgba(150,196,40,1)');
	body.addColorStop(1, 'rgba(90,130,20,1)');
	ctx.fillStyle = body;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(220,255,100,0.9)';
	pear();
	ctx.fill();
	ctx.shadowBlur = 0;

	// a warm blush on the lower right, a few freckles
	ctx.save();
	pear();
	ctx.clip();
	const blush = ctx.createRadialGradient(30, 44, 0, 30, 44, 40);
	blush.addColorStop(0, 'rgba(255,120,40,0.55)');
	blush.addColorStop(1, 'rgba(255,120,40,0)');
	ctx.fillStyle = blush;
	ctx.fillRect(-10, 0, 80, 90);
	ctx.fillStyle = 'rgba(110,120,20,0.5)';
	for (const [x, y] of [
		[-30, 40],
		[-14, 62],
		[10, 20],
		[36, 64],
		[-36, 14],
		[20, 52]
	] as const) {
		ctx.beginPath();
		ctx.arc(x, y, 2.5, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();

	// 4. highlights: a gloss on the wide bottom and a glint on the neck
	const gloss = ctx.createRadialGradient(-30, 30, 0, -30, 30, 24);
	gloss.addColorStop(0, 'rgba(255,255,255,0.9)');
	gloss.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = gloss;
	ctx.beginPath();
	ctx.ellipse(-30, 30, 14, 24, 0.2, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = 'rgba(255,255,255,0.85)';
	ctx.beginPath();
	ctx.ellipse(-10, -40, 5, 9, 0.2, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

export const PEAR_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
