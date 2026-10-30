// Cosmic Pretzel: the owner's COLLECTIBLE_PRETZEL.html, texture code 1:1 without its
// cosmic backdrop (the fruit keeps inside its tile, stage 10.1). Its mock-up has its own
// texture size (512), display sizes and ticker (a faster, smaller breath).
import type { CollectibleArt, CollectibleMotion } from '../collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	ctx.save();
	ctx.translate(cx, cy);
	ctx.scale(size / 400, size / 400);
	ctx.translate(-200, -200);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

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

	// 1. dark outline with a warm neon blur
	ctx.shadowBlur = 22;
	ctx.shadowColor = 'rgba(245, 85, 20, 0.6)';
	ctx.strokeStyle = '#190801';
	ctx.lineWidth = 64;
	knot();
	ctx.shadowBlur = 0;

	// 2. deep baked dough
	ctx.strokeStyle = '#4a1600';
	ctx.lineWidth = 54;
	knot();

	// 3. crust gradient
	const bodyGrad = ctx.createRadialGradient(200, 200, 10, 200, 200, 160);
	bodyGrad.addColorStop(0, '#e67e22');
	bodyGrad.addColorStop(0.6, '#d35400');
	bodyGrad.addColorStop(1, '#782800');
	ctx.strokeStyle = bodyGrad;
	ctx.lineWidth = 38;
	knot();

	// 4. bright neon core
	ctx.strokeStyle = '#ff9f43';
	ctx.lineWidth = 18;
	knot();

	// 5. thin central light line
	ctx.strokeStyle = '#fff6ee';
	ctx.lineWidth = 5;
	knot();

	// salt crystals
	const saltPositions = [
		{ x: 82, y: 155 },
		{ x: 112, y: 112 },
		{ x: 155, y: 96 },
		{ x: 245, y: 96 },
		{ x: 288, y: 112 },
		{ x: 318, y: 155 },
		{ x: 172, y: 195 },
		{ x: 152, y: 248 },
		{ x: 138, y: 282 },
		{ x: 228, y: 195 },
		{ x: 248, y: 248 },
		{ x: 262, y: 282 },
		{ x: 200, y: 265 }
	];
	for (const salt of saltPositions) {
		ctx.save();
		ctx.translate(salt.x, salt.y);
		ctx.rotate(Math.PI / 4);
		ctx.fillStyle = 'rgba(25, 8, 1, 0.4)';
		ctx.fillRect(-7, -5, 16, 16);
		ctx.fillStyle = 'rgba(60, 255, 245, 0.85)';
		ctx.fillRect(-8, -8, 16, 16);
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(-4, -4, 8, 8);
		ctx.restore();
	}

	// sparkles around
	const sparkles = [
		{ x: 200, y: 40, r: 4 },
		{ x: 55, y: 140, r: 3 },
		{ x: 345, y: 140, r: 3 },
		{ x: 95, y: 285, r: 3 },
		{ x: 305, y: 285, r: 5 }
	];
	for (const sp of sparkles) {
		const glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 4);
		glow.addColorStop(0, 'rgba(255, 150, 50, 0.8)');
		glow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r * 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

function pretzelMotion(time: number): CollectibleMotion {
	return {
		scale: 1 + Math.sin(time * 1.8) * 0.025,
		rotation: Math.sin(time * 0.6) * 0.03,
		alpha: 1,
		bloomAlpha: [0.45 + Math.sin(time * 2.5) * 0.05, 0.25 + Math.sin(time * 1.2) * 0.03]
	};
}

export const PRETZEL_ART: CollectibleArt = {
	size: 512,
	paint,
	sprite: 380,
	blooms: [
		{ size: 400, blur: 5 },
		{ size: 437, blur: 11 }
	],
	motion: pretzelMotion
};
