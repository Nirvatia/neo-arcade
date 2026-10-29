import type { PelletView } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class WinterPellet implements PelletView {
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

		const hash = tileHash(tx, ty, 19);
		const radius = Math.max(1.5, tileSize * 0.2);

		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(hash * Math.PI * 2);

		const gradient = ctx.createLinearGradient(0, -radius, 0, radius);
		gradient.addColorStop(0, '#f2fbff');
		gradient.addColorStop(0.55, colors.dot);
		gradient.addColorStop(1, '#62b8e6');
		ctx.fillStyle = gradient;

		ctx.beginPath();
		ctx.moveTo(0, -radius);
		ctx.lineTo(radius * 0.56, 0);
		ctx.lineTo(0, radius);
		ctx.lineTo(-radius * 0.56, 0);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = 'rgba(255,255,255,.8)';
		ctx.lineWidth = Math.max(0.5, tileSize * 0.03);
		ctx.beginPath();
		ctx.moveTo(-radius * 0.56, 0);
		ctx.lineTo(radius * 0.56, 0);
		ctx.moveTo(0, -radius);
		ctx.lineTo(0, radius);
		ctx.stroke();
		ctx.restore();
	}
}
