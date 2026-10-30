// Cosmic Cherry: the owner's COLLECTIBLE_CHERRY.html, texture code 1:1 without its
// ambient glow (the fruit keeps inside its tile, stage 10.1).
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	ctx.save();
	ctx.translate(cx, cy);

	// 1. stems
	const stemGrad1 = ctx.createLinearGradient(0, -size * 0.3, size * 0.1, size * 0.05);
	stemGrad1.addColorStop(0, 'rgba(100,255,200,0.9)');
	stemGrad1.addColorStop(0.5, 'rgba(80,220,180,0.8)');
	stemGrad1.addColorStop(1, 'rgba(60,180,150,0.6)');
	ctx.strokeStyle = stemGrad1;
	ctx.lineWidth = 3.5;
	ctx.shadowBlur = 12;
	ctx.shadowColor = 'rgba(100,255,200,1)';
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(0, -size * 0.3);
	ctx.quadraticCurveTo(size * 0.08, -size * 0.15, size * 0.1, size * 0.05);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(200,255,230,0.7)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 8;
	ctx.beginPath();
	ctx.moveTo(0, -size * 0.3);
	ctx.quadraticCurveTo(size * 0.08, -size * 0.15, size * 0.1, size * 0.05);
	ctx.stroke();

	const stemGrad2 = ctx.createLinearGradient(0, -size * 0.3, -size * 0.12, size * 0.1);
	stemGrad2.addColorStop(0, 'rgba(100,255,200,0.9)');
	stemGrad2.addColorStop(0.5, 'rgba(80,220,180,0.8)');
	stemGrad2.addColorStop(1, 'rgba(60,180,150,0.6)');
	ctx.strokeStyle = stemGrad2;
	ctx.lineWidth = 3.5;
	ctx.shadowBlur = 12;
	ctx.shadowColor = 'rgba(100,255,200,1)';
	ctx.beginPath();
	ctx.moveTo(0, -size * 0.3);
	ctx.quadraticCurveTo(-size * 0.1, -size * 0.1, -size * 0.12, size * 0.1);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(200,255,230,0.7)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 8;
	ctx.beginPath();
	ctx.moveTo(0, -size * 0.3);
	ctx.quadraticCurveTo(-size * 0.1, -size * 0.1, -size * 0.12, size * 0.1);
	ctx.stroke();

	// 2. leaf
	const leafGrad = ctx.createLinearGradient(0, -size * 0.3, size * 0.12, -size * 0.2);
	leafGrad.addColorStop(0, 'rgba(120,255,200,0.9)');
	leafGrad.addColorStop(0.5, 'rgba(80,220,160,0.8)');
	leafGrad.addColorStop(1, 'rgba(60,180,140,0.6)');
	ctx.fillStyle = leafGrad;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(100,255,200,0.9)';
	ctx.beginPath();
	ctx.moveTo(0, -size * 0.3);
	ctx.quadraticCurveTo(size * 0.1, -size * 0.35, size * 0.12, -size * 0.25);
	ctx.quadraticCurveTo(size * 0.08, -size * 0.2, 0, -size * 0.3);
	ctx.fill();

	ctx.strokeStyle = 'rgba(200,255,230,0.8)';
	ctx.lineWidth = 1;
	ctx.shadowBlur = 6;
	ctx.beginPath();
	ctx.moveTo(0, -size * 0.3);
	ctx.lineTo(size * 0.08, -size * 0.28);
	ctx.stroke();

	// 3. right cherry (front, larger)
	const rx = size * 0.1;
	const ry = size * 0.08;
	const rr = size * 0.13;

	const rightShadow = ctx.createRadialGradient(rx, ry + rr * 0.3, 0, rx, ry + rr * 0.3, rr * 1.2);
	rightShadow.addColorStop(0, 'rgba(100,20,50,0.4)');
	rightShadow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = rightShadow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(rx, ry + rr * 0.3, rr * 1.2, 0, Math.PI * 2);
	ctx.fill();

	const rightBodyGrad = ctx.createRadialGradient(rx - rr * 0.3, ry - rr * 0.3, 0, rx, ry, rr);
	rightBodyGrad.addColorStop(0, 'rgba(255,180,200,1)');
	rightBodyGrad.addColorStop(0.3, 'rgba(255,120,160,0.95)');
	rightBodyGrad.addColorStop(0.6, 'rgba(220,60,100,0.9)');
	rightBodyGrad.addColorStop(0.85, 'rgba(160,30,70,0.85)');
	rightBodyGrad.addColorStop(1, 'rgba(100,20,50,0.7)');
	ctx.fillStyle = rightBodyGrad;
	ctx.shadowBlur = 15;
	ctx.shadowColor = 'rgba(255,100,150,1)';
	ctx.beginPath();
	ctx.arc(rx, ry, rr, 0, Math.PI * 2);
	ctx.fill();

	const rightInnerGlow = ctx.createRadialGradient(rx, ry, rr * 0.5, rx, ry, rr);
	rightInnerGlow.addColorStop(0, 'rgba(255,150,180,0)');
	rightInnerGlow.addColorStop(0.7, 'rgba(255,120,160,0.3)');
	rightInnerGlow.addColorStop(1, 'rgba(255,100,150,0.5)');
	ctx.fillStyle = rightInnerGlow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(rx, ry, rr, 0, Math.PI * 2);
	ctx.fill();

	const rightHighlight1 = ctx.createRadialGradient(
		rx - rr * 0.35,
		ry - rr * 0.35,
		0,
		rx - rr * 0.35,
		ry - rr * 0.35,
		rr * 0.3
	);
	rightHighlight1.addColorStop(0, 'rgba(255,255,255,0.95)');
	rightHighlight1.addColorStop(0.3, 'rgba(255,240,250,0.6)');
	rightHighlight1.addColorStop(0.7, 'rgba(255,200,220,0.2)');
	rightHighlight1.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = rightHighlight1;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(rx - rr * 0.35, ry - rr * 0.35, rr * 0.3, 0, Math.PI * 2);
	ctx.fill();

	const rightHighlight2 = ctx.createRadialGradient(
		rx + rr * 0.3,
		ry + rr * 0.2,
		0,
		rx + rr * 0.3,
		ry + rr * 0.2,
		rr * 0.15
	);
	rightHighlight2.addColorStop(0, 'rgba(255,200,220,0.5)');
	rightHighlight2.addColorStop(0.5, 'rgba(255,150,180,0.2)');
	rightHighlight2.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = rightHighlight2;
	ctx.beginPath();
	ctx.arc(rx + rr * 0.3, ry + rr * 0.2, rr * 0.15, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(255,180,200,0.6)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(255,150,180,0.8)';
	ctx.beginPath();
	ctx.arc(rx, ry, rr, 0, Math.PI * 2);
	ctx.stroke();

	// 4. left cherry (behind, smaller, darker)
	const lx = -size * 0.12;
	const ly = size * 0.12;
	const lr = size * 0.11;

	const leftShadow = ctx.createRadialGradient(lx, ly + lr * 0.3, 0, lx, ly + lr * 0.3, lr * 1.2);
	leftShadow.addColorStop(0, 'rgba(80,15,40,0.4)');
	leftShadow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = leftShadow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(lx, ly + lr * 0.3, lr * 1.2, 0, Math.PI * 2);
	ctx.fill();

	const leftBodyGrad = ctx.createRadialGradient(lx - lr * 0.3, ly - lr * 0.3, 0, lx, ly, lr);
	leftBodyGrad.addColorStop(0, 'rgba(240,160,180,0.95)');
	leftBodyGrad.addColorStop(0.3, 'rgba(230,100,140,0.9)');
	leftBodyGrad.addColorStop(0.6, 'rgba(200,50,90,0.85)');
	leftBodyGrad.addColorStop(0.85, 'rgba(140,25,60,0.8)');
	leftBodyGrad.addColorStop(1, 'rgba(90,15,40,0.65)');
	ctx.fillStyle = leftBodyGrad;
	ctx.shadowBlur = 12;
	ctx.shadowColor = 'rgba(230,80,130,0.9)';
	ctx.beginPath();
	ctx.arc(lx, ly, lr, 0, Math.PI * 2);
	ctx.fill();

	const leftInnerGlow = ctx.createRadialGradient(lx, ly, lr * 0.5, lx, ly, lr);
	leftInnerGlow.addColorStop(0, 'rgba(240,130,160,0)');
	leftInnerGlow.addColorStop(0.7, 'rgba(230,100,140,0.25)');
	leftInnerGlow.addColorStop(1, 'rgba(230,80,130,0.4)');
	ctx.fillStyle = leftInnerGlow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(lx, ly, lr, 0, Math.PI * 2);
	ctx.fill();

	const leftHighlight1 = ctx.createRadialGradient(
		lx - lr * 0.3,
		ly - lr * 0.3,
		0,
		lx - lr * 0.3,
		ly - lr * 0.3,
		lr * 0.25
	);
	leftHighlight1.addColorStop(0, 'rgba(255,255,255,0.85)');
	leftHighlight1.addColorStop(0.3, 'rgba(255,230,240,0.5)');
	leftHighlight1.addColorStop(0.7, 'rgba(255,180,200,0.15)');
	leftHighlight1.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = leftHighlight1;
	ctx.beginPath();
	ctx.arc(lx - lr * 0.3, ly - lr * 0.3, lr * 0.25, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(240,160,180,0.5)';
	ctx.lineWidth = 1.2;
	ctx.shadowBlur = 5;
	ctx.shadowColor = 'rgba(230,130,160,0.7)';
	ctx.beginPath();
	ctx.arc(lx, ly, lr, 0, Math.PI * 2);
	ctx.stroke();

	// 5. energy sparkles
	const sparkles = [
		{ x: size * 0.2, y: -size * 0.1, r: 2 },
		{ x: -size * 0.22, y: -size * 0.05, r: 1.5 },
		{ x: size * 0.15, y: size * 0.2, r: 1.8 },
		{ x: -size * 0.18, y: size * 0.22, r: 1.5 },
		{ x: 0, y: size * 0.25, r: 2 }
	];
	for (const sp of sparkles) {
		const sparkleGlow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 3);
		sparkleGlow.addColorStop(0, 'rgba(255,200,220,0.8)');
		sparkleGlow.addColorStop(0.5, 'rgba(255,150,180,0.3)');
		sparkleGlow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = sparkleGlow;
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r * 3, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.95)';
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(255,200,220,1)';
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

export const CHERRY_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
