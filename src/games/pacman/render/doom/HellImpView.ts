import type { DoomDirection } from '../../logic/doom/DoomGraph';
import type { DoomMinionKind } from '../../logic/doom/DoomMinions';
import type { EyeStyle, GhostShape } from './hellGhost';
import { dirAngle, drawEyes, drawHeading, drawHorns, ghostPath, glow } from './hellGhost';

interface ImpSkin {
	readonly top: string;
	readonly mid: string;
	readonly low: string;
	/** Glow and heading chevron (rgb). */
	readonly tint: string;
}

/** Blinky's brood keeps the arcade colours of the three ghosts that chase like them. */
const IMP_SKINS: Record<DoomMinionKind, ImpSkin> = {
	pinky: { top: '#ffa8dc', mid: '#d8308a', low: '#3a0420', tint: '255,120,200' },
	inky: { top: '#a8f4ff', mid: '#1aa0c8', low: '#041a30', tint: '90,230,255' },
	clyde: { top: '#ffd08a', mid: '#e0701a', low: '#3a1404', tint: '255,170,70' }
};

const IMP_EYES: EyeStyle = { sclera: '#ffe27a', pupil: '#1a0000', glow: null, brows: true };

/**
 * A minion: a small horned ghost in Pinky, Inky or Clyde colours, its eyes and the
 * chevron on the tile edge pointing where it runs. (x, y) is the tile centre in pixels.
 */
export function drawImp(
	ctx: CanvasRenderingContext2D,
	kind: DoomMinionKind,
	x: number,
	y: number,
	tileSize: number,
	facing: DoomDirection | null,
	time: number,
	alpha: number
): void {
	if (alpha <= 0.01 || !(tileSize > 0)) {
		return;
	}
	const skin = IMP_SKINS[kind];
	const R = tileSize * 0.5 * 0.66;
	const seed = kind.length * 1.7;
	const bob = Math.sin(time * 6 + seed) * R * 0.05;
	const shape: GhostShape = {
		w: R * 0.72,
		domeY: -R * 0.1 + bob,
		hem: R * 0.72 + bob,
		feet: 3,
		torn: 0.6,
		seed
	};
	const heading = dirAngle(facing);
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.globalCompositeOperation = 'lighter';
	glow(ctx, x, y, R * 1.2, skin.tint, 0.28);
	ctx.globalCompositeOperation = 'source-over';
	ctx.translate(x, y);
	drawHorns(
		ctx,
		0,
		0,
		shape,
		0.6,
		{
			length: 0.45,
			thick: 0.22,
			dark: '#1a0404',
			light: '#e8d8bc',
			ember: null,
			curl: 0.1
		},
		0
	);
	ghostPath(ctx, 0, 0, shape, time * 1.3 + seed);
	const fill = ctx.createLinearGradient(0, shape.domeY - shape.w, 0, shape.hem);
	fill.addColorStop(0, skin.top);
	fill.addColorStop(0.5, skin.mid);
	fill.addColorStop(1, skin.low);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = 'rgba(15,0,0,.8)';
	ctx.lineWidth = Math.max(1, shape.w * 0.09);
	ctx.stroke();
	drawEyes(ctx, 0, shape.domeY + shape.w * 0.4, shape.w, heading, IMP_EYES, 1, false, time);
	ctx.restore();
	if (facing) {
		ctx.save();
		ctx.globalAlpha = alpha;
		drawHeading(ctx, x, y, tileSize, heading, skin.tint, 0.85);
		ctx.restore();
	}
}
