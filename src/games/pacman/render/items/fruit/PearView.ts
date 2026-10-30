// Cosmic Pear: the owner's COLLECTIBLE_PEAR.html, texture code 1:1 without its
// ambient glow (the fruit keeps inside its tile, stage 10.1). In the game every fruit
// fits the same size, so the mock-up's larger display is not kept.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	ctx.save();
	ctx.translate(cx, cy);

	// 1. stem
	const stemGrad = ctx.createLinearGradient(0, -70, 0, -95);
	stemGrad.addColorStop(0, 'rgba(100,255,200,0.9)');
	stemGrad.addColorStop(1, 'rgba(60,180,150,0.6)');
	ctx.strokeStyle = stemGrad;
	ctx.lineWidth = 4;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(100,255,200,1)';
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(0, -70);
	ctx.quadraticCurveTo(3, -82, 0, -95);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(200,255,230,0.7)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 6;
	ctx.beginPath();
	ctx.moveTo(0, -70);
	ctx.quadraticCurveTo(3, -82, 0, -95);
	ctx.stroke();

	// 2. leaf
	const leafGrad = ctx.createLinearGradient(0, -78, 20, -85);
	leafGrad.addColorStop(0, 'rgba(80,220,160,0.95)');
	leafGrad.addColorStop(1, 'rgba(120,255,200,0.7)');
	ctx.fillStyle = leafGrad;
	ctx.shadowBlur = 8;
	ctx.shadowColor = 'rgba(100,255,200,0.9)';
	ctx.beginPath();
	ctx.moveTo(0, -78);
	ctx.quadraticCurveTo(16, -92, 20, -82);
	ctx.quadraticCurveTo(12, -74, 0, -78);
	ctx.fill();

	ctx.strokeStyle = 'rgba(200,255,230,0.8)';
	ctx.lineWidth = 1;
	ctx.shadowBlur = 4;
	ctx.beginPath();
	ctx.moveTo(0, -78);
	ctx.lineTo(12, -84);
	ctx.stroke();

	// 3. body
	const shadow = ctx.createRadialGradient(0, 70, 0, 0, 70, 60);
	shadow.addColorStop(0, 'rgba(80,100,20,0.4)');
	shadow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = shadow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.ellipse(0, 70, 60, 20, 0, 0, Math.PI * 2);
	ctx.fill();

	const pearShape = () => {
		ctx.beginPath();
		ctx.moveTo(0, -70);
		// right side: narrow top → wide bottom
		ctx.bezierCurveTo(25, -70, 35, -40, 55, 0);
		ctx.bezierCurveTo(65, 30, 50, 70, 0, 75);
		// left side (mirrored)
		ctx.bezierCurveTo(-50, 70, -65, 30, -55, 0);
		ctx.bezierCurveTo(-35, -40, -25, -70, 0, -70);
		ctx.closePath();
	};

	const bodyGrad = ctx.createRadialGradient(-15, -20, 0, 0, 20, 80);
	bodyGrad.addColorStop(0, 'rgba(240,255,180,1)');
	bodyGrad.addColorStop(0.3, 'rgba(200,240,120,0.98)');
	bodyGrad.addColorStop(0.6, 'rgba(160,210,80,0.95)');
	bodyGrad.addColorStop(1, 'rgba(100,160,50,0.9)');
	ctx.fillStyle = bodyGrad;
	ctx.shadowBlur = 15;
	ctx.shadowColor = 'rgba(180,255,100,1)';
	pearShape();
	ctx.fill();

	ctx.shadowBlur = 0;
	const innerGlow = ctx.createRadialGradient(0, 0, 20, 0, 20, 75);
	innerGlow.addColorStop(0, 'rgba(220,255,150,0)');
	innerGlow.addColorStop(0.7, 'rgba(180,230,100,0.2)');
	innerGlow.addColorStop(1, 'rgba(150,200,70,0.4)');
	ctx.fillStyle = innerGlow;
	pearShape();
	ctx.fill();

	const blush = ctx.createRadialGradient(20, 30, 0, 20, 30, 35);
	blush.addColorStop(0, 'rgba(255,250,180,0.4)');
	blush.addColorStop(0.5, 'rgba(255,230,120,0.2)');
	blush.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = blush;
	pearShape();
	ctx.fill();

	// 4. highlights
	const highlight1 = ctx.createRadialGradient(-25, -30, 0, -25, -30, 30);
	highlight1.addColorStop(0, 'rgba(255,255,255,0.9)');
	highlight1.addColorStop(0.4, 'rgba(255,255,230,0.5)');
	highlight1.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight1;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.ellipse(-25, -30, 25, 15, -0.3, 0, Math.PI * 2);
	ctx.fill();

	const highlight2 = ctx.createRadialGradient(30, 20, 0, 30, 20, 15);
	highlight2.addColorStop(0, 'rgba(255,255,240,0.6)');
	highlight2.addColorStop(0.5, 'rgba(255,250,200,0.3)');
	highlight2.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight2;
	ctx.beginPath();
	ctx.arc(30, 20, 15, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(220,255,150,0.6)';
	ctx.lineWidth = 2;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(200,255,120,0.8)';
	pearShape();
	ctx.stroke();

	// 5. energy sparkles
	const sparkles = [
		{ x: 70, y: -25, r: 2 },
		{ x: -68, y: -30, r: 1.8 },
		{ x: 62, y: 38, r: 2 },
		{ x: -65, y: 45, r: 1.8 },
		{ x: 12, y: 75, r: 2 },
		{ x: -20, y: -70, r: 1.8 }
	];
	for (const sp of sparkles) {
		const sparkleGlow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 3);
		sparkleGlow.addColorStop(0, 'rgba(220,255,180,0.8)');
		sparkleGlow.addColorStop(0.5, 'rgba(180,230,120,0.3)');
		sparkleGlow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = sparkleGlow;
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r * 3, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.95)';
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(220,255,180,1)';
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

export const PEAR_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
