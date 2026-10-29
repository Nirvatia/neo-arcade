import type { EnergizerView } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class SummerEnergizer implements EnergizerView {
	draw(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		tileSize: number,
		colors: MazeColors,
		time: number,
		tx: number,
		ty: number
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		const safeTime = Number.isFinite(time) && time >= 0 ? time : 0;
		const hash = tileHash(tx, ty, 17);
		const pulse = 1 + Math.sin(safeTime * 4 + hash * 6) * 0.08;
		const radius = Math.max(3, tileSize * 0.4) * pulse;

		ctx.globalAlpha = 0.28;
		ctx.fillStyle = colors.energizer;
		ctx.beginPath();
		ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;

		for (let i = 0; i < 8; i += 1) {
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(i * (Math.PI / 4) + safeTime * 0.8);
			ctx.fillStyle = colors.energizer;
			ctx.fillRect(-radius * 0.08, -radius * 1.1, radius * 0.16, radius * 0.45);
			ctx.restore();
		}

		ctx.fillStyle = colors.energizer;
		ctx.beginPath();
		ctx.arc(cx, cy, Math.max(1, radius * 0.4), 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,.7)';
		ctx.beginPath();
		ctx.arc(cx - radius * 0.12, cy - radius * 0.12, Math.max(1, radius * 0.12), 0, Math.PI * 2);
		ctx.fill();
	}
}