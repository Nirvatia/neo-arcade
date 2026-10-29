import type { EchoCloneService } from '../../logic/bonuses/EchoCloneService';
import type { GridLayout } from '../maze/GridView';

export class EchoCloneView {
	draw(ctx: CanvasRenderingContext2D, echo: EchoCloneService, layout: GridLayout): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('EchoCloneView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		const phase = echo.phase;
		if (phase === 'token') {
			this.drawToken(ctx, echo, layout);
			return;
		}
		if (phase === 'clone') {
			this.drawClone(ctx, echo, layout);
		}
	}

	private drawToken(
		ctx: CanvasRenderingContext2D,
		echo: EchoCloneService,
		layout: GridLayout
	): void {
		const position = echo.position;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('EchoCloneView.drawToken', 'invalid token position', position);
			return;
		}
		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const radius = Math.max(2, layout.tileSize * 0.3);
		const blinking = echo.timer < 2 && Math.floor(echo.timer * 5) % 2 === 0;
		ctx.save();
		if (blinking) {
			ctx.globalAlpha = 0.45;
		}
		ctx.strokeStyle = '#9be8ff';
		ctx.lineWidth = Math.max(1, Math.floor(layout.tileSize * 0.08));
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.stroke();
		ctx.fillStyle = '#e8fbff';
		ctx.beginPath();
		ctx.arc(x, y, Math.max(1, radius * 0.55), 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	private drawClone(
		ctx: CanvasRenderingContext2D,
		echo: EchoCloneService,
		layout: GridLayout
	): void {
		const position = echo.position;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('EchoCloneView.drawClone', 'invalid clone position', position);
			return;
		}
		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const radius = Math.max(2, layout.tileSize * 0.32);
		let angle = 0;
		const facing = echo.facing;
		if (facing === 'UP') {
			angle = -Math.PI / 2;
		} else if (facing === 'DOWN') {
			angle = Math.PI / 2;
		} else if (facing === 'LEFT') {
			angle = Math.PI;
		}
		const fading = echo.timer < 1 && Math.floor(echo.timer * 6) % 2 === 0;
		ctx.save();
		ctx.globalAlpha = fading ? 0.35 : 0.7;
		ctx.fillStyle = '#9be8ff';
		const halfMouth = Math.PI * 0.18;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x, y, radius, angle + halfMouth, angle + Math.PI * 2 - halfMouth, false);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = 'rgba(155, 232, 255, 0.5)';
		ctx.lineWidth = Math.max(1, Math.floor(radius * 0.12));
		ctx.beginPath();
		ctx.arc(x, y, radius * 1.25, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}
}
