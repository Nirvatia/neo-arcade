import type { PlayerService } from '../logic/PlayerService';
import type { GridLayout } from './GridView';

export class PlayerView {
	draw(ctx: CanvasRenderingContext2D, player: PlayerService, layout: GridLayout): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('PlayerView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}

		const position = player.position;

		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('PlayerView.draw', 'invalid player position', position);
			return;
		}

		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const radius = Math.max(2, layout.tileSize * 0.32);

		let angle = 0;

		if (player.facing === 'UP') {
			angle = -Math.PI / 2;
		} else if (player.facing === 'DOWN') {
			angle = Math.PI / 2;
		} else if (player.facing === 'LEFT') {
			angle = Math.PI;
		}

		const halfMouth = Math.PI * 0.18;

		ctx.fillStyle = '#ffe24b';
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x, y, radius, angle + halfMouth, angle + Math.PI * 2 - halfMouth, false);
		ctx.closePath();
		ctx.fill();

		if (player.isInvulnerable) {
			ctx.strokeStyle = 'rgba(86, 217, 255, 0.9)';
			ctx.lineWidth = Math.max(1, radius * 0.15);
			ctx.beginPath();
			ctx.arc(x, y, radius * 1.25, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
}