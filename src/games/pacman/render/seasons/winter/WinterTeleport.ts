import type { TeleportView } from '../../contracts/SeasonRenderBundle';

export class WinterTeleport implements TeleportView {
	draw(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		tileSize: number,
		token: string
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		const radius = Math.max(3, tileSize * 0.42);

		ctx.fillStyle = '#26352b';
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#a8b3a6';
		ctx.lineWidth = Math.max(1, tileSize * 0.12);
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = '#7fd8ff';
		ctx.lineWidth = Math.max(1, tileSize * 0.05);
		ctx.beginPath();
		ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
		ctx.stroke();

		for (let i = 0; i < 6; i += 1) {
			const angle = i * (Math.PI / 3);
			ctx.fillStyle = '#bfeaff';
			ctx.beginPath();
			ctx.arc(
				cx + Math.cos(angle) * radius * 0.8,
				cy + Math.sin(angle) * radius * 0.8,
				Math.max(0.6, tileSize * 0.04),
				0,
				Math.PI * 2
			);
			ctx.fill();
		}
	}
}
