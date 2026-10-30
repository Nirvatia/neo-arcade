// Cosmic Crystal Key: the owner's COLLECTIBLE_KEY.html, texture code 1:1.
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
				[0, 'rgba(150,120,255,0.35)'],
				[0.5, 'rgba(100,80,220,0.15)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.35,
			stops: [
				[0, 'rgba(180,150,255,0.3)'],
				[0.5, 'rgba(120,100,240,0.12)'],
				[1, 'rgba(0,0,0,0)']
			]
		},
		{
			r: size * 0.25,
			stops: [
				[0, 'rgba(200,180,255,0.25)'],
				[0.5, 'rgba(140,120,255,0.1)'],
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

	const headR = size * 0.14;
	const headY = -size * 0.1;
	const shaftW = size * 0.035;
	const shaftTop = headY + headR * 0.9;
	const shaftBottom = size * 0.32;

	// 2. shaft + teeth
	const shaftAndTeeth = () => {
		ctx.beginPath();
		ctx.moveTo(-shaftW, shaftTop);
		ctx.lineTo(-shaftW, shaftBottom);
		// tooth 1 (lower): thin, rounded
		ctx.lineTo(shaftW * 1.8, shaftBottom);
		ctx.quadraticCurveTo(shaftW * 2.2, shaftBottom, shaftW * 2.2, shaftBottom - size * 0.015);
		ctx.lineTo(shaftW * 2.2, shaftBottom - size * 0.04);
		ctx.quadraticCurveTo(
			shaftW * 2.2,
			shaftBottom - size * 0.055,
			shaftW * 1.8,
			shaftBottom - size * 0.055
		);
		ctx.lineTo(shaftW, shaftBottom - size * 0.055);
		// gap
		ctx.lineTo(shaftW, shaftBottom - size * 0.1);
		// tooth 2 (upper)
		ctx.lineTo(shaftW * 1.5, shaftBottom - size * 0.1);
		ctx.quadraticCurveTo(
			shaftW * 2,
			shaftBottom - size * 0.1,
			shaftW * 2,
			shaftBottom - size * 0.115
		);
		ctx.lineTo(shaftW * 2, shaftBottom - size * 0.15);
		ctx.quadraticCurveTo(
			shaftW * 2,
			shaftBottom - size * 0.165,
			shaftW * 1.5,
			shaftBottom - size * 0.165
		);
		ctx.lineTo(shaftW, shaftBottom - size * 0.165);
		ctx.lineTo(shaftW, shaftTop);
		ctx.closePath();
	};

	const shaftGrad = ctx.createLinearGradient(-shaftW, 0, shaftW * 2.2, 0);
	shaftGrad.addColorStop(0, 'rgba(100,120,180,0.9)');
	shaftGrad.addColorStop(0.3, 'rgba(180,200,240,0.98)');
	shaftGrad.addColorStop(0.6, 'rgba(150,170,220,0.95)');
	shaftGrad.addColorStop(1, 'rgba(80,100,150,0.85)');
	ctx.fillStyle = shaftGrad;
	ctx.shadowBlur = 12;
	ctx.shadowColor = 'rgba(150,180,255,0.9)';
	shaftAndTeeth();
	ctx.fill();

	ctx.strokeStyle = 'rgba(200,220,255,0.7)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(180,200,255,0.8)';
	shaftAndTeeth();
	ctx.stroke();

	const shaftHighlight = ctx.createLinearGradient(-shaftW, 0, shaftW, 0);
	shaftHighlight.addColorStop(0, 'rgba(255,255,255,0)');
	shaftHighlight.addColorStop(0.3, 'rgba(220,240,255,0.5)');
	shaftHighlight.addColorStop(0.5, 'rgba(255,255,255,0.7)');
	shaftHighlight.addColorStop(0.7, 'rgba(220,240,255,0.5)');
	shaftHighlight.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = shaftHighlight;
	ctx.shadowBlur = 0;
	ctx.fillRect(-shaftW, shaftTop, shaftW * 2, shaftBottom - shaftTop);

	for (let i = 0; i < 2; i++) {
		const ringY = shaftTop + (shaftBottom - shaftTop) * (0.3 + i * 0.35);
		ctx.strokeStyle = 'rgba(200,220,255,0.5)';
		ctx.lineWidth = 1.5;
		ctx.shadowBlur = 4;
		ctx.shadowColor = 'rgba(180,200,255,0.7)';
		ctx.beginPath();
		ctx.moveTo(-shaftW * 1.2, ringY);
		ctx.lineTo(shaftW * 1.2, ringY);
		ctx.stroke();
	}

	// 3. head
	const headShadow = ctx.createRadialGradient(
		0,
		headY + headR * 0.3,
		0,
		0,
		headY + headR * 0.3,
		headR * 1.3
	);
	headShadow.addColorStop(0, 'rgba(60,40,120,0.4)');
	headShadow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = headShadow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(0, headY + headR * 0.3, headR * 1.3, 0, Math.PI * 2);
	ctx.fill();

	const headGrad = ctx.createRadialGradient(-headR * 0.3, headY - headR * 0.3, 0, 0, headY, headR);
	headGrad.addColorStop(0, 'rgba(230,220,255,1)');
	headGrad.addColorStop(0.2, 'rgba(180,160,240,0.98)');
	headGrad.addColorStop(0.5, 'rgba(140,120,220,0.95)');
	headGrad.addColorStop(0.75, 'rgba(100,80,180,0.9)');
	headGrad.addColorStop(1, 'rgba(60,40,120,0.8)');
	ctx.fillStyle = headGrad;
	ctx.shadowBlur = 15;
	ctx.shadowColor = 'rgba(150,120,255,1)';
	ctx.beginPath();
	ctx.arc(0, headY, headR, 0, Math.PI * 2);
	ctx.fill();

	// 4. decorative details
	ctx.strokeStyle = 'rgba(200,220,255,0.6)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(180,200,255,0.8)';
	ctx.beginPath();
	ctx.arc(0, headY, headR * 0.88, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(220,230,255,0.5)';
	ctx.lineWidth = 1.2;
	ctx.shadowBlur = 5;
	ctx.beginPath();
	ctx.arc(0, headY, headR * 0.7, 0, Math.PI * 2);
	ctx.stroke();

	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * Math.PI * 2;
		const x = Math.cos(angle) * headR * 0.78;
		const y = headY + Math.sin(angle) * headR * 0.78;
		const crystalSize = headR * 0.1;
		ctx.fillStyle = 'rgba(200,220,255,0.8)';
		ctx.shadowBlur = 5;
		ctx.shadowColor = 'rgba(180,200,255,0.9)';
		ctx.beginPath();
		ctx.moveTo(x, y - crystalSize * 1.3);
		ctx.lineTo(x + crystalSize * 0.4, y);
		ctx.lineTo(x, y + crystalSize * 1.3);
		ctx.lineTo(x - crystalSize * 0.4, y);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.7)';
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(x - crystalSize * 0.15, y - crystalSize * 0.4, crystalSize * 0.15, 0, Math.PI * 2);
		ctx.fill();
	}

	const holeR = headR * 0.22;
	const holeGrad = ctx.createRadialGradient(0, headY, 0, 0, headY, holeR);
	holeGrad.addColorStop(0, 'rgba(10,5,20,0.95)');
	holeGrad.addColorStop(0.7, 'rgba(30,20,50,0.9)');
	holeGrad.addColorStop(1, 'rgba(60,40,100,0.7)');
	ctx.fillStyle = holeGrad;
	ctx.shadowBlur = 4;
	ctx.shadowColor = 'rgba(0,0,0,0.8)';
	ctx.beginPath();
	ctx.arc(0, headY, holeR, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(200,220,255,0.6)';
	ctx.lineWidth = 1.2;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(180,200,255,0.8)';
	ctx.beginPath();
	ctx.arc(0, headY, holeR, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(220,230,255,0.7)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(200,220,255,0.9)';
	ctx.beginPath();
	ctx.arc(0, headY, headR, 0, Math.PI * 2);
	ctx.stroke();

	// 5. highlights
	const highlight1 = ctx.createRadialGradient(
		-headR * 0.35,
		headY - headR * 0.35,
		0,
		-headR * 0.35,
		headY - headR * 0.35,
		headR * 0.3
	);
	highlight1.addColorStop(0, 'rgba(255,255,255,0.95)');
	highlight1.addColorStop(0.3, 'rgba(240,245,255,0.6)');
	highlight1.addColorStop(0.7, 'rgba(200,220,255,0.2)');
	highlight1.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight1;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(-headR * 0.35, headY - headR * 0.35, headR * 0.3, 0, Math.PI * 2);
	ctx.fill();

	const highlight2 = ctx.createRadialGradient(
		headR * 0.3,
		headY + headR * 0.15,
		0,
		headR * 0.3,
		headY + headR * 0.15,
		headR * 0.12
	);
	highlight2.addColorStop(0, 'rgba(255,255,255,0.6)');
	highlight2.addColorStop(0.5, 'rgba(220,240,255,0.3)');
	highlight2.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight2;
	ctx.beginPath();
	ctx.arc(headR * 0.3, headY + headR * 0.15, headR * 0.12, 0, Math.PI * 2);
	ctx.fill();

	// 6. energy sparkles
	const sparkles = [
		{ x: size * 0.22, y: -size * 0.15, r: 2 },
		{ x: -size * 0.2, y: -size * 0.2, r: 1.5 },
		{ x: size * 0.18, y: size * 0.1, r: 1.8 },
		{ x: -size * 0.22, y: size * 0.15, r: 1.5 },
		{ x: size * 0.05, y: size * 0.28, r: 1.8 },
		{ x: -size * 0.08, y: -size * 0.28, r: 1.5 }
	];
	for (const sp of sparkles) {
		const sparkleGlow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 3);
		sparkleGlow.addColorStop(0, 'rgba(200,220,255,0.8)');
		sparkleGlow.addColorStop(0.5, 'rgba(150,170,255,0.3)');
		sparkleGlow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = sparkleGlow;
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r * 3, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.95)';
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(200,220,255,1)';
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

export const KEY_ART: CollectibleArt = {
	size: 256,
	paint,
	bounds: { x0: -36, y0: -62, x1: 36, y1: 82 },
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
