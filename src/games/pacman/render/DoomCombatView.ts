import type { GridLayout } from './GridView';
import type { GridService } from '../logic/GridService';
import type { DoomBossService } from '../logic/doom/DoomBossService';
import type { DoomAbilityService } from '../logic/doom/DoomAbilityService';
import { minionPosition } from '../logic/doom/DoomMinions';
import { VOID_FLICKER } from '../logic/doom/DoomBalance';
import { DOOM_TILE } from './doom/DoomBake';
import { barrelSprite, glowTexture, pickupSprite } from './doom/DoomSprites';

const MINION_COLORS: Record<string, string> = {
	pinky: '#ff9de2',
	inky: '#59f0ff',
	clyde: '#ffb14d'
};

export class DoomCombatView {
	/** Everything lying on the floor, drawn under the boss. */
	drawGround(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		doom: DoomAbilityService,
		grid: GridService,
		layout: GridLayout,
		time: number
	): void {
		this.drawCorruption(ctx, boss, grid, layout, time);
		this.drawVoidCells(ctx, boss, layout, time);
		this.drawPendingSeals(ctx, boss, layout, time);
		this.drawHazardWarnings(ctx, boss, layout, time);
		this.drawCrossTelegraph(ctx, boss, grid, layout);
		this.drawPickups(ctx, doom, layout, time);
		this.drawBarrels(ctx, doom, layout, time);
	}

	/** Hazard blasts and minions, drawn over the boss (projectiles live in DoomFxView). */
	drawAir(ctx: CanvasRenderingContext2D, boss: DoomBossService, layout: GridLayout, time: number): void {
		this.drawHazardBlasts(ctx, boss, layout, time);
		this.drawMinions(ctx, boss, layout, time);
	}

