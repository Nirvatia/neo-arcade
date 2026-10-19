import type { FruitService, FruitKind } from '../logic/FruitService';
import type { GridLayout } from './GridView';

export class FruitView {
	draw(ctx: CanvasRenderingContext2D, fruit: FruitService, layout: GridLayout): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('FruitView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}

		const kind = fruit.active;

		if (!kind) {
			return;
		}

		const position = fruit.position;

		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('FruitView.draw', 'invalid fruit position', position);
			return;
		}

		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const radius = Math.max(2, layout.tileSize * 0.28);
		const blinking = fruit.timer < 2 && Math.floor(fruit.timer * 4) % 2 === 0;

		ctx.save();

		if (blinking) {
			ctx.globalAlpha = 0.45;
		}

		ctx.fillStyle = this.colorFor(kind);
		ctx.beginPath();
		ctx.arc(x, y + radius * 0.1, radius, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
		ctx.beginPath();
		ctx.arc(x - radius * 0.3, y - radius * 0.2, Math.max(1, radius * 0.22), 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#79ff6f';
		ctx.fillRect(
			x - Math.max(1, radius * 0.12),
			y - radius * 1.05,
			Math.max(1, radius * 0.24),
			Math.max(2, radius * 0.5)
		);

		ctx.restore();
	}

	private colorFor(kind: FruitKind): string {
		if (kind === 'CF') {
			return '#ff4d4d';
		}

		if (kind === 'SF') {
			return '#ff9de2';
		}

		if (kind === 'OF') {
			return '#ffb14d';
		}

		if (kind === 'AF') {
			return '#8fe36a';
		}

		if (kind === 'MF') {
			return '#59f0ff';
		}

		if (kind === 'GF') {
			return '#5c8bff';
		}

		if (kind === 'BF') {
			return '#ffd93b';
		}

		return '#e8efff';
	}
}