// The boss-level exit, redrawn for the tile (stage 10.1, the painting kit in
// `render/common/itemPaint`): an arched doorway with a stone-blue frame, light pouring out
// of it and a bold arrow up, outlined in deep navy. A stand-in until the owner's exit icon
// arrives.
import type { CollectibleArt, CollectibleMotion } from './collectibleSprite';
import { drawCollectible, FRUIT_BLOOMS } from './collectibleSprite';
import { beginItem, outline, sparkle } from '../common/itemPaint';

const OUTLINE = 'rgba(8,20,60,0.95)';
/** The opening's half width and half height, design units. */
const W = 44;
const H = 72;

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);

	const door = (grow: number) => () => {
		ctx.beginPath();
		ctx.moveTo(-W - grow, H);
		ctx.lineTo(-W - grow, -H + W);
		ctx.arc(0, -H + W, W + grow, Math.PI, 0);
		ctx.lineTo(W + grow, H);
		ctx.closePath();
	};
	const frame = door(14);
	const opening = door(0);
	const step = () => {
		ctx.beginPath();
		ctx.roundRect(-W - 24, H - 4, (W + 24) * 2, 16, 5);
	};
	const arrow = () => {
		ctx.beginPath();
		ctx.moveTo(0, H - 18);
		ctx.lineTo(0, -H + 26);
		ctx.moveTo(-26, -H + 50);
		ctx.lineTo(0, -H + 24);
		ctx.lineTo(26, -H + 50);
	};

	// 1. outline
	outline(ctx, [frame, step], OUTLINE);

	// 2. frame and step
	const stone = ctx.createLinearGradient(-W - 14, 0, W + 14, 0);
	stone.addColorStop(0, 'rgba(170,200,240,1)');
	stone.addColorStop(1, 'rgba(70,100,170,1)');
	ctx.fillStyle = stone;
	frame();
	ctx.fill();
	step();
	ctx.fill();

	// 3. the opening: light pouring out from the far side
	const light = ctx.createLinearGradient(0, -H, 0, H);
	light.addColorStop(0, 'rgba(255,255,255,1)');
	light.addColorStop(0.5, 'rgba(180,240,255,1)');
	light.addColorStop(1, 'rgba(90,190,250,1)');
	ctx.fillStyle = light;
	ctx.shadowBlur = 12;
	ctx.shadowColor = 'rgba(160,230,255,1)';
	opening();
	ctx.fill();
	ctx.shadowBlur = 0;
	ctx.strokeStyle = OUTLINE;
	ctx.lineWidth = 5;
	opening();
	ctx.stroke();

	// 4. arrow up through the door
	ctx.strokeStyle = 'rgba(20,70,150,1)';
	ctx.lineWidth = 16;
	arrow();
	ctx.stroke();

	sparkle(ctx, W + 4, -H + 4, 3, 'rgba(200,240,255,1)');

	ctx.restore();
}

/** A steady doorway: it breathes and its light pulses, it does not sway. */
function exitMotion(time: number): CollectibleMotion {
	return {
		scale: 1 + Math.sin(time * 2.2) * 0.04,
		rotation: 0,
		alpha: 1,
		bloomAlpha: [0.45 + Math.sin(time * 3) * 0.1, 0.25 + Math.sin(time * 2) * 0.05]
	};
}

export const EXIT_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS,
	motion: exitMotion
};

export function drawExit(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	tile: number,
	time: number
): void {
	drawCollectible(ctx, EXIT_ART, x, y, tile, time);
}
