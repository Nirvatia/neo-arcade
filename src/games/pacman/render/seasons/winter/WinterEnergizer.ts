import type { EnergizerView } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class WinterEnergizer implements EnergizerView {
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
		const hash = tileHash(tx, ty, 23);
		const pulse = 1 + Math.sin(safeTime * 4 + hash * 6) * 0.08;
		const radius = Math.max(3, tileSize * 0.42) * pulse;

		const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.7);
		glow.addColorStop(0, 'rgba(127,216,255,.55)');
		glow.addColorStop(1, 'rgba(127,216,255,0)');
		ctx.fillStyle = glow;
		ctx.fillRect(cx - radius * 1.7, cy - radius * 1.7, radius * 3.4, radius * 3.4);

		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(safeTime * 0.35 + hash);
		ctx.strokeStyle = '#e8f8ff';
		ctx.lineCap = 'round';
		ctx.lineWidth = Math.max(1, tileSize * 0.07);

		for (let i = 0; i < 6; i += 1) {
			ctx.rotate(Math.PI / 3);
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(0, -radius);
			ctx.moveTo(0, -radius * 0.6);
			ctx.lineTo(-radius * 0.3, -radius * 0.85);
			ctx.moveTo(0, -radius * 0.6);
			ctx.lineTo(radius * 0.3, -radius * 0.85);
			ctx.stroke();
		}

		ctx.fillStyle = colors.energizer;
		ctx.beginPath();
		ctx.arc(0, 0, Math.max(1, radius * 0.2), 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}