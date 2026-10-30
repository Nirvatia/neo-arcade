// Orange, redrawn for the tile (stage 10.1, the painting kit in `render/common/itemPaint`):
// a round orange with a dimpled skin, a stem nub and a green leaf, outlined in dark brown.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';
import { beginItem, gloss, outline, sparkle } from '../../common/itemPaint';

const OUTLINE = 'rgba(80,30,0,0.95)';
const LEAF_OUTLINE = 'rgba(16,50,20,0.95)';
const R = 70;
const CY = 10;

/** Skin pores, fixed so the texture is the same every bake. */
const PORES: ReadonlyArray<readonly [number, number]> = [
	[-40, -10],
	[-20, -36],
	[10, -30],
	[38, -14],
	[-48, 24],
	[-22, 12],
	[6, 2],
	[34, 22],
	[52, 4],
	[-30, 48],
	[0, 38],
	[26, 54],
	[-6, 66],
	[44, 46]
];

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);

	const fruit = () => {
		ctx.beginPath();
		ctx.arc(0, CY, R, 0, Math.PI * 2);
	};
	const leaf = () => {
		ctx.beginPath();
		ctx.moveTo(2, -58);
		ctx.quadraticCurveTo(24, -92, 58, -80);
		ctx.quadraticCurveTo(36, -52, 2, -58);
		ctx.closePath();
	};

	// 1. outline
	outline(ctx, [leaf], LEAF_OUTLINE);
	outline(ctx, [fruit], OUTLINE);

	// 2. leaf
	const green = ctx.createLinearGradient(2, -90, 58, -56);
	green.addColorStop(0, 'rgba(160,240,110,1)');
	green.addColorStop(1, 'rgba(40,150,60,1)');
	ctx.fillStyle = green;
	leaf();
	ctx.fill();
	ctx.strokeStyle = 'rgba(30,110,40,0.8)';
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(6, -60);
	ctx.quadraticCurveTo(30, -70, 50, -76);
	ctx.stroke();

	// 3. body: light from the upper left
	const body = ctx.createRadialGradient(-26, CY - 28, 6, 0, CY, R);
	body.addColorStop(0, 'rgba(255,230,140,1)');
	body.addColorStop(0.35, 'rgba(255,170,40,1)');
	body.addColorStop(0.75, 'rgba(240,120,10,1)');
	body.addColorStop(1, 'rgba(170,70,0,1)');
	ctx.fillStyle = body;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(255,170,60,0.9)';
	fruit();
	ctx.fill();
	ctx.shadowBlur = 0;

	// dimpled skin
	ctx.fillStyle = 'rgba(170,70,0,0.4)';
	for (const [x, y] of PORES) {
		ctx.beginPath();
		ctx.arc(x, y + CY - 10, 2.5, 0, Math.PI * 2);
		ctx.fill();
	}

	// stem nub
	ctx.fillStyle = 'rgba(90,120,30,1)';
	ctx.strokeStyle = OUTLINE;
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.ellipse(0, CY - R + 6, 9, 6, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	// 4. highlights
	gloss(ctx, -30, CY - 30, 22, 14, -0.6);
	sparkle(ctx, 38, CY + 30, 2.5, 'rgba(255,220,150,1)');

	ctx.restore();
}

export const ORANGE_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
