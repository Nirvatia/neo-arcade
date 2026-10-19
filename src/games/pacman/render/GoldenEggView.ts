import type { GoldenEggService } from '../logic/GoldenEggService';
import type { GridLayout } from './GridView';

export class GoldenEggView {
	draw(ctx: CanvasRenderingContext2D, egg: GoldenEggService, layout: GridLayout): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('GoldenEggView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}

		if (egg.phase === 'egg') {
			this.drawEgg(ctx, egg, layout);
		}

		if (egg.exitOpen) {
			this.drawExit(ctx, egg, layout);
		}
	}

	private drawEgg(ctx: CanvasRenderingContext2D, egg: GoldenEggService, layout: GridLayout): void {
		const position = egg.eggPosition;

		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('GoldenEggView.drawEgg', 'invalid egg position', position);
			return;
		}

		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const radius = Math.max(2, layout.tileSize * 0.3);
		const blinking = egg.eggTimer < 3 && Math.floor(egg.eggTimer * 4) % 2 === 0;

		ctx.save();

		if (blinking) {
			ctx.globalAlpha = 0.45;
		}

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

	private drawExit(ctx: CanvasRenderingContext2D, egg: GoldenEggService, layout: GridLayout): void {
		const position = egg.exitPosition;

		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('GoldenEggView.drawExit', 'invalid exit position', position);
			return;
		}

		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const width = layout.tileSize * 0.82;
		const height = layout.tileSize * 0.92;
		const left = x - width / 2;
		const top = y - height / 2;

		ctx.save();

		ctx.fillStyle = '#2a1e05';
		ctx.fillRect(left, top, width, height);

		ctx.strokeStyle = '#ffd93b';
		ctx.lineWidth = Math.max(1, layout.tileSize * 0.09);
		ctx.strokeRect(left, top, width, height);

		ctx.fillStyle = '#ffd93b';
		ctx.fillRect(x - Math.max(1, width * 0.08), top + height * 0.2, Math.max(1, width * 0.16), height * 0.6);

		ctx.fillStyle = 'rgba(255, 217, 59, 0.25)';
		ctx.fillRect(left + width * 0.2, top + height * 0.15, width * 0.6, height * 0.7);

		ctx.restore();
	}
}