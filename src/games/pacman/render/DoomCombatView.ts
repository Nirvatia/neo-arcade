import type { GridLayout } from './GridView';
import type { GridService } from '../logic/GridService';
import type { DoomBossService } from '../logic/doom/DoomBossService';
import type { DoomAbilityService } from '../logic/doom/DoomAbilityService';
import { minionPosition } from '../logic/doom/DoomMinions';
import { VOID_FLICKER } from '../logic/doom/DoomBalance';

const MINION_COLORS: Record<string, string> = {
	pinky: '#ff9de2',
	inky: '#59f0ff',
	clyde: '#ffb14d'
};

const PICKUP_COLORS: Record<string, string> = {
	berserk: '#ff4d4d',
	bfg: '#4dff4d',
	barrel: '#ffb14d',
	medkit: '#59f0ff'
};

export class DoomCombatView {
	draw(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		doom: DoomAbilityService,
		grid: GridService,
		layout: GridLayout,
		time: number
	): void {
		this.drawVoidCells(ctx, boss, layout, time);
		this.drawCrossTelegraph(ctx, boss, grid, layout);
		this.drawPickups(ctx, doom, layout, time);
		this.drawBarrels(ctx, doom, layout, time);
		this.drawShots(ctx, doom, layout);
		this.drawTracers(ctx, doom, layout);
		this.drawMinions(ctx, boss, layout, time);
	}

