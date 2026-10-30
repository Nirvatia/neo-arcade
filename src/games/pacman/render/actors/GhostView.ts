import type { GhostService } from '../../logic/actors/GhostService';
import type { GhostModel } from '../../logic/actors/GhostModel';
import type { GridLayout } from '../maze/GridView';

export class GhostView {
	draw(
		ctx: CanvasRenderingContext2D,
		ghosts: GhostService,
		layout: GridLayout,
		powerTimer: number,
		msOverdrive: boolean,
		vanish = 0
	): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('GhostView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		for (const ghost of ghosts.list) {
			this.drawGhost(ctx, ghost, layout, powerTimer, msOverdrive);
		}
		if (vanish < 1) {
			for (const ghost of ghosts.banishedList) {
				this.drawVanishing(ctx, ghost, layout, powerTimer, msOverdrive, vanish);
			}
		}
	}

	/**
	 * A ghost the lair code sent away (`p` 0..1): it stops, swells a little, then shrinks
	 * and rises as it fades, while sparks in its colour fly out and go out.
	 */
	private drawVanishing(
		ctx: CanvasRenderingContext2D,
		ghost: GhostModel,
		layout: GridLayout,
		powerTimer: number,
		msOverdrive: boolean,
		p: number
	): void {
		const t = Math.max(0, Math.min(1, p));
		const S = layout.tileSize;
		const position = ghost.position;
		const x = layout.offsetX + position.x * S;
		const y = layout.offsetY + position.y * S;
		const fade = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75;
		const scale = t < 0.25 ? 1 + t * 0.6 : 1.15 * fade;
		if (fade > 0) {
			ctx.save();
			ctx.globalAlpha *= fade;
			ctx.translate(x, y - t * t * S * 0.35);
			ctx.scale(scale, scale);
			ctx.translate(-x, -y);
			this.drawGhost(ctx, ghost, layout, powerTimer, msOverdrive);
			ctx.restore();
		}
		if (t > 0.2) {
			const k = (t - 0.2) / 0.8;
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha *= 1 - k;
			ctx.fillStyle = this.colorFor(ghost.kind);
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2 + ghost.kind.length;
				const r = S * (0.15 + k * 0.45);
				const side = Math.max(1, S * 0.12 * (1 - k * 0.6));
				ctx.fillRect(x + Math.cos(a) * r - side / 2, y + Math.sin(a) * r - side / 2, side, side);
			}
			ctx.restore();
		}
	}

	private drawGhost(
		ctx: CanvasRenderingContext2D,
		ghost: GhostModel,
		layout: GridLayout,
		powerTimer: number,
		msOverdrive: boolean
	): void {
		const position = ghost.position;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('GhostView.drawGhost', 'invalid ghost position', {
				kind: ghost.kind,
				position
			});
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
