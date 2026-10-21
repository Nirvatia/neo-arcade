import type { SpeedBoltService } from '../logic/SpeedBoltService';
import type { GridLayout } from './GridView';

export class SpeedBoltView {
	draw(ctx: CanvasRenderingContext2D, bolt: SpeedBoltService, layout: GridLayout): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('SpeedBoltView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		if (!bolt.active) {
			return;
		}
		const position = bolt.position;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('SpeedBoltView.draw', 'invalid bolt position', position);
			return;
		}
		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const scale = layout.tileSize;
		const blinking = bolt.timer < 2 && Math.floor(bolt.timer * 5) % 2 === 0;
		ctx.save();
		if (blinking) {
			ctx.globalAlpha = 0.4;
		}
		this.drawBolt(ctx, x, y, scale);
		ctx.restore();
	}

	private drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
		const h = scale * 0.7;
		const w = scale * 0.34;
		const top = y - h / 2;
		const bottom = y + h / 2;
		const midY = y + h * 0.06;
		ctx.fillStyle = '#ffe24b';
		ctx.beginPath();
		ctx.moveTo(x + w * 0.1, top);
		ctx.lineTo(x - w * 0.42, midY);
		ctx.lineTo(x - w * 0.06, midY);
		ctx.lineTo(x - w * 0.18, bottom);
		ctx.lineTo(x + w * 0.42, midY - h * 0.08);
		ctx.lineTo(x + w * 0.04, midY - h * 0.08);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = '#ffb14d';
		ctx.lineWidth = Math.max(1, scale * 0.04);
		ctx.beginPath();
		ctx.moveTo(x + w * 0.1, top);
		ctx.lineTo(x - w * 0.42, midY);
		ctx.lineTo(x - w * 0.06, midY);
		ctx.lineTo(x - w * 0.18, bottom);
		ctx.lineTo(x + w * 0.42, midY - h * 0.08);
		ctx.lineTo(x + w * 0.04, midY - h * 0.08);
		ctx.closePath();
		ctx.stroke();
	}
}