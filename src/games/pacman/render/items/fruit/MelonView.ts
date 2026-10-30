// Cosmic Melon: the owner's COLLECTIBLE_MELON.html, texture code 1:1.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	// 1. ambient glow (3 layers, green)
	const glowLayers: Array<{ r: number; stops: Array<[number, string]> }> = [
		{
			r: size * 0.48,
			stops: [
				[0, 'rgba(100,255,150,0.35)'],
				[0.5, 'rgba(60,200,100,0.15)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.35,
			stops: [
				[0, 'rgba(140,255,180,0.3)'],
				[0.5, 'rgba(80,220,120,0.12)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.25,
			stops: [
				[0, 'rgba(180,255,200,0.25)'],
				[0.5, 'rgba(100,240,140,0.1)'],
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
	ctx.translate(cx, cy);
	const melonW = size * 0.26;
	const melonH = size * 0.2;

	// 2. body
	const shadow = ctx.createRadialGradient(0, melonH * 0.4, 0, 0, melonH * 0.4, melonW * 1.2);
	shadow.addColorStop(0, 'rgba(20,80,40,0.4)');
	shadow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = shadow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.ellipse(0, melonH * 0.4, melonW * 1.2, melonH * 0.5, 0, 0, Math.PI * 2);
	ctx.fill();

	const bodyGrad = ctx.createRadialGradient(-melonW * 0.3, -melonH * 0.3, 0, 0, 0, melonW * 1.1);
	bodyGrad.addColorStop(0, 'rgba(200,255,220,1)');
	bodyGrad.addColorStop(0.2, 'rgba(140,240,170,0.98)');
	bodyGrad.addColorStop(0.5, 'rgba(80,210,120,0.95)');
	bodyGrad.addColorStop(0.75, 'rgba(50,170,80,0.9)');
	bodyGrad.addColorStop(1, 'rgba(20,100,50,0.8)');
	ctx.fillStyle = bodyGrad;
	ctx.shadowBlur = 15;
	ctx.shadowColor = 'rgba(100,255,150,1)';
	ctx.beginPath();
	ctx.ellipse(0, 0, melonW, melonH, 0, 0, Math.PI * 2);
	ctx.fill();

	const innerGlow = ctx.createRadialGradient(0, 0, melonW * 0.6, 0, 0, melonW);
	innerGlow.addColorStop(0, 'rgba(100,255,150,0)');
	innerGlow.addColorStop(0.7, 'rgba(60,220,100,0.2)');
	innerGlow.addColorStop(1, 'rgba(40,180,80,0.4)');
	ctx.fillStyle = innerGlow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.ellipse(0, 0, melonW, melonH, 0, 0, Math.PI * 2);
	ctx.fill();

	// 3. stripes
	const stripeCount = 6;
	for (let i = 0; i < stripeCount; i++) {
		const t = (i - (stripeCount - 1) / 2) / (stripeCount - 1);
		const x = t * melonW * 1.6;
		if (Math.abs(x) > melonW * 0.85) continue;
		const yTop = -melonH * Math.sqrt(1 - (x / melonW) * (x / melonW)) * 0.85;
		const yBottom = melonH * Math.sqrt(1 - (x / melonW) * (x / melonW)) * 0.85;
		const stripeGrad = ctx.createLinearGradient(x, yTop, x, yBottom);
		stripeGrad.addColorStop(0, 'rgba(20,80,40,0)');
		stripeGrad.addColorStop(0.2, 'rgba(30,100,50,0.6)');
		stripeGrad.addColorStop(0.5, 'rgba(20,80,40,0.75)');
		stripeGrad.addColorStop(0.8, 'rgba(30,100,50,0.6)');
		stripeGrad.addColorStop(1, 'rgba(20,80,40,0)');
		ctx.strokeStyle = stripeGrad;
		ctx.lineWidth = 3.5;
		ctx.shadowBlur = 4;
		ctx.shadowColor = 'rgba(40,120,60,0.6)';
		ctx.lineCap = 'round';
		ctx.beginPath();
		const curveAmount = 0.08;
		ctx.moveTo(x, yTop);
		ctx.quadraticCurveTo(x + x * curveAmount, 0, x, yBottom);
		ctx.stroke();
	}

	const bottomDark = ctx.createLinearGradient(0, 0, 0, melonH);
	bottomDark.addColorStop(0, 'rgba(0,0,0,0)');
	bottomDark.addColorStop(0.6, 'rgba(10,40,20,0.15)');
	bottomDark.addColorStop(1, 'rgba(5,25,10,0.35)');
	ctx.fillStyle = bottomDark;
	ctx.beginPath();
	ctx.ellipse(0, 0, melonW, melonH, 0, 0, Math.PI * 2);
	ctx.fill();

	// 4. highlights
	const highlight1 = ctx.createRadialGradient(
		-melonW * 0.35,
		-melonH * 0.4,
		0,
		-melonW * 0.35,
		-melonH * 0.4,
		melonW * 0.25
	);
	highlight1.addColorStop(0, 'rgba(255,255,255,0.95)');
	highlight1.addColorStop(0.3, 'rgba(230,255,240,0.6)');
	highlight1.addColorStop(0.7, 'rgba(180,255,200,0.2)');
	highlight1.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight1;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.ellipse(-melonW * 0.35, -melonH * 0.4, melonW * 0.25, melonH * 0.15, 0, 0, Math.PI * 2);
	ctx.fill();

	const highlight2 = ctx.createRadialGradient(
		melonW * 0.3,
		melonH * 0.15,
		0,
		melonW * 0.3,
		melonH * 0.15,
		melonW * 0.1
	);
	highlight2.addColorStop(0, 'rgba(200,255,220,0.5)');
	highlight2.addColorStop(0.5, 'rgba(150,255,180,0.2)');
	highlight2.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight2;
	ctx.beginPath();
	ctx.arc(melonW * 0.3, melonH * 0.15, melonW * 0.1, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(140,255,180,0.6)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(100,255,150,0.8)';
	ctx.beginPath();
	ctx.ellipse(0, 0, melonW, melonH, 0, 0, Math.PI * 2);
	ctx.stroke();

	// 5. stem
	const stemGrad = ctx.createLinearGradient(0, -melonH, 0, -melonH * 1.3);
	stemGrad.addColorStop(0, 'rgba(100,255,200,0.9)');
	stemGrad.addColorStop(0.5, 'rgba(80,220,180,0.8)');
	stemGrad.addColorStop(1, 'rgba(60,180,150,0.6)');
	ctx.strokeStyle = stemGrad;
	ctx.lineWidth = 3;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(100,255,200,1)';
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(0, -melonH);
	ctx.quadraticCurveTo(size * 0.02, -melonH * 1.15, size * 0.01, -melonH * 1.3);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(200,255,230,0.7)';
	ctx.lineWidth = 1.2;
	ctx.shadowBlur = 6;
	ctx.beginPath();
	ctx.moveTo(0, -melonH);
	ctx.quadraticCurveTo(size * 0.02, -melonH * 1.15, size * 0.01, -melonH * 1.3);
	ctx.stroke();

	const leafGrad = ctx.createLinearGradient(0, -melonH * 1.15, size * 0.08, -melonH * 1.25);
	leafGrad.addColorStop(0, 'rgba(80,220,160,0.95)');
	leafGrad.addColorStop(0.5, 'rgba(100,240,180,0.9)');
	leafGrad.addColorStop(1, 'rgba(120,255,200,0.7)');
	ctx.fillStyle = leafGrad;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(100,255,200,0.8)';
	ctx.beginPath();
	ctx.ellipse(size * 0.05, -melonH * 1.2, size * 0.04, size * 0.015, Math.PI / 6, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(200,255,230,0.8)';
	ctx.lineWidth = 0.8;
	ctx.shadowBlur = 3;
	ctx.beginPath();
	ctx.moveTo(size * 0.02, -melonH * 1.18);
	ctx.lineTo(size * 0.07, -melonH * 1.22);
	ctx.stroke();

	// 6. energy sparkles
	const sparkles = [
		{ x: size * 0.3, y: -size * 0.05, r: 2 },
		{ x: -size * 0.29, y: -size * 0.08, r: 1.5 },
		{ x: size * 0.27, y: size * 0.12, r: 1.8 },
		{ x: -size * 0.28, y: size * 0.1, r: 1.5 },
		{ x: size * 0.08, y: size * 0.26, r: 1.8 },
		{ x: -size * 0.1, y: -size * 0.26, r: 1.5 }
	];
	for (const sp of sparkles) {
		const sparkleGlow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 3);
		sparkleGlow.addColorStop(0, 'rgba(180,255,200,0.8)');
		sparkleGlow.addColorStop(0.5, 'rgba(120,255,160,0.3)');
		sparkleGlow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = sparkleGlow;
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r * 3, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.95)';
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(180,255,200,1)';
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

export const MELON_ART: CollectibleArt = {
	size: 256,
	paint,
	bounds: { x0: -67, y0: -67, x1: 67, y1: 51 },
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
