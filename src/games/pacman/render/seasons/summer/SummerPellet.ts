import type { PelletView } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class SummerPellet implements PelletView {
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
		ctx.rotate(hash * Math.PI);

		const gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
		gradient.addColorStop(0, '#fff7da');
		gradient.addColorStop(0.55, colors.dot);
		gradient.addColorStop(1, '#d89a2f');
		ctx.fillStyle = gradient;

		ctx.beginPath();
		ctx.ellipse(0, 0, radius, radius * 0.62, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = 'rgba(255,255,255,.75)';
		ctx.lineWidth = Math.max(0.5, tileSize * 0.03);
		ctx.beginPath();
		ctx.moveTo(-radius * 0.6, 0);
		ctx.lineTo(radius * 0.6, 0);
		ctx.stroke();
		ctx.restore();
	}
}