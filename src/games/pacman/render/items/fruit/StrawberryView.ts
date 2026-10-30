// Cosmic Strawberry, redrawn for the tile (stage 10.1): the mock-up's rounded pink berry
// read as a heart or an apple at tile size. A strawberry silhouette instead: a broad
// shoulder narrowing to a point, deep red with rows of golden seeds, a big green calyx
// crown and a stem, with a dark outline so it reads on every season.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

/** Outline: dark wine, wide enough to survive the downscale to a tile. */
const OUTLINE = 'rgba(70,6,20,0.95)';
const LEAF_OUTLINE = 'rgba(10,50,20,0.95)';

/** Calyx leaves: angle from straight down (radians) and length, design units. */
const LEAVES: ReadonlyArray<readonly [number, number]> = [
	[-1.75, 44],
	[-1.05, 40],
	[-0.35, 30],
	[0.35, 30],
	[1.05, 40],
	[1.75, 44]
];
const CROWN_Y = -46;

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	ctx.save();
	ctx.translate(size / 2, size / 2);
	// the design is 256 units across
	ctx.scale(size / 256, size / 256);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	const berry = () => {
		ctx.beginPath();
		ctx.moveTo(0, -46);
		ctx.bezierCurveTo(36, -54, 70, -42, 68, -8);
		ctx.bezierCurveTo(66, 30, 26, 70, 0, 82);
		ctx.bezierCurveTo(-26, 70, -66, 30, -68, -8);
		ctx.bezierCurveTo(-70, -42, -36, -54, 0, -46);
		ctx.closePath();
	};
	const leaf = (angle: number, length: number) => {
		const tipX = Math.sin(angle) * length;
		const tipY = CROWN_Y + Math.cos(angle) * length * 0.55;
		const nx = Math.cos(angle) * 9;
		const ny = -Math.sin(angle) * 9 * 0.55;
		ctx.beginPath();
		ctx.moveTo(0, CROWN_Y - 4);
		ctx.quadraticCurveTo(tipX * 0.5 + nx, (CROWN_Y + tipY) / 2 + ny, tipX, tipY);
		ctx.quadraticCurveTo(tipX * 0.5 - nx, (CROWN_Y + tipY) / 2 - ny, 0, CROWN_Y + 4);
		ctx.closePath();
	};
	const stem = () => {
		ctx.beginPath();
		ctx.moveTo(0, CROWN_Y - 2);
		ctx.quadraticCurveTo(2, -70, 10, -84);
	};

	// 1. outline: every part stroked wide in dark, the fills cover the inner lines
	ctx.lineWidth = 14;
	ctx.strokeStyle = OUTLINE;
	berry();
	ctx.stroke();
	ctx.strokeStyle = LEAF_OUTLINE;
	for (const [a, l] of LEAVES) {
		leaf(a, l);
		ctx.stroke();
	}
	ctx.lineWidth = 20;
	stem();
	ctx.stroke();

	// 2. berry: light from the upper left
	const body = ctx.createRadialGradient(-26, -22, 4, 0, 10, 90);
	body.addColorStop(0, 'rgba(255,130,130,1)');
	body.addColorStop(0.35, 'rgba(240,40,60,1)');
	body.addColorStop(0.75, 'rgba(190,14,40,1)');
	body.addColorStop(1, 'rgba(120,6,28,1)');
	ctx.fillStyle = body;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(255,60,90,0.9)';
	berry();
	ctx.fill();
	ctx.shadowBlur = 0;

	// 3. seeds: staggered rows, each a golden fleck in a small dimple
	ctx.save();
	berry();
	ctx.clip();
	const rows: ReadonlyArray<readonly [number, readonly number[]]> = [
		[-22, [-46, -16, 14, 44]],
		[2, [-56, -30, -2, 26, 52]],
		[26, [-40, -12, 16, 42]],
		[48, [-24, 4, 30]],
		[66, [-8, 14]]
	];
	for (const [y, xs] of rows) {
		for (const x of xs) {
			ctx.fillStyle = 'rgba(110,0,20,0.55)';
			ctx.beginPath();
			ctx.ellipse(x + 1, y + 2, 5.5, 7, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = 'rgba(255,226,110,1)';
			ctx.beginPath();
			ctx.ellipse(x, y, 3.5, 5, 0, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.restore();

	// 4. gloss on the lit shoulder
	const gloss = ctx.createRadialGradient(-34, -20, 0, -34, -20, 22);
	gloss.addColorStop(0, 'rgba(255,255,255,0.9)');
	gloss.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = gloss;
	ctx.beginPath();
	ctx.ellipse(-34, -20, 18, 12, -0.5, 0, Math.PI * 2);
	ctx.fill();

	// 5. stem and calyx
	ctx.strokeStyle = 'rgba(90,170,60,1)';
	ctx.lineWidth = 9;
	stem();
	ctx.stroke();
	const green = ctx.createLinearGradient(0, CROWN_Y - 20, 0, CROWN_Y + 30);
	green.addColorStop(0, 'rgba(150,240,110,1)');
	green.addColorStop(1, 'rgba(40,150,60,1)');
	ctx.fillStyle = green;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(120,255,140,0.8)';
	for (const [a, l] of LEAVES) {
		leaf(a, l);
		ctx.fill();
	}
	ctx.shadowBlur = 0;
	ctx.fillStyle = 'rgba(60,160,60,1)';
	ctx.beginPath();
	ctx.ellipse(0, CROWN_Y, 10, 6, 0, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

export const STRAWBERRY_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
