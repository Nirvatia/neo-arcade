import type { PlayerService } from '../logic/PlayerService';
import type { PacmanProfile } from '../core/Events';
import type { GridLayout } from './GridView';

export class PlayerView {
	draw(
		ctx: CanvasRenderingContext2D,
		player: PlayerService,
		layout: GridLayout,
		profile: PacmanProfile
	): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('PlayerView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		if (profile !== 'pacman' && profile !== 'ms-pacman') {
			console.error('PlayerView.draw', 'invalid profile', profile);
			profile = 'pacman';
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
		ctx.fillStyle = profile === 'ms-pacman' ? '#ff8fd3' : '#ffe24b';
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x, y, radius, angle + halfMouth, angle + Math.PI * 2 - halfMouth, false);
		ctx.closePath();
		ctx.fill();
		if (profile === 'ms-pacman') {
			this.drawBow(ctx, x, y, radius);
		}
		if (player.isInvulnerable) {
			ctx.strokeStyle = 'rgba(86, 217, 255, 0.9)';
			ctx.lineWidth = Math.max(1, radius * 0.15);
			ctx.beginPath();
			ctx.arc(x, y, radius * 1.25, 0, Math.PI * 2);
			ctx.stroke();
		}
	}

	private drawBow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
		const size = Math.max(2, radius * 0.42);
		const bowY = y - radius * 0.82;
		ctx.fillStyle = '#ff4d6d';
		ctx.beginPath();
		ctx.moveTo(x, bowY);
		ctx.lineTo(x - size, bowY - size * 0.62);
		ctx.lineTo(x - size * 0.85, bowY + size * 0.5);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x, bowY);
		ctx.lineTo(x + size, bowY - size * 0.62);
		ctx.lineTo(x + size * 0.85, bowY + size * 0.5);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = '#ffd93b';
		ctx.beginPath();
		ctx.arc(x, bowY, Math.max(1, size * 0.22), 0, Math.PI * 2);
		ctx.fill();
	}
}