	private drawVoidCells(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		for (const cell of boss.voidCellList) {
			const px = layout.offsetX + cell.x * s;
			const py = layout.offsetY + cell.y * s;
			let alpha = 1.0;
			if (cell.timer < VOID_FLICKER) {
				alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 10));
			}
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.fillStyle = '#050005';
			ctx.fillRect(px, py, s, s);
			ctx.strokeStyle = '#440011';
			ctx.lineWidth = Math.max(1, s * 0.06);
			ctx.beginPath();
			ctx.moveTo(px, py + s * 0.1);
			ctx.lineTo(px + s * 0.25, py);
			ctx.lineTo(px + s * 0.5, py + s * 0.12);
			ctx.lineTo(px + s * 0.75, py);
			ctx.lineTo(px + s, py + s * 0.08);
			ctx.lineTo(px + s * 0.9, py + s * 0.4);
			ctx.lineTo(px + s, py + s * 0.7);
			ctx.lineTo(px + s * 0.85, py + s);
			ctx.lineTo(px + s * 0.55, py + s * 0.88);
			ctx.lineTo(px + s * 0.3, py + s);
			ctx.lineTo(px, py + s * 0.85);
			ctx.lineTo(px + s * 0.08, py + s * 0.5);
			ctx.closePath();
			ctx.stroke();
			ctx.restore();
		}
	}

	private drawCrossTelegraph(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		grid: GridService,
		layout: GridLayout
	): void {
		const rs = boss.renderState;
		if (boss.state !== 'TELEGRAPH' || rs.shape !== 'cross') {
			return;
		}
		const tile = boss.tile;
		const progress = rs.progress;
		const alpha = 0.15 + 0.45 * progress;
		const s = layout.tileSize;
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = '#ff2200';
		const directions: Array<{ dx: number; dy: number }> = [
			{ dx: 1, dy: 0 },
			{ dx: -1, dy: 0 },
			{ dx: 0, dy: 1 },
			{ dx: 0, dy: -1 }
		];
		for (const dir of directions) {
			let cx = tile.x + dir.dx;
			let cy = tile.y + dir.dy;
			let steps = 0;
			while (steps < 32 && grid.isInside(cx, cy) && grid.isWalkable(cx, cy)) {
				const px = layout.offsetX + cx * s;
				const py = layout.offsetY + cy * s;
				ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
				cx += dir.dx;
				cy += dir.dy;
				steps += 1;
			}
		}
		if (progress > 0.85) {
			const flashAlpha = 0.3 * Math.abs(Math.sin(progress * 40));
			ctx.globalAlpha = flashAlpha;
			ctx.fillStyle = '#ffffff';
			for (const dir of directions) {
				let cx = tile.x + dir.dx;
				let cy = tile.y + dir.dy;
				let steps = 0;
				while (steps < 32 && grid.isInside(cx, cy) && grid.isWalkable(cx, cy)) {
					const px = layout.offsetX + cx * s;
					const py = layout.offsetY + cy * s;
					ctx.fillRect(px, py, s, s);
					cx += dir.dx;
					cy += dir.dy;
					steps += 1;
				}
			}
		}
		ctx.restore();
	}

	private drawPickups(
		ctx: CanvasRenderingContext2D,
		doom: DoomAbilityService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		for (const pickup of doom.pickupList) {
			const px = layout.offsetX + (pickup.tile.x + 0.5) * s;
			const py = layout.offsetY + (pickup.tile.y + 0.5) * s;
			const radius = Math.max(3, s * 0.3);
			if (pickup.visible && pickup.kind) {
				const color = PICKUP_COLORS[pickup.kind] ?? '#ffffff';
				const pulse = 1 + 0.1 * Math.sin(time * 3);
				ctx.save();
				ctx.globalAlpha = 0.3;
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(px, py, radius * 1.5 * pulse, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(px, py, radius * pulse, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#ffffff';
				ctx.globalAlpha = 0.6;
				ctx.beginPath();
				ctx.arc(px - radius * 0.25, py - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			} else if (!pickup.visible && pickup.respawnProgress > 0) {
				ctx.save();
				ctx.globalAlpha = 0.25;
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = Math.max(1, s * 0.06);
				ctx.beginPath();
				ctx.arc(px, py, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pickup.respawnProgress);
				ctx.stroke();
				if (pickup.pendingKind) {
					const color = PICKUP_COLORS[pickup.pendingKind] ?? '#ffffff';
					ctx.globalAlpha = 0.2;
					ctx.fillStyle = color;
					ctx.beginPath();
					ctx.arc(px, py, radius * 0.5, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.restore();
			}
		}
	}

	private drawBarrels(
		ctx: CanvasRenderingContext2D,
		doom: DoomAbilityService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		for (const barrel of doom.barrelList) {
			const px = layout.offsetX + (barrel.x + 0.5) * s;
			const py = layout.offsetY + (barrel.y + 0.5) * s;
			const w = Math.max(4, s * 0.5);
			const h = Math.max(5, s * 0.6);
			const flash = barrel.timer < 2 ? Math.abs(Math.sin(time * 8)) : 0;
			ctx.save();
			ctx.translate(px, py);
			ctx.fillStyle = flash > 0.5 ? '#ff6600' : '#8B4513';
			ctx.fillRect(-w / 2, -h / 2, w, h);
			ctx.strokeStyle = '#333333';
			ctx.lineWidth = Math.max(1, s * 0.04);
			ctx.strokeRect(-w / 2, -h / 2, w, h);
			ctx.fillStyle = '#666666';
			ctx.fillRect(-w / 2, -h * 0.15, w, h * 0.12);
			ctx.fillRect(-w / 2, h * 0.1, w, h * 0.12);
			ctx.fillStyle = '#ff4400';
			ctx.globalAlpha = 0.6 + flash * 0.4;
			ctx.beginPath();
			ctx.arc(0, -h * 0.35, Math.max(1.5, s * 0.06), 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	private drawShots(
		ctx: CanvasRenderingContext2D,
		doom: DoomAbilityService,
		layout: GridLayout
	): void {
		const s = layout.tileSize;
		for (const shot of doom.shots) {
			const px = layout.offsetX + shot.x * s;
			const py = layout.offsetY + shot.y * s;
			const radius = Math.max(3, s * 0.25);
			ctx.save();
			ctx.globalAlpha = 0.4;
			ctx.fillStyle = '#00ff00';
			ctx.beginPath();
			ctx.arc(px, py, radius * 2, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1;
			ctx.fillStyle = '#44ff44';
			ctx.beginPath();
			ctx.arc(px, py, radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#ffffff';
			ctx.globalAlpha = 0.8;
			ctx.beginPath();
			ctx.arc(px, py, radius * 0.4, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	private drawTracers(
		ctx: CanvasRenderingContext2D,
		doom: DoomAbilityService,
		layout: GridLayout
	): void {
		const s = layout.tileSize;
		for (const tracer of doom.tracerList) {
			const startX = layout.offsetX + (tracer.x + 0.5) * s;
			const startY = layout.offsetY + (tracer.y + 0.5) * s;
			const endX = startX + tracer.dx * tracer.length * s;
			const endY = startY + tracer.dy * tracer.length * s;
			const alpha = Math.min(1, tracer.timer / 0.1);
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.strokeStyle = '#00ff00';
			ctx.lineWidth = Math.max(2, s * 0.15);
			ctx.shadowColor = '#00ff00';
			ctx.shadowBlur = 8;
			ctx.beginPath();
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
			ctx.stroke();
			ctx.shadowBlur = 0;
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = Math.max(1, s * 0.05);
			ctx.beginPath();
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
			ctx.stroke();
			ctx.restore();
		}
	}

	private drawMinions(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		for (const minion of boss.minionList) {
			const pos = minionPosition(minion);
			const px = layout.offsetX + (pos.x + 0.5) * s;
			const py = layout.offsetY + (pos.y + 0.5) * s;
			const radius = Math.max(3, s * 0.35);
			const color = MINION_COLORS[minion.kind] ?? '#ffffff';
			const wobble = Math.sin(time * 6 + pos.x * 3) * s * 0.03;
			const fadeAlpha = Math.min(1, minion.lifetime / 2);
			ctx.save();
			ctx.globalAlpha = fadeAlpha;
			ctx.translate(px, py + wobble);
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(0, 0, radius, Math.PI, 0);
			ctx.lineTo(radius, radius * 0.6);
			for (let i = 0; i < 4; i += 1) {
				const waveX = radius - (i * radius * 2) / 3;
				ctx.quadraticCurveTo(
					waveX - radius / 6, radius * 0.9,
					waveX - radius / 3, radius * 0.6
				);
			}
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.ellipse(-radius * 0.3, -radius * 0.2, radius * 0.25, radius * 0.3, 0, 0, Math.PI * 2);
			ctx.ellipse(radius * 0.3, -radius * 0.2, radius * 0.25, radius * 0.3, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#111111';
			ctx.beginPath();
			ctx.arc(-radius * 0.3, -radius * 0.15, radius * 0.12, 0, Math.PI * 2);
			ctx.arc(radius * 0.3, -radius * 0.15, radius * 0.12, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}
}