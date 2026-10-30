// The Easter egg, the lair code's reward (stage 10.2, the painting kit in
// `render/common/itemPaint`): a classic painted egg, bands of pink, lilac, mint and blue
// with a zigzag, dots and a little flower (strong colours: a pale egg washed out to white),
// outlined in deep plum. It rocks gently on its base; drawn in the lair's centre once the
// gate is open.
import type { EasterEggService } from '../../logic/bonuses/EasterEggService';
import type { GridLayout } from '../maze/GridView';
import type { CollectibleArt, CollectibleMotion } from './collectibleSprite';
import { drawCollectible, FRUIT_BLOOMS } from './collectibleSprite';
import { beginItem, gloss, outline, sparkle } from '../common/itemPaint';

const OUTLINE = 'rgba(60,20,70,0.95)';
const RX = 60;
const RY = 80;
const CY = 4;

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);

	// a true egg: narrower at the top
	const egg = () => {
		ctx.beginPath();
		ctx.moveTo(0, CY - RY);
		ctx.bezierCurveTo(RX * 0.72, CY - RY, RX, CY - RY * 0.1, RX, CY + RY * 0.25);
		ctx.bezierCurveTo(RX, CY + RY * 0.75, RX * 0.55, CY + RY, 0, CY + RY);
		ctx.bezierCurveTo(-RX * 0.55, CY + RY, -RX, CY + RY * 0.75, -RX, CY + RY * 0.25);
		ctx.bezierCurveTo(-RX, CY - RY * 0.1, -RX * 0.72, CY - RY, 0, CY - RY);
		ctx.closePath();
	};
	const band = (y0: number, y1: number, color: string) => {
		ctx.fillStyle = color;
		ctx.fillRect(-RX - 4, CY + y0, RX * 2 + 8, y1 - y0);
	};

	// 1. outline
	outline(ctx, [egg], OUTLINE);

	// 2. shell: cream, light from the upper left
	const shell = ctx.createRadialGradient(-22, CY - 30, 6, 0, CY, RY);
	shell.addColorStop(0, 'rgba(255,246,220,1)');
	shell.addColorStop(0.6, 'rgba(255,226,170,1)');
	shell.addColorStop(1, 'rgba(220,170,120,1)');
	ctx.fillStyle = shell;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(255,160,220,0.8)';
	egg();
	ctx.fill();
	ctx.shadowBlur = 0;

	// 3. painted bands, clipped to the shell
	ctx.save();
	egg();
	ctx.clip();
	// pink cap
	band(-RY, -44, 'rgba(240,90,160,1)');
	// lilac band with white dots
	band(-30, -8, 'rgba(140,100,230,1)');
	ctx.fillStyle = 'rgba(255,255,255,0.95)';
	for (let x = -48; x <= 48; x += 16) {
		ctx.beginPath();
		ctx.arc(x, CY - 20, 4, 0, Math.PI * 2);
		ctx.fill();
	}
	// mint zigzag band
	ctx.fillStyle = 'rgba(30,185,140,1)';
	ctx.beginPath();
	ctx.moveTo(-RX - 4, CY + 4);
	for (let i = 0; i <= 10; i++) {
		ctx.lineTo(-RX + i * 12, CY + (i % 2 === 0 ? 4 : 20));
	}
	ctx.lineTo(RX + 4, CY + 44);
	for (let i = 10; i >= 0; i--) {
		ctx.lineTo(-RX + i * 12, CY + (i % 2 === 0 ? 30 : 46));
	}
	ctx.closePath();
	ctx.fill();
	// sky-blue base
	band(56, RY + 4, 'rgba(60,140,240,1)');
	// shade the shell's far side
	const shade = ctx.createLinearGradient(-RX, 0, RX, 0);
	shade.addColorStop(0.5, 'rgba(0,0,0,0)');
	shade.addColorStop(1, 'rgba(90,40,90,0.28)');
	ctx.fillStyle = shade;
	ctx.fillRect(-RX - 4, CY - RY - 4, RX * 2 + 8, RY * 2 + 8);
	ctx.restore();

	// 4. a little flower on the cap
	ctx.fillStyle = 'rgba(255,240,120,1)';
	for (let k = 0; k < 5; k++) {
		const a = (k * Math.PI * 2) / 5 - Math.PI / 2;
		ctx.beginPath();
		ctx.arc(Math.cos(a) * 7, CY - 62 + Math.sin(a) * 7, 5, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.fillStyle = 'rgba(255,140,60,1)';
	ctx.beginPath();
	ctx.arc(0, CY - 62, 4, 0, Math.PI * 2);
	ctx.fill();

	// 5. highlights
	gloss(ctx, -26, CY - 36, 12, 22, 0.35);
	sparkle(ctx, 40, CY - 40, 3, 'rgba(255,220,250,1)');

	ctx.restore();
}

/** Rocking on its base, a slow breath, the glow pulsing. */
function eggMotion(time: number): CollectibleMotion {
	return {
		scale: 1 + Math.sin(time * 2) * 0.03,
		rotation: Math.sin(time * 2.4) * 0.12,
		alpha: 1,
		bloomAlpha: [0.22 + Math.sin(time * 3) * 0.06, 0.1 + Math.sin(time * 2) * 0.03]
	};
}

export const EASTER_EGG_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS,
	motion: eggMotion
};

/** One Easter egg centred at (x, y) on a tile of `tileSize` px. */
export function drawEasterEgg(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	tileSize: number,
	time: number
): void {
	drawCollectible(ctx, EASTER_EGG_ART, x, y, tileSize, time);
}

export class EasterEggView {
	draw(
		ctx: CanvasRenderingContext2D,
		egg: EasterEggService,
		layout: GridLayout,
		time: number
	): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('EasterEggView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		if (egg.phase !== 'egg') {
			return;
		}
		const position = egg.eggPosition;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('EasterEggView.draw', 'invalid egg position', position);
			return;
		}
		drawEasterEgg(
			ctx,
			layout.offsetX + position.x * layout.tileSize,
			layout.offsetY + position.y * layout.tileSize,
			layout.tileSize,
			time
		);
	}
}
