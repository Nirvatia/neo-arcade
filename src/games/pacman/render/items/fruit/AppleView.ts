// Cosmic Apple: the owner's COLLECTIBLE_APPLE.html, texture code 1:1.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	// 1. ambient glow (3 layers, red)
	const glowLayers: Array<{ r: number; stops: Array<[number, string]> }> = [
		{
			r: size * 0.48,
			stops: [
				[0, 'rgba(255,80,80,0.35)'],
				[0.5, 'rgba(200,50,50,0.15)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.35,
			stops: [
				[0, 'rgba(255,120,120,0.3)'],
				[0.5, 'rgba(220,70,70,0.12)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.25,
			stops: [
				[0, 'rgba(255,160,160,0.25)'],
				[0.5, 'rgba(240,90,90,0.1)'],
				[1, 'rgba(0,0,0,0)']
			]
		}
	];
	for (const layer of glowLayers) {
		const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, layer.r);
		for (const [offset, color] of layer.stops) g.addColorStop(offset, color);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, size, size);
	}

	ctx.save();
	ctx.translate(cx, cy + 8);
	const s = 1.15;

	// 2. stem
	const stemGrad = ctx.createLinearGradient(0, -56 * s, 28 * s, -105 * s);
	stemGrad.addColorStop(0, 'rgba(100,255,200,0.9)');
	stemGrad.addColorStop(0.5, 'rgba(80,220,180,0.8)');
	stemGrad.addColorStop(1, 'rgba(60,180,150,0.6)');
	ctx.strokeStyle = stemGrad;
	ctx.lineWidth = 4;
	ctx.shadowBlur = 12;
	ctx.shadowColor = 'rgba(100,255,200,1)';
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(0, -56 * s);
	ctx.bezierCurveTo(6 * s, -85 * s, 18 * s, -95 * s, 28 * s, -105 * s);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(200,255,230,0.7)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 8;
	ctx.beginPath();
	ctx.moveTo(0, -56 * s);
	ctx.bezierCurveTo(6 * s, -85 * s, 18 * s, -95 * s, 28 * s, -105 * s);
	ctx.stroke();

	// 3. leaf
	const leafGrad = ctx.createLinearGradient(8 * s, -72 * s, 45 * s, -75 * s);
	leafGrad.addColorStop(0, 'rgba(80,220,160,0.95)');
	leafGrad.addColorStop(0.5, 'rgba(100,240,180,0.9)');
	leafGrad.addColorStop(1, 'rgba(120,255,200,0.7)');
	ctx.fillStyle = leafGrad;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(100,255,200,0.9)';
	ctx.beginPath();
	ctx.moveTo(8 * s, -72 * s);
	ctx.quadraticCurveTo(35 * s, -98 * s, 45 * s, -75 * s);
	ctx.quadraticCurveTo(24 * s, -62 * s, 8 * s, -72 * s);
	ctx.fill();

	ctx.strokeStyle = 'rgba(200,255,230,0.8)';
	ctx.lineWidth = 1;
	ctx.shadowBlur = 6;
	ctx.beginPath();
	ctx.moveTo(10 * s, -72 * s);
	ctx.quadraticCurveTo(28 * s, -82 * s, 40 * s, -76 * s);
	ctx.stroke();

	// 4. body
	const shadow = ctx.createRadialGradient(0, 88 * s * 0.3, 0, 0, 88 * s * 0.3, 95 * s);
	shadow.addColorStop(0, 'rgba(100,20,20,0.4)');
	shadow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = shadow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(0, 88 * s * 0.3, 95 * s, 0, Math.PI * 2);
	ctx.fill();

	const appleShape = () => {
		ctx.beginPath();
		ctx.moveTo(0, -58 * s);
		ctx.bezierCurveTo(-15 * s, -58 * s, -45 * s, -72 * s, -72 * s, -50 * s);
		ctx.bezierCurveTo(-95 * s, -30 * s, -92 * s, 15 * s, -85 * s, 40 * s);
		ctx.bezierCurveTo(-78 * s, 65 * s, -45 * s, 95 * s, -22 * s, 95 * s);
		ctx.bezierCurveTo(-10 * s, 95 * s, -10 * s, 88 * s, 0 * s, 88 * s);
		ctx.bezierCurveTo(10 * s, 88 * s, 10 * s, 95 * s, 22 * s, 95 * s);
		ctx.bezierCurveTo(45 * s, 95 * s, 78 * s, 65 * s, 85 * s, 40 * s);
		ctx.bezierCurveTo(92 * s, 15 * s, 95 * s, -30 * s, 72 * s, -50 * s);
		ctx.bezierCurveTo(45 * s, -72 * s, 15 * s, -58 * s, 0 * s, -58 * s);
		ctx.closePath();
	};

	const bodyGrad = ctx.createRadialGradient(-20 * s, -20 * s, 5 * s, 0, 10 * s, 105 * s);
	bodyGrad.addColorStop(0, 'rgba(255,200,200,1)');
	bodyGrad.addColorStop(0.2, 'rgba(255,100,100,0.98)');
	bodyGrad.addColorStop(0.5, 'rgba(230,50,50,0.95)');
	bodyGrad.addColorStop(0.75, 'rgba(180,30,30,0.9)');
	bodyGrad.addColorStop(1, 'rgba(100,10,10,0.8)');
	ctx.fillStyle = bodyGrad;
	ctx.shadowBlur = 15;
	ctx.shadowColor = 'rgba(255,80,80,1)';
	appleShape();
	ctx.fill();

	const innerGlow = ctx.createRadialGradient(0, 0, 50 * s, 0, 0, 105 * s);
	innerGlow.addColorStop(0, 'rgba(255,100,100,0)');
	innerGlow.addColorStop(0.7, 'rgba(255,60,60,0.2)');
	innerGlow.addColorStop(1, 'rgba(255,40,40,0.4)');
	ctx.fillStyle = innerGlow;
	ctx.shadowBlur = 0;
	appleShape();
	ctx.fill();

	const blush = ctx.createRadialGradient(30 * s, 20 * s, 0, 30 * s, 20 * s, 40 * s);
	blush.addColorStop(0, 'rgba(255,200,100,0.3)');
	blush.addColorStop(0.5, 'rgba(255,180,80,0.15)');
	blush.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = blush;
	appleShape();
	ctx.fill();

	const bottomDark = ctx.createLinearGradient(0, 0, 0, 88 * s);
	bottomDark.addColorStop(0, 'rgba(0,0,0,0)');
	bottomDark.addColorStop(0.6, 'rgba(60,10,10,0.15)');
	bottomDark.addColorStop(1, 'rgba(40,5,5,0.35)');
	ctx.fillStyle = bottomDark;
	appleShape();
	ctx.fill();

	// 5. highlights
	const highlight1 = ctx.createRadialGradient(-30 * s, -30 * s, 0, -30 * s, -30 * s, 25 * s);
	highlight1.addColorStop(0, 'rgba(255,255,255,0.95)');
	highlight1.addColorStop(0.3, 'rgba(255,230,230,0.6)');
	highlight1.addColorStop(0.7, 'rgba(255,180,180,0.2)');
	highlight1.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight1;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(-30 * s, -30 * s, 25 * s, 0, Math.PI * 2);
	ctx.fill();

	const highlight2 = ctx.createRadialGradient(40 * s, 30 * s, 0, 40 * s, 30 * s, 15 * s);
	highlight2.addColorStop(0, 'rgba(255,200,200,0.5)');
	highlight2.addColorStop(0.5, 'rgba(255,150,150,0.2)');
	highlight2.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight2;
	ctx.beginPath();
	ctx.arc(40 * s, 30 * s, 15 * s, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(255,140,140,0.6)';
	ctx.lineWidth = 2;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(255,100,100,0.8)';
	appleShape();
	ctx.stroke();

	// 6. energy sparkles
	const sparkles = [
		{ x: size * 0.28, y: -size * 0.05, r: 2 },
		{ x: -size * 0.27, y: -size * 0.08, r: 1.5 },
		{ x: size * 0.25, y: size * 0.15, r: 1.8 },
		{ x: -size * 0.26, y: size * 0.12, r: 1.5 },
		{ x: size * 0.05, y: size * 0.28, r: 1.8 },
		{ x: -size * 0.08, y: -size * 0.27, r: 1.5 }
	];
	for (const sp of sparkles) {
		const sparkleGlow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 3);
		sparkleGlow.addColorStop(0, 'rgba(255,180,180,0.8)');
		sparkleGlow.addColorStop(0.5, 'rgba(255,120,120,0.3)');
		sparkleGlow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = sparkleGlow;
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r * 3, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.95)';
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(255,180,180,1)';
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

export const APPLE_ART: CollectibleArt = {
	size: 256,
	paint,
	bounds: { x0: -105, y0: -113, x1: 105, y1: 117 },
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
