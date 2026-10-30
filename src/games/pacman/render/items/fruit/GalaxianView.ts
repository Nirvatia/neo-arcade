// Galaxian flagship, redrawn for the tile (stage 10.1, the painting kit in
// `render/common/itemPaint`): a ship seen from above, nose up, a yellow hull, red swept
// wings and a blue cockpit, outlined in deep navy.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';
import { beginItem, gloss, outline, sparkle } from '../../common/itemPaint';

const OUTLINE = 'rgba(10,14,60,0.95)';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);

	const wings = () => {
		ctx.beginPath();
		ctx.moveTo(-14, -18);
		ctx.lineTo(-84, 26);
		ctx.lineTo(-80, 50);
		ctx.lineTo(-16, 30);
		ctx.closePath();
		ctx.moveTo(14, -18);
		ctx.lineTo(84, 26);
		ctx.lineTo(80, 50);
		ctx.lineTo(16, 30);
		ctx.closePath();
	};
	const tail = () => {
		ctx.beginPath();
		ctx.moveTo(-12, 40);
		ctx.lineTo(-34, 70);
		ctx.lineTo(-8, 62);
		ctx.closePath();
		ctx.moveTo(12, 40);
		ctx.lineTo(34, 70);
		ctx.lineTo(8, 62);
		ctx.closePath();
	};
	const hull = () => {
		ctx.beginPath();
		ctx.moveTo(0, -78);
		ctx.bezierCurveTo(16, -60, 22, -20, 20, 30);
		ctx.quadraticCurveTo(18, 66, 0, 70);
		ctx.quadraticCurveTo(-18, 66, -20, 30);
		ctx.bezierCurveTo(-22, -20, -16, -60, 0, -78);
		ctx.closePath();
	};
	const cockpit = () => {
		ctx.beginPath();
		ctx.ellipse(0, -30, 9, 18, 0, 0, Math.PI * 2);
	};

	// 1. outline
	outline(ctx, [wings, tail, hull], OUTLINE);

	// 2. wings and tail: red with a blue leading stripe
	const red = ctx.createLinearGradient(0, -20, 0, 50);
	red.addColorStop(0, 'rgba(255,110,120,1)');
	red.addColorStop(1, 'rgba(180,20,50,1)');
	ctx.fillStyle = red;
	ctx.shadowBlur = 8;
	ctx.shadowColor = 'rgba(255,80,120,0.9)';
	wings();
	ctx.fill();
	tail();
	ctx.fill();
	ctx.shadowBlur = 0;
	ctx.strokeStyle = 'rgba(80,170,255,1)';
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.moveTo(-20, -10);
	ctx.lineTo(-78, 28);
	ctx.moveTo(20, -10);
	ctx.lineTo(78, 28);
	ctx.stroke();

	// 3. hull
	const yellow = ctx.createLinearGradient(-20, 0, 20, 0);
	yellow.addColorStop(0, 'rgba(255,250,180,1)');
	yellow.addColorStop(0.5, 'rgba(255,214,60,1)');
	yellow.addColorStop(1, 'rgba(200,140,10,1)');
	ctx.fillStyle = yellow;
	ctx.shadowBlur = 8;
	ctx.shadowColor = 'rgba(255,220,100,0.9)';
	hull();
	ctx.fill();
	ctx.shadowBlur = 0;

	// 4. cockpit
	const glass = ctx.createLinearGradient(0, -48, 0, -12);
	glass.addColorStop(0, 'rgba(180,230,255,1)');
	glass.addColorStop(1, 'rgba(30,90,220,1)');
	ctx.fillStyle = glass;
	cockpit();
	ctx.fill();
	ctx.strokeStyle = OUTLINE;
	ctx.lineWidth = 4;
	cockpit();
	ctx.stroke();

	// 5. highlights
	gloss(ctx, -3, -38, 3, 7, 0, 0.95);
	gloss(ctx, -8, 10, 4, 18, 0, 0.7);
	sparkle(ctx, 62, 40, 2.5, 'rgba(200,220,255,1)');

	ctx.restore();
}

export const GALAXIAN_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
