import type { PelletView } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class AutumnPellet implements PelletView {
	draw(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		const hash = tileHash(tx, ty, 13);
		const radius = Math.max(1.5, tileSize * 0.18);

		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(hash * Math.PI * 2);

		const body = ctx.createLinearGradient(-radius, -radius, radius, radius);
		body.addColorStop(0, '#fff0e8');
		body.addColorStop(0.55, colors.dot);
		body.addColorStop(1, '#a86a2f');
		ctx.fillStyle = body;

		ctx.beginPath();
		ctx.ellipse(0, radius * 0.1, radius * 0.72, radius, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#7a4a22';
		ctx.beginPath();
		ctx.ellipse(0, -radius * 0.45, radius * 0.55, radius * 0.32, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = 'rgba(255,255,255,.65)';
		ctx.lineWidth = Math.max(0.5, tileSize * 0.03);
		ctx.beginPath();
		ctx.moveTo(0, -radius * 0.75);
		ctx.lineTo(0, -radius * 1.05);
		ctx.stroke();
		ctx.restore();
	}
}