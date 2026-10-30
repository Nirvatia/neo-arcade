// Melon, redrawn for the tile (stage 10.1, the painting kit in `render/common/itemPaint`):
// a whole striped watermelon, light green with dark zigzag stripes and a curly stem,
// outlined in deep green.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';
import { beginItem, gloss, outline, sparkle } from '../../common/itemPaint';

const OUTLINE = 'rgba(8,40,12,0.95)';
const RX = 76;
const RY = 62;
const CY = 10;

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);

	const melon = () => {
		ctx.beginPath();
		ctx.ellipse(0, CY, RX, RY, 0, 0, Math.PI * 2);
	};
	const stem = () => {
		ctx.beginPath();
		ctx.moveTo(0, CY - RY + 4);
		ctx.quadraticCurveTo(2, -66, 14, -72);
		ctx.quadraticCurveTo(26, -76, 22, -86);
	};

	// 1. outline
	outline(ctx, [stem], OUTLINE, 18);
	outline(ctx, [melon], OUTLINE);

	// 2. stem
	ctx.strokeStyle = 'rgba(120,170,60,1)';
	ctx.lineWidth = 6;
	stem();
	ctx.stroke();

	// 3. rind: light from the upper left
	const body = ctx.createRadialGradient(-30, CY - 26, 6, 0, CY, RX);
	body.addColorStop(0, 'rgba(210,255,170,1)');
	body.addColorStop(0.4, 'rgba(120,210,90,1)');
	body.addColorStop(1, 'rgba(40,130,50,1)');
	ctx.fillStyle = body;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(120,255,140,0.9)';
	melon();
	ctx.fill();
	ctx.shadowBlur = 0;

	// dark zigzag stripes, following the melon's curve
	ctx.save();
	melon();
	ctx.clip();
	ctx.strokeStyle = 'rgba(20,90,30,0.95)';
	ctx.lineWidth = 11;
	for (const k of [-0.8, -0.4, 0, 0.4, 0.8]) {
		ctx.beginPath();
		for (let i = 0; i <= 12; i++) {
			const t = -1 + i / 6;
			const y = CY + t * RY;
			const bulge = Math.sqrt(Math.max(0, 1 - t * t));
			const x = k * RX * bulge + (i % 2 === 0 ? -4 : 4);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}
	// shade towards the bottom
	const shade = ctx.createLinearGradient(0, CY - RY, 0, CY + RY);
	shade.addColorStop(0.5, 'rgba(0,0,0,0)');
	shade.addColorStop(1, 'rgba(0,40,10,0.35)');
	ctx.fillStyle = shade;
	ctx.fillRect(-RX, CY - RY, RX * 2, RY * 2);
	ctx.restore();

	// 4. highlights
	gloss(ctx, -34, CY - 28, 22, 12, -0.5);
	sparkle(ctx, 44, CY + 24, 2.5, 'rgba(200,255,200,1)');

	ctx.restore();
}

export const MELON_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
