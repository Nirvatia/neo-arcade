// The boss-level exit: a glowing doorway with an arrow, drawn in the collectibles' style
// (texture + bloom, see collectibleSprite). A stand-in until the owner's exit icon arrives.
import type { CollectibleArt } from './collectibleSprite';
import { drawCollectible, FRUIT_BLOOMS } from './collectibleSprite';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;

	const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
	glow.addColorStop(0, 'rgba(150,230,255,0.35)');
	glow.addColorStop(0.5, 'rgba(80,160,220,0.15)');
	glow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, size, size);

	ctx.save();
	ctx.translate(cx, cy);
	const w = size * 0.2;
	const h = size * 0.3;
	const door = () => {
		ctx.beginPath();
		ctx.moveTo(-w, h);
		ctx.lineTo(-w, -h + w);
		ctx.arc(0, -h + w, w, Math.PI, 0);
		ctx.lineTo(w, h);
		ctx.closePath();
	};

	// the opening: light pouring out from the far side
	const inside = ctx.createLinearGradient(0, -h, 0, h);
	inside.addColorStop(0, 'rgba(255,255,255,0.95)');
	inside.addColorStop(0.5, 'rgba(170,235,255,0.85)');
	inside.addColorStop(1, 'rgba(60,140,210,0.7)');
	ctx.fillStyle = inside;
	ctx.shadowBlur = 18;
	ctx.shadowColor = 'rgba(140,220,255,1)';
	door();
	ctx.fill();

	ctx.strokeStyle = 'rgba(220,245,255,0.9)';
	ctx.lineWidth = 6;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(160,230,255,1)';
	door();
	ctx.stroke();

	// threshold
	ctx.strokeStyle = 'rgba(255,255,255,0.9)';
	ctx.lineWidth = 4;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(-w * 1.35, h);
	ctx.lineTo(w * 1.35, h);
	ctx.stroke();

	// arrow up through the door
	ctx.strokeStyle = 'rgba(30,90,150,0.9)';
	ctx.lineWidth = 7;
	ctx.lineJoin = 'round';
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.moveTo(0, h * 0.6);
	ctx.lineTo(0, -h * 0.35);
	ctx.moveTo(-w * 0.5, -h * 0.05);
	ctx.lineTo(0, -h * 0.4);
	ctx.lineTo(w * 0.5, -h * 0.05);
	ctx.stroke();
	ctx.restore();
}

export const EXIT_ART: CollectibleArt = {
	size: 256,
	paint,
	bounds: { x0: -69, y0: -77, x1: 69, y1: 79 },
	sprite: 240,
	blooms: FRUIT_BLOOMS
};

export function drawExit(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	extent: number,
	time: number
): void {
	drawCollectible(ctx, EXIT_ART, x, y, extent, {
		scale: 1 + Math.sin(time * 2.2) * 0.04,
		rotation: 0,
		alpha: 1,
		bloomAlpha: [0.45 + Math.sin(time * 3) * 0.1, 0.25 + Math.sin(time * 2) * 0.05]
	});
}
