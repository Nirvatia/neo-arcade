// Cosmic Galaxian: the owner's COLLECTIBLE_GALAXIAN.html, texture code 1:1.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	// 1. ambient glow (3 layers, violet-blue)
	const glowLayers: Array<{ r: number; stops: Array<[number, string]> }> = [
		{
			r: size * 0.48,
			stops: [
				[0, 'rgba(150,100,255,0.35)'],
				[0.5, 'rgba(100,60,200,0.15)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.35,
			stops: [
				[0, 'rgba(180,130,255,0.3)'],
				[0.5, 'rgba(120,80,220,0.12)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.25,
			stops: [
				[0, 'rgba(200,160,255,0.25)'],
				[0.5, 'rgba(140,100,240,0.1)'],
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
	const shipW = size * 0.3;
	const shipH = size * 0.35;

	// 2. wings
	const leftWing = () => {
		ctx.beginPath();
		ctx.moveTo(-shipW * 0.15, -shipH * 0.1);
		ctx.lineTo(-shipW * 0.9, shipH * 0.3);
		ctx.lineTo(-shipW * 0.15, shipH * 0.15);
		ctx.closePath();
	};
	const rightWing = () => {
		ctx.beginPath();
		ctx.moveTo(shipW * 0.15, -shipH * 0.1);
		ctx.lineTo(shipW * 0.9, shipH * 0.3);
		ctx.lineTo(shipW * 0.15, shipH * 0.15);
		ctx.closePath();
	};

	const wingGrad = ctx.createLinearGradient(0, -shipH * 0.2, 0, shipH * 0.3);
	wingGrad.addColorStop(0, 'rgba(160,120,240,1)');
	wingGrad.addColorStop(0.5, 'rgba(120,80,210,0.95)');
	wingGrad.addColorStop(1, 'rgba(60,40,150,0.9)');
	ctx.fillStyle = wingGrad;
	ctx.shadowBlur = 12;
	ctx.shadowColor = 'rgba(140,100,255,0.9)';
	leftWing();
	ctx.fill();
	rightWing();
	ctx.fill();

	ctx.strokeStyle = 'rgba(200,180,255,0.8)';
	ctx.lineWidth = 2;
	ctx.shadowBlur = 8;
	ctx.shadowColor = 'rgba(180,150,255,1)';
	leftWing();
	ctx.stroke();
	rightWing();
	ctx.stroke();

	// 3. body
	const body = () => {
		ctx.beginPath();
		ctx.moveTo(0, -shipH * 0.5);
		ctx.lineTo(shipW * 0.2, -shipH * 0.1);
		ctx.lineTo(shipW * 0.15, shipH * 0.35);
		ctx.lineTo(-shipW * 0.15, shipH * 0.35);
		ctx.lineTo(-shipW * 0.2, -shipH * 0.1);
		ctx.closePath();
	};

	const bodyGrad = ctx.createRadialGradient(0, -shipH * 0.2, 0, 0, 0, shipH * 0.5);
	bodyGrad.addColorStop(0, 'rgba(220,200,255,1)');
	bodyGrad.addColorStop(0.4, 'rgba(180,150,240,0.98)');
	bodyGrad.addColorStop(0.8, 'rgba(120,90,210,0.95)');
	bodyGrad.addColorStop(1, 'rgba(80,50,160,0.9)');
	ctx.fillStyle = bodyGrad;
	ctx.shadowBlur = 15;
	ctx.shadowColor = 'rgba(180,150,255,1)';
	body();
	ctx.fill();

	ctx.strokeStyle = 'rgba(220,210,255,0.9)';
	ctx.lineWidth = 2;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(200,180,255,1)';
	body();
	ctx.stroke();

	// 4. cockpit
	const cockpitGrad = ctx.createRadialGradient(
		-shipH * 0.03,
		-shipH * 0.18,
		0,
		0,
		-shipH * 0.15,
		shipH * 0.08
	);
	cockpitGrad.addColorStop(0, 'rgba(255,220,230,1)');
	cockpitGrad.addColorStop(0.4, 'rgba(255,140,170,0.98)');
	cockpitGrad.addColorStop(0.8, 'rgba(230,60,110,0.95)');
	cockpitGrad.addColorStop(1, 'rgba(180,30,80,0.9)');
	ctx.fillStyle = cockpitGrad;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(255,100,150,1)';
	ctx.beginPath();
	ctx.arc(0, -shipH * 0.15, shipH * 0.08, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = 'rgba(255,255,255,0.9)';
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(-shipH * 0.03, -shipH * 0.18, shipH * 0.025, 0, Math.PI * 2);
	ctx.fill();

	// 5. wing tips
	for (const side of [-1, 1]) {
		const tx = side * shipW * 0.85;
		const ty = shipH * 0.25;
		const tipGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, shipH * 0.05);
		tipGrad.addColorStop(0, 'rgba(255,200,210,1)');
		tipGrad.addColorStop(0.5, 'rgba(255,100,140,0.95)');
		tipGrad.addColorStop(1, 'rgba(200,50,100,0.8)');
		ctx.fillStyle = tipGrad;
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(255,100,150,1)';
		ctx.beginPath();
		ctx.arc(tx, ty, shipH * 0.05, 0, Math.PI * 2);
		ctx.fill();
	}

	// 6. engine
	const engGrad = ctx.createRadialGradient(0, shipH * 0.35, 0, 0, shipH * 0.35, shipH * 0.08);
	engGrad.addColorStop(0, 'rgba(255,240,180,0.95)');
	engGrad.addColorStop(0.4, 'rgba(255,180,80,0.7)');
	engGrad.addColorStop(0.8, 'rgba(255,120,40,0.3)');
	engGrad.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = engGrad;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(0, shipH * 0.35, shipH * 0.08, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = 'rgba(255,255,240,0.95)';
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(255,200,120,1)';
	ctx.beginPath();
	ctx.arc(0, shipH * 0.35, shipH * 0.025, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

export const GALAXIAN_ART: CollectibleArt = {
	size: 256,
	paint,
	bounds: { x0: -69, y0: -45, x1: 69, y1: 39 },
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
