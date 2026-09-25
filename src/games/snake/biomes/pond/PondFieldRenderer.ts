import type { Graphics } from 'pixi.js';
import type { GridBitmask } from '../../logic/GridBitmask.js';
import type { FieldRenderer } from '../renderers.js';
import { C } from './PondPalette.js';

export class PondFieldRenderer implements FieldRenderer {
	public render(g: Graphics, grid: GridBitmask, cellSize: number): void {
		const W = grid.cols * cellSize;
		const H = grid.rows * cellSize;
		const B = cellSize;

		// ===== Земля =====
		g.rect(0, 0, W, H).fill(C.groundMid);
		g.rect(0, 0, W, H * 0.45).fill({ color: C.groundLight, alpha: 0.35 });
		g.rect(0, H * 0.55, W, H * 0.45).fill({ color: C.groundDark, alpha: 0.4 });

		// Шум на земле
		for (let i = 0; i < 240; i++) {
			const x = Math.random() * W;
			const y = Math.random() * H;

			if (x > B + 4 && x < W - B - 4 && y > B + 4 && y < H - B - 4) {
				continue;
			}

			const col =
				i % 3 === 0 ? C.groundLight : i % 3 === 1 ? C.groundDark : 0x6e643c;
			g.circle(x, y, 1 + Math.random() * 2.5).fill({ color: col, alpha: 0.12 });
		}

		// Трава на земле
		for (let i = 0; i < 120; i++) {
			const x = Math.random() * W;
			const y = Math.random() * H;

			if (x > B + 6 && x < W - B - 6 && y > B + 6 && y < H - B - 6) {
				continue;
			}

			g.moveTo(x, y).lineTo(x + (Math.random() - 0.5) * 4, y - 2 - Math.random() * 4);
			g.stroke({ color: C.grass, width: 1, alpha: 0.4 });
		}

		// Камешки
		for (let i = 0; i < 26; i++) {
			const x = Math.random() * W;
			const y = Math.random() * H;

			if (x > B && x < W - B && y > B && y < H - B) {
				continue;
			}

			g.circle(x, y, 1 + Math.random() * 1.5).fill({ color: C.stone, alpha: 0.5 });
		}

		// ===== Вода с органической кромкой =====
		const shore = this.buildShore(W, H, B);
		g.poly(this.flatPoly(shore)).fill(C.waterMid);

		// Толща воды
		g.rect(B + 5, B + 5, W - B * 2 - 10, (H - B * 2) * 0.4).fill({
			color: C.waterLight,
			alpha: 0.4
		});

		g.rect(B + 5, H - B - 5 - (H - B * 2) * 0.35, W - B * 2 - 10, (H - B * 2) * 0.35).fill({
			color: C.waterDark,
			alpha: 0.4
		});

		// Солнечное пятно
		const sx = W * 0.35;
		const sy = B + cellSize * 1.2;

		g.circle(sx, sy, H * 0.5).fill({ color: C.sun, alpha: 0.05 });
		g.circle(sx, sy, H * 0.3).fill({ color: C.sun, alpha: 0.06 });
		g.circle(sx, sy, H * 0.14).fill({ color: 0xfff8d0, alpha: 0.07 });

		// Пятна ила
		for (let i = 0; i < 8; i++) {
			const x = B * 2 + Math.random() * Math.max(1, W - B * 4);
			const y = B * 2 + Math.random() * Math.max(1, H - B * 4);

			g.ellipse(x, y, 12 + Math.random() * 10, 8 + Math.random() * 6).fill({
				color: C.mud,
				alpha: 0.08
			});
		}

		// Рябь
		for (let j = 0; j < 8; j++) {
			const y0 = B + 8 + (H - B * 2 - 16) * (j / 7);

			g.moveTo(B + 8, y0 + Math.sin((B + 8) * 0.035 + j * 1.3) * 2);

			for (let x = B + 18; x <= W - B - 8; x += 10) {
				g.lineTo(x, y0 + Math.sin(x * 0.035 + j * 1.3) * 2);
			}

			g.stroke({ color: C.grid, width: 1.2, alpha: 0.05 });
		}

		// Сетка
		for (let c = 1; c < grid.cols - 1; c++) {
			g.moveTo(c * cellSize + 0.5, B + 2).lineTo(c * cellSize + 0.5, H - B - 2);
		}

		for (let r = 1; r < grid.rows - 1; r++) {
			g.moveTo(B + 2, r * cellSize + 0.5).lineTo(W - B - 2, r * cellSize + 0.5);
		}

		g.stroke({ color: C.grid, width: 1, alpha: 0.055 });

		// Берег
		g.poly(this.flatPoly(shore)).stroke({ color: C.shoreDark, width: 2.5, alpha: 0.45 });
		g.poly(this.flatPoly(this.offsetPoly(shore, -2.5))).stroke({
			color: C.shoreLight,
			width: 1,
			alpha: 0.4
		});

		// Травинки из кромки воды
		for (let i = 0; i < 20; i++) {
			const p = shore[Math.floor(Math.random() * shore.length)];

			if (p === undefined) {
				continue;
			}

			const dx = W / 2 - p.x;
			const dy = H / 2 - p.y;
			const dl = Math.hypot(dx, dy) || 1;

			const ox = p.x + (dx / dl) * 4;
			const oy = p.y + (dy / dl) * 4;

			g.moveTo(ox, oy).lineTo(ox + (Math.random() - 0.5) * 6, oy - 4 - Math.random() * 4);
			g.stroke({ color: C.grassWater, width: 1.2, alpha: 0.6 });
		}

		// Виньетка
		g.rect(0, 0, W, H).stroke({ color: C.vignette, width: 48, alpha: 0.14 });
	}

	private buildShore(W: number, H: number, B: number): { x: number; y: number }[] {
		const pts: { x: number; y: number }[] = [];
		const step = 8;

		for (let x = B; x <= W - B; x += step) {
			pts.push({ x, y: B + Math.sin(x * 0.07) * 2.5 + Math.sin(x * 0.17) * 1.2 });
		}

		for (let y = B; y <= H - B; y += step) {
			pts.push({
				x: W - B + Math.sin(y * 0.08 + 2.3) * 2.5 + Math.sin(y * 0.14 + 0.8) * 1.2,
				y
			});
		}

		for (let x = W - B; x >= B; x -= step) {
			pts.push({ x, y: H - B + Math.sin(x * 0.08 + 2) * 2.5 + Math.sin(x * 0.15 + 1) * 1.2 });
		}

		for (let y = H - B; y >= B; y -= step) {
			pts.push({ x: B + Math.sin(y * 0.07 + 0.5) * 2.5 + Math.sin(y * 0.16) * 1.2, y });
		}

		return pts;
	}

	private offsetPoly(pts: { x: number; y: number }[], off: number): { x: number; y: number }[] {
		const out: { x: number; y: number }[] = [];

		for (let i = 0; i < pts.length; i++) {
			const p = pts[i];
			const nx = pts[(i + 1) % pts.length];

			if (p === undefined || nx === undefined) {
				continue;
			}

			const dx = nx.x - p.x;
			const dy = nx.y - p.y;
			const len = Math.hypot(dx, dy) || 1;

			out.push({ x: p.x - (dy / len) * off, y: p.y + (dx / len) * off });
		}

		return out;
	}

	private flatPoly(pts: { x: number; y: number }[]): number[] {
		const flat: number[] = [];

		for (const p of pts) {
			flat.push(p.x, p.y);
		}

		return flat;
	}
}