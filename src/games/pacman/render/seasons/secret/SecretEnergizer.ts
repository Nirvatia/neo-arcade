import type { EnergizerView } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class SecretEnergizer implements EnergizerView {
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
		const hash = tileHash(tx, ty, 31);
		const pulse = 1 + Math.sin(safeTime * 4 + hash * 6) * 0.08;
		const radius = Math.max(3, tileSize * 0.4) * pulse;

		ctx.globalAlpha = 0.3;
		ctx.fillStyle = colors.energizer;
		ctx.beginPath();
		ctx.arc(cx, cy, radius * 1.9, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;

		ctx.strokeStyle = colors.dot;
		ctx.lineWidth = Math.max(1, tileSize * 0.05);
		ctx.beginPath();
		ctx.arc(
			cx,
			cy,
			radius * 1.35,
			safeTime * 1.8 + hash * 6,
			safeTime * 1.8 + hash * 6 + Math.PI * 0.7
		);
		ctx.stroke();

		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(Math.sin(safeTime * 2 + hash * 4) * 0.12);

		const body = ctx.createLinearGradient(0, -radius, 0, radius);
		body.addColorStop(0, '#fff4ff');
		body.addColorStop(0.5, colors.energizer);
		body.addColorStop(1, '#4b2f77');
		ctx.fillStyle = body;

		ctx.beginPath();
		ctx.ellipse(0, 0, radius * 0.72, radius * 0.9, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,.7)';
		ctx.beginPath();
		ctx.arc(-radius * 0.2, -radius * 0.25, Math.max(1, radius * 0.16), 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}
