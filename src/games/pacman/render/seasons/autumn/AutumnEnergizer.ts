import type { EnergizerView } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class AutumnEnergizer implements EnergizerView {
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

		ctx.save();
		ctx.translate(cx, cy);

		ctx.fillStyle = colors.energizer;
		ctx.beginPath();
		ctx.ellipse(0, 0, radius, radius * 0.85, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = 'rgba(60,20,10,.35)';
		ctx.lineWidth = Math.max(1, tileSize * 0.04);

		ctx.beginPath();
		ctx.ellipse(0, 0, radius * 0.55, radius * 0.85, 0, 0, Math.PI * 2);
		ctx.stroke();

		ctx.beginPath();
		ctx.ellipse(0, 0, radius * 0.22, radius * 0.85, 0, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = '#5b7a34';
		ctx.beginPath();
		ctx.ellipse(0, -radius * 0.95, radius * 0.16, radius * 0.3, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,.65)';
		ctx.beginPath();
		ctx.arc(-radius * 0.3, -radius * 0.25, Math.max(1, radius * 0.16), 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}
