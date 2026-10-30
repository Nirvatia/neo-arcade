// Cosmic Bell: the owner's COLLECTIBLE_BELL.html, texture code 1:1.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	// 1. ambient glow (3 layers, gold)
	const glowLayers: Array<{ r: number; stops: Array<[number, string]> }> = [
		{
			r: size * 0.48,
			stops: [
				[0, 'rgba(255,220,100,0.35)'],
				[0.5, 'rgba(220,180,60,0.15)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.35,
			stops: [
				[0, 'rgba(255,240,150,0.3)'],
				[0.5, 'rgba(240,200,80,0.12)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.25,
			stops: [
				[0, 'rgba(255,250,180,0.25)'],
				[0.5, 'rgba(250,220,100,0.1)'],
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
	const bellW = size * 0.16;
	const bellH = size * 0.35;

	// 2. body
	const shadow = ctx.createRadialGradient(0, bellH * 0.4, 0, 0, bellH * 0.4, bellW * 1.2);
	shadow.addColorStop(0, 'rgba(120,80,20,0.4)');
	shadow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = shadow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.ellipse(0, bellH * 0.4, bellW * 1.2, bellH * 0.25, 0, 0, Math.PI * 2);
	ctx.fill();

	const bellShape = () => {
		ctx.beginPath();
		ctx.moveTo(-bellW * 0.35, -bellH * 0.5);
		ctx.bezierCurveTo(
			-bellW * 0.35,
			-bellH * 0.3,
			-bellW * 0.5,
			-bellH * 0.1,
			-bellW * 0.85,
			bellH * 0.2
		);
		ctx.bezierCurveTo(-bellW * 0.9, bellH * 0.35, -bellW * 0.75, bellH * 0.45, 0, bellH * 0.45);
		ctx.bezierCurveTo(
			bellW * 0.75,
			bellH * 0.45,
			bellW * 0.9,
			bellH * 0.35,
			bellW * 0.85,
			bellH * 0.2
		);
		ctx.bezierCurveTo(
			bellW * 0.5,
			-bellH * 0.1,
			bellW * 0.35,
			-bellH * 0.3,
			bellW * 0.35,
			-bellH * 0.5
		);
		ctx.lineTo(-bellW * 0.35, -bellH * 0.5);
		ctx.closePath();
	};

	const bodyGrad = ctx.createRadialGradient(-bellW * 0.2, -bellH * 0.2, 0, 0, 0, bellW * 1.2);
	bodyGrad.addColorStop(0, 'rgba(255,250,200,1)');
	bodyGrad.addColorStop(0.2, 'rgba(255,230,140,0.98)');
	bodyGrad.addColorStop(0.5, 'rgba(255,200,80,0.95)');
	bodyGrad.addColorStop(0.75, 'rgba(220,160,50,0.9)');
	bodyGrad.addColorStop(1, 'rgba(160,100,20,0.8)');
	ctx.fillStyle = bodyGrad;
	ctx.shadowBlur = 15;
	ctx.shadowColor = 'rgba(255,200,80,1)';
	bellShape();
	ctx.fill();

	const innerGlow = ctx.createRadialGradient(0, 0, bellW * 0.5, 0, 0, bellW * 1.1);
	innerGlow.addColorStop(0, 'rgba(255,220,100,0)');
	innerGlow.addColorStop(0.7, 'rgba(255,180,60,0.2)');
	innerGlow.addColorStop(1, 'rgba(255,160,40,0.4)');
	ctx.fillStyle = innerGlow;
	ctx.shadowBlur = 0;
	bellShape();
	ctx.fill();

	const bottomDark = ctx.createLinearGradient(0, 0, 0, bellH * 0.45);
	bottomDark.addColorStop(0, 'rgba(0,0,0,0)');
	bottomDark.addColorStop(0.6, 'rgba(80,50,10,0.15)');
	bottomDark.addColorStop(1, 'rgba(60,30,5,0.35)');
	ctx.fillStyle = bottomDark;
	bellShape();
	ctx.fill();

	// 3. energy rings
	const ringCount = 3;
	for (let i = 0; i < ringCount; i++) {
		const t = (i + 1) / (ringCount + 1);
		const y = -bellH * 0.3 + t * bellH * 0.7;
		const widthAtY = bellW * (0.35 + t * 0.5);
		const ringGrad = ctx.createLinearGradient(-widthAtY, y, widthAtY, y);
		ringGrad.addColorStop(0, 'rgba(255,240,180,0)');
		ringGrad.addColorStop(0.2, 'rgba(255,240,180,0.5)');
		ringGrad.addColorStop(0.5, 'rgba(255,250,200,0.7)');
		ringGrad.addColorStop(0.8, 'rgba(255,240,180,0.5)');
		ringGrad.addColorStop(1, 'rgba(255,240,180,0)');
		ctx.strokeStyle = ringGrad;
		ctx.lineWidth = 2;
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(255,220,120,0.8)';
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(-widthAtY, y);
		ctx.lineTo(widthAtY, y);
		ctx.stroke();
	}

	// 4. highlights
	const highlight1 = ctx.createRadialGradient(
		-bellW * 0.35,
		-bellH * 0.2,
		0,
		-bellW * 0.35,
		-bellH * 0.2,
		bellW * 0.25
	);
	highlight1.addColorStop(0, 'rgba(255,255,255,0.95)');
	highlight1.addColorStop(0.3, 'rgba(255,250,230,0.6)');
	highlight1.addColorStop(0.7, 'rgba(255,230,180,0.2)');
	highlight1.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight1;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.ellipse(-bellW * 0.35, -bellH * 0.2, bellW * 0.25, bellH * 0.12, 0, 0, Math.PI * 2);
	ctx.fill();

	const highlight2 = ctx.createRadialGradient(
		bellW * 0.25,
		bellH * 0.1,
		0,
		bellW * 0.25,
		bellH * 0.1,
		bellW * 0.12
	);
	highlight2.addColorStop(0, 'rgba(255,240,200,0.5)');
	highlight2.addColorStop(0.5, 'rgba(255,220,150,0.2)');
	highlight2.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight2;
	ctx.beginPath();
	ctx.arc(bellW * 0.25, bellH * 0.1, bellW * 0.12, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(255,220,120,0.6)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(255,200,100,0.8)';
	bellShape();
	ctx.stroke();

	// 5. handle
	const handleGrad = ctx.createLinearGradient(0, -bellH * 0.5, 0, -bellH * 0.7);
	handleGrad.addColorStop(0, 'rgba(255,220,100,0.9)');
	handleGrad.addColorStop(0.5, 'rgba(255,200,80,0.8)');
	handleGrad.addColorStop(1, 'rgba(220,160,50,0.6)');
	ctx.strokeStyle = handleGrad;
	ctx.lineWidth = 3;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(255,200,80,1)';
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(0, -bellH * 0.6, bellW * 0.18, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(255,250,200,0.7)';
	ctx.lineWidth = 1.2;
	ctx.shadowBlur = 6;
	ctx.beginPath();
	ctx.arc(0, -bellH * 0.6, bellW * 0.18, 0, Math.PI * 2);
	ctx.stroke();

	// 6. clapper
	const clapperGrad = ctx.createRadialGradient(0, bellH * 0.3, 0, 0, bellH * 0.3, bellW * 0.12);
	clapperGrad.addColorStop(0, 'rgba(180,140,60,0.95)');
	clapperGrad.addColorStop(0.5, 'rgba(140,100,30,0.9)');
	clapperGrad.addColorStop(1, 'rgba(80,50,10,0.8)');
	ctx.fillStyle = clapperGrad;
	ctx.shadowBlur = 8;
	ctx.shadowColor = 'rgba(200,160,60,0.8)';
	ctx.beginPath();
	ctx.arc(0, bellH * 0.3, bellW * 0.12, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = 'rgba(255,240,180,0.6)';
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(-bellW * 0.04, bellH * 0.27, bellW * 0.03, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

export const BELL_ART: CollectibleArt = {
	size: 256,
	paint,
	bounds: { x0: -36, y0: -63, x1: 36, y1: 41 },
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
