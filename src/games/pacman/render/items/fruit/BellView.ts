// Cosmic Bell, redrawn for the tile (stage 10.1): the mock-up's narrow cone read as a flame
// at tile size. A classic bell silhouette instead: a domed crown with a loop, a flaring
// skirt, a heavy rim and the clapper hanging under it, gold with a dark outline so it reads
// on every season.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

/** Outline: dark amber, wide enough to survive the downscale to a tile. */
const OUTLINE = 'rgba(70,38,6,0.95)';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	ctx.save();
	ctx.translate(size / 2, size / 2);
	// the design is 256 units across
	ctx.scale(size / 256, size / 256);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	const body = () => {
		ctx.beginPath();
		ctx.moveTo(0, -70);
		ctx.bezierCurveTo(32, -70, 46, -52, 48, -22);
		ctx.bezierCurveTo(50, 8, 58, 30, 80, 44);
		ctx.quadraticCurveTo(0, 56, -80, 44);
		ctx.bezierCurveTo(-58, 30, -50, 8, -48, -22);
		ctx.bezierCurveTo(-46, -52, -32, -70, 0, -70);
		ctx.closePath();
	};
	const rim = () => {
		ctx.beginPath();
		ctx.ellipse(0, 48, 86, 15, 0, 0, Math.PI * 2);
	};
	const loop = () => {
		ctx.beginPath();
		ctx.arc(0, -84, 13, 0, Math.PI * 2);
	};
	const clapper = () => {
		ctx.beginPath();
		ctx.arc(0, 68, 14, 0, Math.PI * 2);
	};

	// 1. outline: every part stroked wide in dark, the fills cover the inner lines
	ctx.strokeStyle = OUTLINE;
	ctx.lineWidth = 14;
	for (const part of [loop, clapper, body, rim]) {
		part();
		ctx.stroke();
	}

	// 2. loop
	ctx.strokeStyle = 'rgba(255,214,90,1)';
	ctx.lineWidth = 8;
	loop();
	ctx.stroke();

	// 3. clapper, behind the rim
	const clapperGrad = ctx.createRadialGradient(-5, 62, 0, 0, 68, 16);
	clapperGrad.addColorStop(0, 'rgba(255,250,220,1)');
	clapperGrad.addColorStop(0.5, 'rgba(240,190,80,1)');
	clapperGrad.addColorStop(1, 'rgba(150,90,20,1)');
	ctx.fillStyle = clapperGrad;
	clapper();
	ctx.fill();

	// 4. body: light from the upper left
	const bodyGrad = ctx.createLinearGradient(-60, 0, 70, 0);
	bodyGrad.addColorStop(0, 'rgba(255,236,150,1)');
	bodyGrad.addColorStop(0.3, 'rgba(255,214,80,1)');
	bodyGrad.addColorStop(0.7, 'rgba(236,160,30,1)');
	bodyGrad.addColorStop(1, 'rgba(176,100,14,1)');
	ctx.fillStyle = bodyGrad;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(255,200,80,0.9)';
	body();
	ctx.fill();
	ctx.shadowBlur = 0;

	// shading towards the skirt
	const skirt = ctx.createLinearGradient(0, -70, 0, 50);
	skirt.addColorStop(0, 'rgba(255,255,220,0.35)');
	skirt.addColorStop(0.45, 'rgba(0,0,0,0)');
	skirt.addColorStop(1, 'rgba(120,60,0,0.3)');
	ctx.fillStyle = skirt;
	body();
	ctx.fill();

	// 5. a band around the waist
	ctx.save();
	body();
	ctx.clip();
	ctx.strokeStyle = 'rgba(150,84,10,0.7)';
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.moveTo(-60, 10);
	ctx.quadraticCurveTo(0, 22, 60, 10);
	ctx.stroke();
	ctx.strokeStyle = 'rgba(255,240,170,0.8)';
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(-60, 4);
	ctx.quadraticCurveTo(0, 16, 60, 4);
	ctx.stroke();
	ctx.restore();

	// 6. rim
	const rimGrad = ctx.createLinearGradient(-86, 0, 86, 0);
	rimGrad.addColorStop(0, 'rgba(255,226,120,1)');
	rimGrad.addColorStop(0.35, 'rgba(255,200,70,1)');
	rimGrad.addColorStop(1, 'rgba(170,96,12,1)');
	ctx.fillStyle = rimGrad;
	rim();
	ctx.fill();
	ctx.strokeStyle = 'rgba(255,248,200,0.85)';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.ellipse(0, 46, 78, 10, 0, Math.PI * 1.05, Math.PI * 1.6);
	ctx.stroke();

	// 7. highlights: a long gloss streak on the lit side, a glint on the crown
	const gloss = ctx.createLinearGradient(-40, -40, -20, 30);
	gloss.addColorStop(0, 'rgba(255,255,255,0.95)');
	gloss.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.strokeStyle = gloss;
	ctx.lineWidth = 9;
	ctx.beginPath();
	ctx.moveTo(-28, -50);
	ctx.bezierCurveTo(-36, -30, -36, -6, -42, 22);
	ctx.stroke();
	ctx.fillStyle = 'rgba(255,255,255,0.9)';
	ctx.beginPath();
	ctx.ellipse(-10, -58, 9, 5, -0.3, 0, Math.PI * 2);
	ctx.fill();

	// 8. sparkles on the metal
	for (const [x, y, r] of [
		[30, -30, 3],
		[56, 34, 2.5]
	] as const) {
		ctx.fillStyle = 'rgba(255,255,255,0.95)';
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(255,240,180,1)';
		ctx.beginPath();
		ctx.moveTo(x, y - r * 3);
		ctx.lineTo(x + r * 0.7, y - r * 0.7);
		ctx.lineTo(x + r * 3, y);
		ctx.lineTo(x + r * 0.7, y + r * 0.7);
		ctx.lineTo(x, y + r * 3);
		ctx.lineTo(x - r * 0.7, y + r * 0.7);
		ctx.lineTo(x - r * 3, y);
		ctx.lineTo(x - r * 0.7, y - r * 0.7);
		ctx.closePath();
		ctx.fill();
	}
	ctx.shadowBlur = 0;

	ctx.restore();
}

export const BELL_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
