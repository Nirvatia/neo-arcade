import type { PelletView } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class SecretPellet implements PelletView {
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

		const hash = tileHash(tx, ty, 29);
		const radius = Math.max(1.5, tileSize * 0.18);

		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(hash * Math.PI * 2);

		ctx.globalAlpha = 0.35;
		ctx.fillStyle = colors.dot;
		ctx.beginPath();
		ctx.arc(0, 0, radius * 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;

		const gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
		gradient.addColorStop(0, '#ffffff');
		gradient.addColorStop(0.55, colors.dot);
		gradient.addColorStop(1, '#7a5cff');
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