	/** Pull: chains of void dragging the player toward the boss. */
	drawPull(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		player: { x: number; y: number },
		layout: GridLayout,
		time: number
	): void {
		const left = boss.pullRemaining;
		if (left <= 0) {
			return;
		}
		const s = layout.tileSize;
		const b = boss.position;
		const x0 = layout.offsetX + b.x * s;
		const y0 = layout.offsetY + b.y * s;
		const x1 = layout.offsetX + player.x * s;
		const y1 = layout.offsetY + player.y * s;
		const fade = Math.min(1, left / 0.5);
		const len = Math.hypot(x1 - x0, y1 - y0);
		const nx = len > 0 ? -(y1 - y0) / len : 0;
		const ny = len > 0 ? (x1 - x0) / len : 0;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let strand = 0; strand < 3; strand += 1) {
			ctx.strokeStyle = `rgba(170,60,255,${0.35 * fade})`;
			ctx.lineWidth = Math.max(1, s * 0.06);
			ctx.beginPath();
			for (let i = 0; i <= 24; i += 1) {
				const u = i / 24;
				const wave = Math.sin(u * 10 - time * 9 + strand * 2.1) * s * 0.18 * Math.sin(u * Math.PI);
				const x = x0 + (x1 - x0) * u + nx * wave;
				const y = y0 + (y1 - y0) * u + ny * wave;
				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}
			ctx.stroke();
		}
		// beads crawling toward the boss
		for (let i = 0; i < 6; i += 1) {
			const u = 1 - ((time * 0.9 + i / 6) % 1);
			ctx.fillStyle = `rgba(220,150,255,${0.7 * fade})`;
			ctx.beginPath();
			ctx.arc(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, Math.max(1, s * 0.07), 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	/** Phase 3: outer corridors rot into the abyss (they slow the player). */
	private drawCorruption(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		grid: GridService,
		layout: GridLayout,
		time: number
	): void {
		if (boss.corruption <= 0) {
			return;
		}
		const s = layout.tileSize;
		ctx.save();
		for (let y = 0; y < grid.height; y += 1) {
			for (let x = 0; x < grid.width; x += 1) {
				if (!boss.isCorrupted(x, y)) {
					continue;
				}
				const px = layout.offsetX + x * s;
				const py = layout.offsetY + y * s;
				const pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + x * 0.9 + y * 1.3);
				ctx.globalAlpha = 0.75;
				ctx.fillStyle = '#0a0410';
				ctx.fillRect(px, py, s, s);
				ctx.globalAlpha = 0.35 + 0.3 * pulse;
				ctx.strokeStyle = '#8a2aff';
				ctx.lineWidth = Math.max(0.8, s * 0.045);
				ctx.beginPath();
				for (let k = 0; k < 3; k += 1) {
					const ax = px + tileNoise(x, y, k) * s;
					const ay = py + tileNoise(y, x, k + 5) * s;
					ctx.moveTo(ax, ay);
					ctx.lineTo(px + tileNoise(x + 3, y, k) * s, py + tileNoise(x, y + 7, k) * s);
				}
				ctx.stroke();
			}
		}
		ctx.restore();
	}

	private drawPendingSeals(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		for (const seal of boss.pendingSealList) {
			const p = 1 - Math.max(0, seal.warn) / seal.total;
			const cx = layout.offsetX + (seal.x + 0.5) * s;
			const cy = layout.offsetY + (seal.y + 0.5) * s;
			drawSigil(ctx, cx, cy, s * (0.9 - 0.45 * p), time, 0.35 + 0.65 * p, p);
		}
	}

	private drawHazardWarnings(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		ctx.save();
		for (const hazard of boss.hazardList) {
			if (hazard.warn <= 0 || hazard.warn > hazard.warnVisible) {
				continue;
			}
			const p = 1 - hazard.warn / hazard.warnVisible;
			const flicker = p > 0.75 ? 0.5 + 0.5 * Math.sin(time * 50) : 1;
			const rift = hazard.kind === 'rift';
			for (const tile of hazard.tiles) {
				const px = layout.offsetX + tile.x * s;
				const py = layout.offsetY + tile.y * s;
				ctx.globalCompositeOperation = 'source-over';
				ctx.globalAlpha = (0.18 + 0.32 * p) * flicker;
				ctx.fillStyle = rift ? '#3a0010' : '#1a0020';
				ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = (0.3 + 0.7 * p) * flicker;
				ctx.strokeStyle = rift ? '#ff3a1a' : '#c02aff';
				ctx.lineWidth = Math.max(0.8, s * (0.04 + 0.05 * p));
				ctx.beginPath();
				// a crack that grows across the tile as the blast nears
				const n = 4;
				for (let k = 0; k <= n; k += 1) {
					const u = (k / n) * (0.35 + 0.65 * p);
					const jx = (tileNoise(tile.x, tile.y, k) - 0.5) * s * 0.4;
					const jy = (tileNoise(tile.y, tile.x, k + 9) - 0.5) * s * 0.4;
					const x = rift && hazard.axis === 'y' ? px + s / 2 + jx : px + u * s;
					const y = rift && hazard.axis === 'y' ? py + u * s : py + s / 2 + jy;
					if (k === 0) {
						ctx.moveTo(x, y);
					} else {
						ctx.lineTo(x, y);
					}
				}
				ctx.stroke();
				if (!rift) {
					ctx.beginPath();
					ctx.arc(px + s / 2, py + s / 2, s * (0.42 - 0.25 * p), 0, Math.PI * 2);
					ctx.stroke();
				}
			}
		}
		ctx.restore();
	}

	private drawHazardBlasts(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		ctx.save();
		for (const hazard of boss.hazardList) {
			if (hazard.warn > 0) {
				continue;
			}
			const k = Math.max(0, hazard.active / hazard.activeTotal);
			if (hazard.kind === 'rift' && hazard.tiles.length > 0) {
				const a = hazard.tiles[0];
				const b = hazard.tiles[hazard.tiles.length - 1];
				const x0 = layout.offsetX + (a.x + 0.5) * s;
				const y0 = layout.offsetY + (a.y + 0.5) * s;
				const x1 = layout.offsetX + (b.x + 0.5) * s;
				const y1 = layout.offsetY + (b.y + 0.5) * s;
				ctx.lineCap = 'round';
				ctx.globalCompositeOperation = 'lighter';
				const passes: Array<[string, number]> = [
					[`rgba(255,40,20,${0.55 * k})`, s * 1.1],
					[`rgba(255,140,60,${0.8 * k})`, s * 0.55],
					[`rgba(255,255,240,${k})`, s * 0.18]
				];
				for (const [color, width] of passes) {
					ctx.strokeStyle = color;
					ctx.lineWidth = width * (0.7 + 0.3 * Math.sin(time * 60));
					ctx.beginPath();
					ctx.moveTo(x0, y0);
					ctx.lineTo(x1, y1);
					ctx.stroke();
				}
				ctx.globalCompositeOperation = 'source-over';
				ctx.strokeStyle = `rgba(0,0,0,${0.85 * k})`;
				ctx.lineWidth = s * 0.08;
				ctx.beginPath();
				ctx.moveTo(x0, y0);
				ctx.lineTo(x1, y1);
				ctx.stroke();
				continue;
			}
			for (const tile of hazard.tiles) {
				const cx = layout.offsetX + (tile.x + 0.5) * s;
				const cy = layout.offsetY + (tile.y + 0.5) * s;
				const r = s * (0.3 + 0.5 * (1 - k));
				ctx.globalCompositeOperation = 'lighter';
				const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
				g.addColorStop(0, `rgba(255,220,255,${k})`);
				g.addColorStop(0.4, `rgba(200,60,255,${0.8 * k})`);
				g.addColorStop(1, 'rgba(0,0,0,0)');
				ctx.fillStyle = g;
				ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
				ctx.globalCompositeOperation = 'source-over';
				ctx.fillStyle = `rgba(0,0,0,${0.9 * k})`;
				ctx.beginPath();
				ctx.arc(cx, cy, s * 0.14 * k, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.restore();
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
			if (cell.kind === 'seal') {
				ctx.save();
				ctx.globalAlpha = alpha * 0.85;
				ctx.fillStyle = '#050005';
				ctx.fillRect(px, py, s, s);
				ctx.restore();
				drawSigil(ctx, px + s / 2, py + s / 2, s * 0.46, time, alpha, 1);
				continue;
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

	// Power-up from the prototype: additive glow plus icon, gently pulsing and swaying.
	// A pickup that cannot be taken right now (full health, occupied slot) is dimmed.
	private drawPickups(
		ctx: CanvasRenderingContext2D,
		doom: DoomAbilityService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		const u = s / DOOM_TILE;
		for (const pickup of doom.pickupList) {
			const px = layout.offsetX + (pickup.tile.x + 0.5) * s;
			const py = layout.offsetY + (pickup.tile.y + 0.5) * s;
			const phase = pickup.tile.x * 1.7 + pickup.tile.y * 0.9;
			if (pickup.visible && pickup.kind) {
				const sprite = pickupSprite(pickup.kind);
				const ready = doom.canCollect(pickup.kind);
				const scale = 1 + 0.05 * Math.sin(time * 2.6 + phase);
				const glow = ((64 * 0.95) / 3) * u;
				ctx.save();
				ctx.translate(px, py);
				ctx.scale(scale, scale);
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = ready ? 0.7 : 0.25;
				ctx.drawImage(glowTexture(sprite.glow), -glow / 2, -glow / 2, glow, glow);
				ctx.globalCompositeOperation = 'source-over';
				ctx.globalAlpha = ready ? 1 : 0.45;
				ctx.rotate(ready ? Math.sin(time * 2 + phase) * 0.1 : 0);
				ctx.drawImage(sprite.icon, -13 * u, -13 * u, 26 * u, 26 * u);
				ctx.restore();
			} else if (!pickup.visible && pickup.respawnProgress > 0) {
				const radius = 9 * u;
				ctx.save();
				ctx.globalAlpha = 0.35;
				ctx.strokeStyle = '#ff8a5a';
				ctx.lineWidth = Math.max(1, 1.4 * u);
				ctx.beginPath();
				ctx.arc(px, py, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pickup.respawnProgress);
				ctx.stroke();
				if (pickup.pendingKind) {
					const sprite = pickupSprite(pickup.pendingKind);
					ctx.globalAlpha = 0.18;
					ctx.drawImage(sprite.icon, px - 8 * u, py - 8 * u, 16 * u, 16 * u);
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
		const u = s / DOOM_TILE;
		for (const barrel of doom.barrelList) {
			const px = layout.offsetX + (barrel.x + 0.5) * s;
			const py = layout.offsetY + (barrel.y + 0.5) * s;
			const flash = barrel.timer < 2 ? Math.abs(Math.sin(time * 8)) : 0;
			ctx.save();
			ctx.translate(px, py);
			if (flash > 0) {
				const glow = 22 * u;
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = flash * 0.8;
				ctx.drawImage(glowTexture(0xff6a1a), -glow / 2, -glow / 2, glow, glow);
				ctx.globalCompositeOperation = 'source-over';
				ctx.globalAlpha = 1;
			}
			ctx.drawImage(barrelSprite(), -12 * u, -12 * u, 24 * u, 24 * u);
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
			const px = layout.offsetX + pos.x * s;
			const py = layout.offsetY + pos.y * s;
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

function tileNoise(x: number, y: number, k: number): number {
	const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
	return v - Math.floor(v);
}

/** Seal glyph: a burning ring with a pentagram, used for warnings and locked tiles. */
function drawSigil(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
	time: number,
	alpha: number,
	strength: number
): void {
	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(time * 0.8);
	ctx.globalCompositeOperation = 'lighter';
	ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
	ctx.strokeStyle = '#ff3a1a';
	ctx.lineWidth = Math.max(0.8, r * 0.12);
	ctx.beginPath();
	ctx.arc(0, 0, r, 0, Math.PI * 2);
	ctx.stroke();
	ctx.lineWidth = Math.max(0.6, r * 0.08);
	ctx.strokeStyle = strength >= 1 ? '#ffb070' : '#ff6a3a';
	ctx.beginPath();
	for (let i = 0; i <= 5; i += 1) {
		const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
		const x = Math.cos(a) * r * 0.92;
		const y = Math.sin(a) * r * 0.92;
		if (i === 0) {
			ctx.moveTo(x, y);
		} else {
			ctx.lineTo(x, y);
		}
	}
	ctx.stroke();
	ctx.restore();
}
