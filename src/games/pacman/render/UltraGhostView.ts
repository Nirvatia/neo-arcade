import type { UltraGhostService } from '../logic/UltraGhostService';
import type { GridLayout } from './GridView';

export class UltraGhostView {
	draw(ctx: CanvasRenderingContext2D, ultra: UltraGhostService, layout: GridLayout): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('UltraGhostView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		if (ultra.phase !== 'contract') {
			return;
		}
		this.drawUltra(ctx, ultra, layout);
	}

	private drawUltra(ctx: CanvasRenderingContext2D, ultra: UltraGhostService, layout: GridLayout): void {
		const position = ultra.position;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('UltraGhostView.drawUltra', 'invalid ultra position', position);
			return;
		}
		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const radius = Math.max(3, layout.tileSize * 0.46);
		ctx.save();
		ctx.fillStyle = '#2b0a3d';
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#ff4d4d';
		ctx.lineWidth = Math.max(1, radius * 0.14);
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.stroke();
		const eyeRadius = Math.max(1, radius * 0.2);
		const eyeOffsetX = radius * 0.34;
		const eyeOffsetY = radius * 0.16;
		ctx.fillStyle = '#ff4d4d';
		ctx.beginPath();
		ctx.arc(x - eyeOffsetX, y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(x + eyeOffsetX, y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}