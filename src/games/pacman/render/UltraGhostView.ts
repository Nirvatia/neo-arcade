import type { UltraGhostService } from '../logic/UltraGhostService';
import type { GridLayout } from './GridView';

export class UltraGhostView {
	draw(ctx: CanvasRenderingContext2D, ultra: UltraGhostService, layout: GridLayout): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('UltraGhostView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}

		if (ultra.phase === 'armed') {
			this.drawSwitch(ctx, ultra, layout);
			return;
		}

		if (ultra.phase === 'contract') {
			this.drawTrap(ctx, ultra, layout);
			this.drawUltra(ctx, ultra, layout);
		}
	}

	private drawSwitch(ctx: CanvasRenderingContext2D, ultra: UltraGhostService, layout: GridLayout): void {
		const position = ultra.switchPosition;
		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const size = Math.max(3, layout.tileSize * 0.34);

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(Math.PI / 4);

		ctx.fillStyle = '#c77dff';
		ctx.fillRect(-size / 2, -size / 2, size, size);

		ctx.strokeStyle = '#5b2b8f';
		ctx.lineWidth = Math.max(1, layout.tileSize * 0.06);
		ctx.strokeRect(-size / 2, -size / 2, size, size);

		ctx.restore();
	}

	private drawTrap(ctx: CanvasRenderingContext2D, ultra: UltraGhostService, layout: GridLayout): void {
		const position = ultra.trapPosition;
		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const size = Math.max(4, layout.tileSize * 0.62);
		const left = x - size / 2;
		const top = y - size / 2;

		ctx.save();

		if (ultra.trapActive) {
			ctx.fillStyle = 'rgba(255, 45, 45, 0.28)';
			ctx.fillRect(left, top, size, size);

			ctx.strokeStyle = '#ff4d4d';
			ctx.lineWidth = Math.max(1, layout.tileSize * 0.09);
			ctx.strokeRect(left, top, size, size);

			ctx.fillStyle = '#ff4d4d';
			ctx.fillRect(x - size * 0.1, y - size * 0.32, size * 0.2, size * 0.64);
			ctx.fillRect(x - size * 0.32, y - size * 0.1, size * 0.64, size * 0.2);
		} else {
			ctx.strokeStyle = 'rgba(255, 77, 77, 0.38)';
			ctx.lineWidth = Math.max(1, layout.tileSize * 0.06);
			ctx.strokeRect(left, top, size, size);
		}

		ctx.restore();
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