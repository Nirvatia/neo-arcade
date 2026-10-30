// Key, redrawn for the tile (stage 10.1, the painting kit in `render/common/itemPaint`):
// the mock-up's crystal key read as a lollipop at tile size. A plain key instead, laid on
// the diagonal to fill the tile: a round bow with a clear hole, a collar, a thick shaft and
// two teeth, cold steel-cyan (apart from the gold bell) with a dark outline so it reads on
// every season.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';
import { beginItem, outline, sparkle } from '../../common/itemPaint';

/** Outline: deep blue, wide enough to survive the downscale to a tile. */
const OUTLINE = 'rgba(10,30,70,0.95)';

const BOW_Y = -56;
const BOW_R = 42;
const HOLE_R = 19;

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);
	// drawn upright and laid on the diagonal (bow top left)
	ctx.rotate(-Math.PI / 4);

	const bow = () => {
		ctx.beginPath();
		ctx.arc(0, BOW_Y, BOW_R, 0, Math.PI * 2);
	};
	const hole = () => {
		ctx.beginPath();
		ctx.arc(0, BOW_Y, HOLE_R, 0, Math.PI * 2);
	};
	const collar = () => {
		ctx.beginPath();
		ctx.roundRect(-17, -24, 34, 14, 5);
	};
	const shaft = () => {
		ctx.beginPath();
		ctx.roundRect(-12, -20, 24, 106, 6);
	};
	const teeth = () => {
		ctx.beginPath();
		ctx.roundRect(4, 40, 38, 18, 3);
		ctx.roundRect(4, 68, 30, 18, 3);
	};
	const parts = [bow, collar, shaft, teeth];

	// 1. outline: every part stroked wide in dark, the fills cover the inner lines
	outline(ctx, parts, OUTLINE);

	// 2. metal: lit across the key, from its left edge
	const metal = ctx.createLinearGradient(-42, 0, 42, 0);
	metal.addColorStop(0, 'rgba(210,246,255,1)');
	metal.addColorStop(0.35, 'rgba(120,212,250,1)');
	metal.addColorStop(0.7, 'rgba(50,140,215,1)');
	metal.addColorStop(1, 'rgba(25,80,160,1)');
	ctx.fillStyle = metal;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(120,220,255,0.9)';
	for (const part of parts) {
		part();
		ctx.fill();
	}
	ctx.shadowBlur = 0;

	// the bow's ring reads as a ring: a darker inner bevel
	const bevel = ctx.createRadialGradient(0, BOW_Y, HOLE_R, 0, BOW_Y, BOW_R);
	bevel.addColorStop(0, 'rgba(20,60,130,0.55)');
	bevel.addColorStop(0.45, 'rgba(20,60,130,0)');
	bevel.addColorStop(0.85, 'rgba(255,255,255,0)');
	bevel.addColorStop(1, 'rgba(20,60,130,0.35)');
	ctx.fillStyle = bevel;
	bow();
	ctx.fill();

	// 3. the hole: cut through, with its own dark rim
	ctx.globalCompositeOperation = 'destination-out';
	hole();
	ctx.fill();
	ctx.globalCompositeOperation = 'source-over';
	ctx.strokeStyle = OUTLINE;
	ctx.lineWidth = 6;
	hole();
	ctx.stroke();

	// 4. groove down the shaft
	ctx.strokeStyle = 'rgba(25,80,150,0.6)';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(-2, -6);
	ctx.lineTo(-2, 84);
	ctx.stroke();

	// 5. highlights: the bow's lit edge and a streak along the shaft
	ctx.strokeStyle = 'rgba(255,255,255,0.9)';
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.arc(0, BOW_Y, BOW_R - 9, Math.PI * 1.0, Math.PI * 1.35);
	ctx.stroke();
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(-6, -2);
	ctx.lineTo(-6, 40);
	ctx.stroke();

	// 6. a sparkle on the bow
	sparkle(ctx, 22, BOW_Y - 18, 3, 'rgba(200,240,255,1)');

	ctx.restore();
}

export const KEY_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
