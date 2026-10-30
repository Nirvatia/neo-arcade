// Pretzel, redrawn for the tile (stage 10.1, the painting kit in `render/common/itemPaint`):
// the mock-up's woven X knot, now as baked golden-brown dough with a glossy crust and white
// salt, outlined in dark brown.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';
import { beginItem, sparkle } from '../../common/itemPaint';

const OUTLINE = 'rgba(40,14,2,0.95)';

/** Salt crystals on the knot, in the knot's 400-unit design. */
const SALT: ReadonlyArray<readonly [number, number]> = [
	[112, 112],
	[155, 96],
	[245, 96],
	[288, 112],
	[152, 248],
	[248, 248],
	[200, 265],
	[318, 170],
	[82, 170]
];

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);
	// the knot's own design: 400 units, its centre at (200, 200)
	ctx.scale(0.62, 0.62);
	ctx.translate(-200, -186);

	// a true X knot, woven in two strokes
	const knot = () => {
		// lower strand: left leg, through the centre, right loop, bottom bridge
		ctx.beginPath();
		ctx.moveTo(130, 300);
		ctx.lineTo(220, 120);
		ctx.bezierCurveTo(250, 60, 340, 110, 295, 215);
		ctx.bezierCurveTo(268, 278, 132, 278, 105, 215);
		ctx.stroke();
		// upper strand, over the first one at the centre
		ctx.beginPath();
		ctx.moveTo(105, 215);
		ctx.bezierCurveTo(60, 110, 150, 60, 180, 120);
		ctx.lineTo(270, 300);
		ctx.stroke();
	};

	// 1. outline
	ctx.strokeStyle = OUTLINE;
	ctx.lineWidth = 66;
	knot();

	// 2. dough: a darker baked edge, the golden crust, a glossy ridge
	ctx.strokeStyle = 'rgba(150,70,14,1)';
	ctx.lineWidth = 46;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(255,160,60,0.8)';
	knot();
	ctx.shadowBlur = 0;
	const crust = ctx.createLinearGradient(80, 80, 320, 320);
	crust.addColorStop(0, 'rgba(250,190,90,1)');
	crust.addColorStop(0.5, 'rgba(226,140,50,1)');
	crust.addColorStop(1, 'rgba(190,100,30,1)');
	ctx.strokeStyle = crust;
	ctx.lineWidth = 32;
	knot();
	ctx.strokeStyle = 'rgba(255,236,190,0.85)';
	ctx.lineWidth = 8;
	knot();

	// 3. salt
	for (const [x, y] of SALT) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(Math.PI / 4);
		ctx.fillStyle = 'rgba(60,24,4,0.5)';
		ctx.fillRect(-6, -4, 13, 13);
		ctx.fillStyle = 'rgba(255,255,255,0.95)';
		ctx.fillRect(-7, -7, 13, 13);
		ctx.restore();
	}

	sparkle(ctx, 300, 120, 4, 'rgba(255,220,160,1)');

	ctx.restore();
}

export const PRETZEL_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
