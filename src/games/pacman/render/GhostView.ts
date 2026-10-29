import type { GhostService } from '../logic/GhostService';
import type { GhostModel } from '../logic/GhostModel';
import type { GridLayout, DisintegrationMask } from './GridView';

export class GhostView {
	draw(
		ctx: CanvasRenderingContext2D,
		ghosts: GhostService,
		layout: GridLayout,
		powerTimer: number,
		msOverdrive: boolean,
		disintegration: DisintegrationMask | null = null
	): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('GhostView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		for (const ghost of ghosts.list) {
			this.drawGhost(ctx, ghost, layout, powerTimer, msOverdrive, disintegration);
		}
	}

	private drawGhost(
		ctx: CanvasRenderingContext2D,
		ghost: GhostModel,
		layout: GridLayout,
		powerTimer: number,
		msOverdrive: boolean,
		disintegration: DisintegrationMask | null
	): void {
		const position = ghost.position;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('GhostView.drawGhost', 'invalid ghost position', {
				kind: ghost.kind,
				position
			});
			return;
		}
		if (this.isErased(position, disintegration)) {
			return;
		}
		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const radius = Math.max(2, layout.tileSize * 0.34);
		let lookX = 0;
		let lookY = 0;
		if (ghost.facing === 'UP') {
			lookY = -1;
		} else if (ghost.facing === 'DOWN') {
			lookY = 1;
		} else if (ghost.facing === 'LEFT') {
			lookX = -1;
		} else if (ghost.facing === 'RIGHT') {
			lookX = 1;
		}
		if (ghost.state === 'eyes') {
			this.drawEyes(ctx, x, y, radius, lookX, lookY);
			return;
		}
		const frightened = ghost.state === 'frightened';
		const hypnotized = ghost.state === 'hypnotized';
		const enraged = ghost.state === 'enraged';
		const flash =
			frightened && powerTimer > 0 && powerTimer < 2 && Math.floor(powerTimer * 4) % 2 === 0;
		ctx.save();
		if (ghost.state === 'lair' || ghost.state === 'exiting') {
			ctx.globalAlpha = 0.72;
		}
		if (hypnotized) {
			ctx.fillStyle = '#79ff6f';
		} else if (enraged) {
			ctx.fillStyle = '#ff4d4d';
		} else if (frightened) {
			if (flash) {
				ctx.fillStyle = '#e8efff';
			} else if (msOverdrive) {
				ctx.fillStyle = '#59f0ff';
			} else {
				ctx.fillStyle = '#2f2fd8';
			}
		} else {
			ctx.fillStyle = this.colorFor(ghost.kind);
		}
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
		if (hypnotized) {
			ctx.strokeStyle = 'rgba(121, 255, 111, 0.65)';
			ctx.lineWidth = Math.max(1, radius * 0.12);
			ctx.beginPath();
			ctx.arc(x, y, radius * 1.22, 0, Math.PI * 2);
			ctx.stroke();
		}
		if (enraged) {
			ctx.strokeStyle = 'rgba(255, 77, 77, 0.75)';
			ctx.lineWidth = Math.max(1, radius * 0.14);
			ctx.beginPath();
			ctx.arc(x, y, radius * 1.18, 0, Math.PI * 2);
			ctx.stroke();
		}
		const eyeRadius = Math.max(1, radius * 0.18);
		const eyeOffsetX = radius * 0.34;
		const eyeOffsetY = radius * 0.18;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(
			x - eyeOffsetX + lookX * radius * 0.12,
			y - eyeOffsetY + lookY * radius * 0.12,
			eyeRadius,
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(
			x + eyeOffsetX + lookX * radius * 0.12,
			y - eyeOffsetY + lookY * radius * 0.12,
			eyeRadius,
			0,
			Math.PI * 2
		);
		ctx.fill();
		if (enraged) {
			ctx.fillStyle = '#ffffff';
		} else if (frightened) {
			ctx.fillStyle = '#ffb14d';
		} else {
			ctx.fillStyle = '#030509';
		}
		ctx.beginPath();
		ctx.arc(
			x - eyeOffsetX + lookX * radius * 0.24,
			y - eyeOffsetY + lookY * radius * 0.24,
			Math.max(1, eyeRadius * 0.5),
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(
			x + eyeOffsetX + lookX * radius * 0.24,
			y - eyeOffsetY + lookY * radius * 0.24,
			Math.max(1, eyeRadius * 0.5),
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.restore();
	}

	private isErased(position: { x: number; y: number }, mask: DisintegrationMask | null): boolean {
		if (!mask) {
			return false;
		}
		if (!Number.isFinite(mask.radius) || mask.radius <= 0) {
			return false;
		}
		const dx = position.x - mask.centerX;
		const dy = position.y - mask.centerY;
		return dx * dx + dy * dy <= mask.radius * mask.radius;
	}

	private drawEyes(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		radius: number,
		lookX: number,
		lookY: number
	): void {
		const eyeRadius = Math.max(1, radius * 0.24);
		const eyeOffsetX = radius * 0.34;
		const eyeOffsetY = radius * 0.18;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(x - eyeOffsetX, y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(x + eyeOffsetX, y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#030509';
		ctx.beginPath();
		ctx.arc(
			x - eyeOffsetX + lookX * radius * 0.24,
			y - eyeOffsetY + lookY * radius * 0.24,
			Math.max(1, eyeRadius * 0.5),
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(
			x + eyeOffsetX + lookX * radius * 0.24,
			y - eyeOffsetY + lookY * radius * 0.24,
			Math.max(1, eyeRadius * 0.5),
			0,
			Math.PI * 2
		);
		ctx.fill();
	}

	private colorFor(kind: GhostModel['kind']): string {
		if (kind === 'BLINKY') {
			return '#ff4d4d';
		}
		if (kind === 'PINKY') {
			return '#ff9de2';
		}
		if (kind === 'INKY') {
			return '#59f0ff';
		}
		return '#ffb14d';
	}
}
