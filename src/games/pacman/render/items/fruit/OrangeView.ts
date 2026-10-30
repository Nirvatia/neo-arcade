// Cosmic Orange: the owner's COLLECTIBLE_ORANGE.html, texture code 1:1 without its
// ambient glow (the fruit keeps inside its tile, stage 10.1). The skin pores are random, as in
// the mock-up: placed once when the texture is painted.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	ctx.save();
	ctx.translate(cx, cy);

	// 1. body
	const orangeR = size * 0.22;
	const shadow = ctx.createRadialGradient(0, orangeR * 0.3, 0, 0, orangeR * 0.3, orangeR * 1.2);
	shadow.addColorStop(0, 'rgba(120,60,20,0.4)');
	shadow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = shadow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(0, orangeR * 0.3, orangeR * 1.2, 0, Math.PI * 2);
	ctx.fill();

	const bodyGrad = ctx.createRadialGradient(-orangeR * 0.3, -orangeR * 0.3, 0, 0, 0, orangeR);
	bodyGrad.addColorStop(0, 'rgba(255,240,180,1)');
	bodyGrad.addColorStop(0.2, 'rgba(255,200,120,0.98)');
	bodyGrad.addColorStop(0.5, 'rgba(255,160,60,0.95)');
	bodyGrad.addColorStop(0.75, 'rgba(220,120,40,0.9)');
	bodyGrad.addColorStop(1, 'rgba(160,80,20,0.8)');
	ctx.fillStyle = bodyGrad;
	ctx.shadowBlur = 15;
	ctx.shadowColor = 'rgba(255,160,60,1)';
	ctx.beginPath();
	ctx.arc(0, 0, orangeR, 0, Math.PI * 2);
	ctx.fill();

	const innerGlow = ctx.createRadialGradient(0, 0, orangeR * 0.6, 0, 0, orangeR);
	innerGlow.addColorStop(0, 'rgba(255,180,80,0)');
	innerGlow.addColorStop(0.7, 'rgba(255,140,60,0.2)');
	innerGlow.addColorStop(1, 'rgba(255,120,40,0.4)');
	ctx.fillStyle = innerGlow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(0, 0, orangeR, 0, Math.PI * 2);
	ctx.fill();

	const bottomDark = ctx.createLinearGradient(0, 0, 0, orangeR);
	bottomDark.addColorStop(0, 'rgba(0,0,0,0)');
	bottomDark.addColorStop(0.6, 'rgba(80,40,10,0.15)');
	bottomDark.addColorStop(1, 'rgba(60,30,5,0.35)');
	ctx.fillStyle = bottomDark;
	ctx.beginPath();
	ctx.arc(0, 0, orangeR, 0, Math.PI * 2);
	ctx.fill();

	// 2. segments
	const segmentCount = 8;
	for (let i = 0; i < segmentCount; i++) {
		const angle = (i / segmentCount) * Math.PI * 2;
		const x1 = Math.cos(angle) * orangeR * 0.15;
		const y1 = Math.sin(angle) * orangeR * 0.15;
		const x2 = Math.cos(angle) * orangeR * 0.85;
		const y2 = Math.sin(angle) * orangeR * 0.85;
		const lineGrad = ctx.createLinearGradient(x1, y1, x2, y2);
		lineGrad.addColorStop(0, 'rgba(255,240,200,0.4)');
		lineGrad.addColorStop(0.5, 'rgba(255,200,120,0.25)');
		lineGrad.addColorStop(1, 'rgba(255,160,80,0.1)');
		ctx.strokeStyle = lineGrad;
		ctx.lineWidth = 1.5;
		ctx.shadowBlur = 4;
		ctx.shadowColor = 'rgba(255,200,120,0.6)';
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	// 3. skin pores
	for (let i = 0; i < 40; i++) {
		const angle = Math.random() * Math.PI * 2;
		const dist = orangeR * 0.3 + Math.random() * orangeR * 0.6;
		const x = Math.cos(angle) * dist;
		const y = Math.sin(angle) * dist;
		const dotR = 0.5 + Math.random() * 1;
		ctx.fillStyle = `rgba(255,220,150,${0.2 + Math.random() * 0.3})`;
		ctx.shadowBlur = 2;
		ctx.shadowColor = 'rgba(255,200,120,0.5)';
		ctx.beginPath();
		ctx.arc(x, y, dotR, 0, Math.PI * 2);
		ctx.fill();
	}

	// 4. highlights
	const highlight1 = ctx.createRadialGradient(
		-orangeR * 0.35,
		-orangeR * 0.35,
		0,
		-orangeR * 0.35,
		-orangeR * 0.35,
		orangeR * 0.25
	);
	highlight1.addColorStop(0, 'rgba(255,255,255,0.95)');
	highlight1.addColorStop(0.3, 'rgba(255,250,230,0.6)');
	highlight1.addColorStop(0.7, 'rgba(255,220,180,0.2)');
	highlight1.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight1;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(-orangeR * 0.35, -orangeR * 0.35, orangeR * 0.25, 0, Math.PI * 2);
	ctx.fill();

	const highlight2 = ctx.createRadialGradient(
		orangeR * 0.25,
		orangeR * 0.15,
		0,
		orangeR * 0.25,
		orangeR * 0.15,
		orangeR * 0.1
	);
	highlight2.addColorStop(0, 'rgba(255,230,200,0.5)');
	highlight2.addColorStop(0.5, 'rgba(255,200,150,0.2)');
	highlight2.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight2;
	ctx.beginPath();
	ctx.arc(orangeR * 0.25, orangeR * 0.15, orangeR * 0.1, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(255,200,120,0.5)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(255,180,100,0.7)';
	ctx.beginPath();
	ctx.arc(0, 0, orangeR, 0, Math.PI * 2);
	ctx.stroke();

	// 5. stem and leaf
	const stemGrad = ctx.createLinearGradient(0, -orangeR, 0, -orangeR * 1.3);
	stemGrad.addColorStop(0, 'rgba(100,255,200,0.9)');
	stemGrad.addColorStop(0.5, 'rgba(80,220,180,0.8)');
	stemGrad.addColorStop(1, 'rgba(60,180,150,0.6)');
	ctx.strokeStyle = stemGrad;
	ctx.lineWidth = 3;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(100,255,200,1)';
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(0, -orangeR);
	ctx.lineTo(0, -orangeR * 1.25);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(200,255,230,0.7)';
	ctx.lineWidth = 1.2;
	ctx.shadowBlur = 6;
	ctx.beginPath();
	ctx.moveTo(0, -orangeR);
	ctx.lineTo(0, -orangeR * 1.25);
	ctx.stroke();

	const leafGrad = ctx.createLinearGradient(0, -orangeR * 1.1, orangeR * 0.15, -orangeR * 1.2);
	leafGrad.addColorStop(0, 'rgba(80,220,160,0.95)');
	leafGrad.addColorStop(0.5, 'rgba(100,240,180,0.9)');
	leafGrad.addColorStop(1, 'rgba(120,255,200,0.7)');
	ctx.fillStyle = leafGrad;
	ctx.shadowBlur = 8;
	ctx.shadowColor = 'rgba(100,255,200,0.9)';
	ctx.beginPath();
	ctx.moveTo(0, -orangeR * 1.1);
	ctx.quadraticCurveTo(orangeR * 0.12, -orangeR * 1.25, orangeR * 0.15, -orangeR * 1.15);
	ctx.quadraticCurveTo(orangeR * 0.1, -orangeR * 1.05, 0, -orangeR * 1.1);
	ctx.fill();

	ctx.strokeStyle = 'rgba(200,255,230,0.8)';
	ctx.lineWidth = 0.8;
	ctx.shadowBlur = 4;
	ctx.beginPath();
	ctx.moveTo(0, -orangeR * 1.1);
	ctx.lineTo(orangeR * 0.1, -orangeR * 1.18);
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
		sparkleGlow.addColorStop(0, 'rgba(255,220,150,0.8)');
		sparkleGlow.addColorStop(0.5, 'rgba(255,180,100,0.3)');
		sparkleGlow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = sparkleGlow;
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r * 3, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.95)';
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(255,220,150,1)';
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

export const ORANGE_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
