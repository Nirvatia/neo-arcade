// Cosmic Strawberry: the owner's COLLECTIBLE_STRAWBERRY.html, texture code 1:1 without its
// ambient glow (the fruit keeps inside its tile, stage 10.1).
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	ctx.save();
	ctx.translate(cx, cy);

	// 1. berry body
	const shadow = ctx.createRadialGradient(0, size * 0.2, 0, 0, size * 0.2, size * 0.25);
	shadow.addColorStop(0, 'rgba(80,10,30,0.4)');
	shadow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = shadow;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(0, size * 0.2, size * 0.25, 0, Math.PI * 2);
	ctx.fill();

	const berryShape = () => {
		ctx.beginPath();
		ctx.moveTo(0, -size * 0.18);
		// right side
		ctx.bezierCurveTo(
			size * 0.22,
			-size * 0.22,
			size * 0.28,
			-size * 0.05,
			size * 0.22,
			size * 0.08
		);
		ctx.bezierCurveTo(size * 0.18, size * 0.18, size * 0.08, size * 0.25, 0, size * 0.28);
		// left side
		ctx.bezierCurveTo(
			-size * 0.08,
			size * 0.25,
			-size * 0.18,
			size * 0.18,
			-size * 0.22,
			size * 0.08
		);
		ctx.bezierCurveTo(-size * 0.28, -size * 0.05, -size * 0.22, -size * 0.22, 0, -size * 0.18);
		ctx.closePath();
	};

	const bodyGrad = ctx.createRadialGradient(
		-size * 0.08,
		-size * 0.08,
		0,
		0,
		size * 0.05,
		size * 0.3
	);
	bodyGrad.addColorStop(0, 'rgba(255,160,180,1)');
	bodyGrad.addColorStop(0.25, 'rgba(255,100,140,0.98)');
	bodyGrad.addColorStop(0.5, 'rgba(230,50,90,0.95)');
	bodyGrad.addColorStop(0.75, 'rgba(180,30,60,0.9)');
	bodyGrad.addColorStop(1, 'rgba(120,15,40,0.8)');
	ctx.fillStyle = bodyGrad;
	ctx.shadowBlur = 15;
	ctx.shadowColor = 'rgba(255,80,120,1)';
	berryShape();
	ctx.fill();

	const innerGlow = ctx.createRadialGradient(0, 0, size * 0.1, 0, size * 0.05, size * 0.3);
	innerGlow.addColorStop(0, 'rgba(255,120,160,0)');
	innerGlow.addColorStop(0.7, 'rgba(255,80,120,0.25)');
	innerGlow.addColorStop(1, 'rgba(255,60,100,0.45)');
	ctx.fillStyle = innerGlow;
	ctx.shadowBlur = 0;
	berryShape();
	ctx.fill();

	const bottomDark = ctx.createLinearGradient(0, 0, 0, size * 0.28);
	bottomDark.addColorStop(0, 'rgba(0,0,0,0)');
	bottomDark.addColorStop(0.6, 'rgba(60,10,30,0.15)');
	bottomDark.addColorStop(1, 'rgba(40,5,20,0.4)');
	ctx.fillStyle = bottomDark;
	berryShape();
	ctx.fill();

	const highlight1 = ctx.createRadialGradient(
		-size * 0.1,
		-size * 0.1,
		0,
		-size * 0.1,
		-size * 0.1,
		size * 0.12
	);
	highlight1.addColorStop(0, 'rgba(255,255,255,0.95)');
	highlight1.addColorStop(0.3, 'rgba(255,230,240,0.6)');
	highlight1.addColorStop(0.7, 'rgba(255,180,200,0.2)');
	highlight1.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight1;
	ctx.beginPath();
	ctx.arc(-size * 0.1, -size * 0.1, size * 0.12, 0, Math.PI * 2);
	ctx.fill();

	const highlight2 = ctx.createRadialGradient(
		size * 0.12,
		size * 0.1,
		0,
		size * 0.12,
		size * 0.1,
		size * 0.05
	);
	highlight2.addColorStop(0, 'rgba(255,200,220,0.5)');
	highlight2.addColorStop(0.5, 'rgba(255,150,180,0.2)');
	highlight2.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = highlight2;
	ctx.beginPath();
	ctx.arc(size * 0.12, size * 0.1, size * 0.05, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(255,160,180,0.6)';
	ctx.lineWidth = 1.5;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(255,120,150,0.8)';
	berryShape();
	ctx.stroke();

	// 2. seeds (golden energy points)
	const seeds = [
		{ x: -size * 0.12, y: -size * 0.02, r: 2.2 },
		{ x: size * 0.12, y: -size * 0.02, r: 2.2 },
		{ x: -size * 0.15, y: size * 0.1, r: 2 },
		{ x: size * 0.15, y: size * 0.1, r: 2 },
		{ x: -size * 0.08, y: size * 0.18, r: 1.8 },
		{ x: size * 0.08, y: size * 0.18, r: 1.8 },
		{ x: 0, y: size * 0.08, r: 2.2 },
		{ x: 0, y: size * 0.22, r: 1.5 }
	];
	for (const seed of seeds) {
		const seedGlow = ctx.createRadialGradient(seed.x, seed.y, 0, seed.x, seed.y, seed.r * 2.5);
		seedGlow.addColorStop(0, 'rgba(255,220,100,0.6)');
		seedGlow.addColorStop(0.5, 'rgba(255,180,60,0.25)');
		seedGlow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = seedGlow;
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(seed.x, seed.y, seed.r * 2.5, 0, Math.PI * 2);
		ctx.fill();

		const seedGrad = ctx.createRadialGradient(
			seed.x,
			seed.y - seed.r * 0.3,
			0,
			seed.x,
			seed.y,
			seed.r
		);
		seedGrad.addColorStop(0, 'rgba(255,255,200,1)');
		seedGrad.addColorStop(0.5, 'rgba(255,200,80,0.95)');
		seedGrad.addColorStop(1, 'rgba(220,150,40,0.8)');
		ctx.fillStyle = seedGrad;
		ctx.shadowBlur = 4;
		ctx.shadowColor = 'rgba(255,200,80,0.9)';
		ctx.beginPath();
		ctx.ellipse(seed.x, seed.y, seed.r * 0.7, seed.r, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.9)';
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(seed.x, seed.y - seed.r * 0.3, seed.r * 0.3, 0, Math.PI * 2);
		ctx.fill();
	}

	// 3. calyx
	const leafCount = 5;
	const leafAngles = [
		-Math.PI / 2 - 0.6,
		-Math.PI / 2 - 0.3,
		-Math.PI / 2,
		-Math.PI / 2 + 0.3,
		-Math.PI / 2 + 0.6
	];
	for (let i = 0; i < leafCount; i++) {
		const angle = leafAngles[i];
		const leafLength = size * 0.12 + (i % 2 === 0 ? size * 0.02 : 0);
		const leafWidth = size * 0.04;
		ctx.save();
		ctx.translate(0, -size * 0.18);
		ctx.rotate(angle + Math.PI / 2);
		const leafGrad = ctx.createLinearGradient(0, 0, 0, -leafLength);
		leafGrad.addColorStop(0, 'rgba(80,220,160,0.95)');
		leafGrad.addColorStop(0.5, 'rgba(100,240,180,0.9)');
		leafGrad.addColorStop(1, 'rgba(120,255,200,0.7)');
		ctx.fillStyle = leafGrad;
		ctx.shadowBlur = 8;
		ctx.shadowColor = 'rgba(100,255,200,0.9)';
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.quadraticCurveTo(-leafWidth, -leafLength * 0.5, 0, -leafLength);
		ctx.quadraticCurveTo(leafWidth, -leafLength * 0.5, 0, 0);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = 'rgba(200,255,230,0.7)';
		ctx.lineWidth = 0.8;
		ctx.shadowBlur = 4;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(0, -leafLength * 0.9);
		ctx.stroke();
		ctx.restore();
	}

	const nodeGrad = ctx.createRadialGradient(0, -size * 0.18, 0, 0, -size * 0.18, size * 0.04);
	nodeGrad.addColorStop(0, 'rgba(200,255,230,0.9)');
	nodeGrad.addColorStop(0.5, 'rgba(120,240,180,0.7)');
	nodeGrad.addColorStop(1, 'rgba(80,200,150,0.4)');
	ctx.fillStyle = nodeGrad;
	ctx.shadowBlur = 6;
	ctx.shadowColor = 'rgba(100,255,200,0.8)';
	ctx.beginPath();
	ctx.arc(0, -size * 0.18, size * 0.04, 0, Math.PI * 2);
	ctx.fill();

	// 4. energy sparkles
	const sparkles = [
		{ x: size * 0.25, y: -size * 0.1, r: 2 },
		{ x: -size * 0.26, y: -size * 0.05, r: 1.5 },
		{ x: size * 0.22, y: size * 0.18, r: 1.8 },
		{ x: -size * 0.24, y: size * 0.2, r: 1.5 },
		{ x: size * 0.1, y: size * 0.32, r: 1.8 },
		{ x: -size * 0.1, y: -size * 0.28, r: 1.5 }
	];
	for (const sp of sparkles) {
		const sparkleGlow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 3);
		sparkleGlow.addColorStop(0, 'rgba(255,180,200,0.8)');
		sparkleGlow.addColorStop(0.5, 'rgba(255,120,160,0.3)');
		sparkleGlow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = sparkleGlow;
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r * 3, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.95)';
		ctx.shadowBlur = 6;
		ctx.shadowColor = 'rgba(255,180,200,1)';
		ctx.beginPath();
		ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

export const STRAWBERRY_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
