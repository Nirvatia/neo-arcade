import type { GoldenEggService } from '../logic/GoldenEggService';
import type { GridLayout } from './GridView';

export class GoldenEggView {
	draw(ctx: CanvasRenderingContext2D, egg: GoldenEggService, layout: GridLayout): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('GoldenEggView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		if (egg.phase !== 'egg') {
			return;
		}
		const position = egg.eggPosition;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('GoldenEggView.draw', 'invalid egg position', position);
			return;
		}

		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const radius = Math.max(2, layout.tileSize * 0.3);

		ctx.save();
		ctx.fillStyle = '#ffd93b';
		ctx.translate(x, y);
		ctx.scale(0.78, 1.05);
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.scale(1 / 0.78, 1 / 1.05);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
		ctx.beginPath();
		ctx.arc(-radius * 0.28, -radius * 0.35, Math.max(1, radius * 0.2), 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}