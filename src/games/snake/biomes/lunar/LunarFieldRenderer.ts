import type { Graphics } from 'pixi.js';
import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import type { FieldRenderer } from '../renderers.js';
import { C } from './LunarPalette.js';

/**
 * Вариант C: контур воды строится от границы стены.
 *
 * - Контур ломаный, привязан к клеткам стены.
 * - Выступы идут в сторону стены, а не в воду.
 * - Поэтому вода всегда покрывает внутреннюю прямоугольную область.
 * - Сетка в воде рисуется отдельно и остаётся ровной.
 */
export class LunarFieldRenderer implements FieldRenderer {
	public render(g: Graphics, grid: GridBitmask, cellSize: number): void {
		const W = grid.cols * cellSize;
		const H = grid.rows * cellSize;
		const B = cellSize;

		// ===== Стена: базовый камень =====
		g.rect(0, 0, W, H).fill(C.shore0);

		g.rect(0, 0, W, H * 0.45).fill({
			color: C.shoreLight,
			alpha: 0.22
		});

		g.rect(0, H * 0.55, W, H * 0.45).fill({
			color: C.shoreDark,
			alpha: 0.35
		});

		// ===== Текстура стены по клеткам =====
		this.renderShoreTexture(g, grid, cellSize);

		// ===== Внутренний контур воды, построенный от стены =====
		const shore = this.buildWallContour(grid, cellSize);
		const shoreFlat = this.flatPoly(shore);

		// ===== Вода =====
		g.poly(shoreFlat).fill(C.water1);

		// Толща воды.
		g.rect(B + 4, B + 4, W - B * 2 - 8, (H - B * 2) * 0.4).fill({
			color: C.waterLight,
			alpha: 0.35
		});

		g.rect(
			B + 4,
			H - B - 4 - (H - B * 2) * 0.35,
			W - B * 2 - 8,
			(H - B * 2) * 0.35
		).fill({
			color: C.water2,
			alpha: 0.35
		});

		// ===== Сетка в воде =====
		// Ровная, по клеткам, не привязана к органическому контуру.
		this.renderGrid(g, grid, cellSize);

		// ===== Декор воды =====
		this.renderWaterDecor(g, shore, W, H, B);

		// ===== Кромка воды / срез стены =====
		g.poly(shoreFlat).stroke({
			color: C.water2,
			width: 6,
			alpha: 0.35,
			join: 'round'
		});

		g.poly(shoreFlat).stroke({
			color: C.shoreDark,
			width: 3,
			alpha: 0.8,
			join: 'round'
		});

		g.poly(shoreFlat).stroke({
			color: C.shoreLight,
			width: 1.2,
			alpha: 0.6,
			join: 'round'
		});

		// ===== Виньетка =====
		g.rect(0, 0, W, H).stroke({
			color: C.vignette,
			width: 48,
			alpha: 0.3
		});
	}

	// ===== Текстура стены: рисуем по клеткам, где реально есть стена =====
	private renderShoreTexture(
		g: Graphics,
		grid: GridBitmask,
		cellSize: number
	): void {
		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				if (!grid.isWall(col, row)) {
					continue;
				}

				const x0 = col * cellSize;
				const y0 = row * cellSize;

				// Мелкий каменный шум.
				for (let i = 0; i < 4; i++) {
					const x = x0 + this.cellRandom(col, row, i * 3.1) * cellSize;
					const y = y0 + this.cellRandom(col, row, i * 5.7) * cellSize;
					const r = 0.4 + this.cellRandom(col, row, i * 7.3) * 1.4;

					g.circle(x, y, r).fill({
						color: i % 2 === 0 ? C.stoneDark : C.stoneLight,
						alpha: 0.16
					});
				}

				// Камни.
				for (let i = 0; i < 2; i++) {
					const x =
						x0 + 4 + this.cellRandom(col, row, i * 11.7) * (cellSize - 8);
					const y =
						y0 + 4 + this.cellRandom(col, row, i * 13.1) * (cellSize - 8);

					const rx = 1.5 + this.cellRandom(col, row, i * 17.3) * 2.6;
					const ry = 0.9 + this.cellRandom(col, row, i * 19.7) * 1.8;

					g.ellipse(x + 1, y + 1.5, rx, ry).fill({
						color: 0x1a2535,
						alpha: 0.4
					});

					g.ellipse(x, y, rx, ry).fill({
						color: i % 2 === 0 ? C.stone : C.stoneDark,
						alpha: 0.55
					});

					g.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.4, ry * 0.4).fill({
						color: C.stoneLight,
						alpha: 0.3
					});
				}

				// Трещина.
				{
					let cx = x0 + 3 + this.cellRandom(col, row, 23.1) * (cellSize - 6);
					let cy = y0 + 3 + this.cellRandom(col, row, 29.3) * (cellSize - 6);

					g.moveTo(cx, cy);

					const len = 3 + Math.floor(this.cellRandom(col, row, 31.7) * 3);

					for (let j = 0; j < len; j++) {
						cx += (this.cellRandom(col, row, 37.1 + j * 7.3) - 0.5) * 7;
						cy += (this.cellRandom(col, row, 41.3 + j * 11.9) - 0.5) * 7;

						cx = Math.max(x0 + 1, Math.min(x0 + cellSize - 1, cx));
						cy = Math.max(y0 + 1, Math.min(y0 + cellSize - 1, cy));

						g.lineTo(cx, cy);
					}

					g.stroke({
						color: C.cracks,
						width: 0.6,
						alpha: 0.4
					});
				}

				// Мох у края, обращённого к воде.
				const neighbors: Array<[number, number]> = [
					[col, row + 1],
					[col, row - 1],
					[col + 1, row],
					[col - 1, row]
				];

				for (const [nc, nr] of neighbors) {
					if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows) {
						continue;
					}

					if (!grid.isWall(nc, nr)) {
						const mx =
							x0 + cellSize / 2 + (nc - col) * (cellSize * 0.5 - 2);
						const my =
							y0 + cellSize / 2 + (nr - row) * (cellSize * 0.5 - 2);

						g.circle(
							mx,
							my,
							0.8 + this.cellRandom(col, row, 47.7) * 1.2
						).fill({
							color: C.moss,
							alpha: 0.35
						});
					}
				}
			}
		}
	}

	// ===== Контур воды от границы стены =====
	//
	// Контур идёт по внутренней границе стены,
	// но ломаными выступами "съедает" часть стены.
	// Внутрь воды выступы не идут, поэтому сетка остаётся в воде.
	private buildWallContour(
		grid: GridBitmask,
		cellSize: number
	): { x: number; y: number }[] {
		const W = grid.cols * cellSize;
		const H = grid.rows * cellSize;
		const B = cellSize;

		const pts: { x: number; y: number }[] = [];
		const step = cellSize / 2;

		// Верхний левый угол.
		pts.push({ x: B, y: B });

		// Верхняя стена: выступы вверх, в стену.
		for (let x = B + step; x <= W - B - step; x += step) {
			const out = this.wallBite(x, 0.7, cellSize);
			pts.push({ x, y: B - out });
		}

		// Верхний правый угол.
		pts.push({ x: W - B, y: B });

		// Правая стена: выступы вправо, в стену.
		for (let y = B + step; y <= H - B - step; y += step) {
			const out = this.wallBite(y, 2.3, cellSize);
			pts.push({ x: W - B + out, y });
		}

		// Нижний правый угол.
		pts.push({ x: W - B, y: H - B });

		// Нижняя стена: выступы вниз, в стену.
		for (let x = W - B - step; x >= B + step; x -= step) {
			const out = this.wallBite(x, 4.1, cellSize);
			pts.push({ x, y: H - B + out });
		}

		// Нижний левый угол.
		pts.push({ x: B, y: H - B });

		// Левая стена: выступы влево, в стену.
		for (let y = H - B - step; y >= B + step; y -= step) {
			const out = this.wallBite(y, 6.2, cellSize);
			pts.push({ x: B - out, y });
		}

		return pts;
	}

	// Ломаный "откус" стены.
	// Квантование даёт не плавную синусоиду, а скалистые ступени.
	private wallBite(t: number, seed: number, cellSize: number): number {
		const n =
			Math.sin(t * 0.11 + seed) * 0.45 +
			Math.sin(t * 0.31 + seed * 1.7) * 0.35 +
			Math.sin(t * 0.83 + seed * 0.6) * 0.2;

		const normalized = (n + 1) / 2;
		const quantized = Math.floor(normalized * 3) / 3;

		return quantized * cellSize * 0.5;
	}

	// ===== Ровная сетка в воде =====
	//
	// Сетка не следует за контуром.
	// Она рисуется прямыми линиями по клеткам внутренней области.
	private renderGrid(
		g: Graphics,
		grid: GridBitmask,
		cellSize: number
	): void {
		const W = grid.cols * cellSize;
		const H = grid.rows * cellSize;
		const B = cellSize;

		for (let c = 1; c < grid.cols - 1; c++) {
			const x = c * cellSize;
			g.moveTo(x + 0.5, B).lineTo(x + 0.5, H - B);
		}

		for (let r = 1; r < grid.rows - 1; r++) {
			const y = r * cellSize;
			g.moveTo(B, y + 0.5).lineTo(W - B, y + 0.5);
		}

		g.stroke({
			color: C.grid,
			width: 1,
			alpha: 0.05
		});
	}

	// ===== Декор воды =====
	private renderWaterDecor(
		g: Graphics,
		shore: { x: number; y: number }[],
		W: number,
		H: number,
		B: number
	): void {
		// Лунное свечение.
		g.circle(W * 0.5, B, H * 0.7).fill({ color: C.glowTop, alpha: 0.06 });
		g.circle(W * 0.5, B, H * 0.35).fill({ color: C.glowMid, alpha: 0.03 });
		g.circle(W * 0.5, H - B, H * 0.5).fill({ color: C.glowBottom, alpha: 0.12 });

		// Звёзды в воде.
		for (let i = 0; i < 25; i++) {
			const x = B + 8 + Math.random() * Math.max(1, W - B * 2 - 16);
			const y = B + 8 + Math.random() * Math.max(1, H - B * 2 - 16);

			g.circle(x, y, 0.9).fill({ color: C.star, alpha: 0.08 });
		}

		// Лунная дорожка.
		{
			const ax = W * 0.85;
			const ay = B + 10;
			const bx = W * 0.35;
			const by = H - B - 10;

			const dx = bx - ax;
			const dy = by - ay;
			const dl = Math.hypot(dx, dy) || 1;

			const nx = -dy / dl;
			const ny = dx / dl;

			const wA = W * 0.04;
			const wB = W * 0.1;

			g.moveTo(ax + nx * wA, ay + ny * wA)
				.lineTo(bx + nx * wB, by + ny * wB)
				.lineTo(bx - nx * wB, by - ny * wB)
				.lineTo(ax - nx * wA, ay - ny * wA)
				.closePath()
				.fill({ color: C.path, alpha: 0.03 });
		}

		// Кувшинки.
		for (let i = 0; i < 5; i++) {
			const p = shore[Math.floor(Math.random() * shore.length)];

			if (p === undefined) {
				continue;
			}

			const dx = W / 2 - p.x;
			const dy = H / 2 - p.y;
			const dl = Math.hypot(dx, dy) || 1;

			const lx = p.x + (dx / dl) * (16 + Math.random() * 24);
			const ly = p.y + (dy / dl) * (16 + Math.random() * 24);

			const r = 5 + Math.random() * 4;
			const a0 = Math.random() * Math.PI * 2;

			g.moveTo(lx, ly);
			g.arc(lx, ly, r, a0 + 0.5, a0 + Math.PI * 2 - 0.5);
			g.closePath().fill({ color: C.lily, alpha: 0.92 });

			g.arc(lx, ly, r, 0, Math.PI * 2).stroke({
				color: C.lilyEdge,
				width: 1,
				alpha: 0.7
			});

			if (i < 2) {
				g.circle(lx, ly, 3.4).fill({ color: C.flower, alpha: 0.15 });
				g.circle(lx, ly, 1).fill({ color: C.flowerCore, alpha: 0.9 });
			}
		}

		// Рябь.
		for (let j = 0; j < 9; j++) {
			const y0 = B + 10 + (H - B * 2 - 20) * (j / 8);

			g.moveTo(B + 10, y0);

			for (let x = B + 18; x <= W - B - 8; x += 10) {
				g.lineTo(x, y0 + Math.sin(x * 0.04 + j * 1.7) * 1.8);
			}

			g.stroke({
				color: C.path,
				width: 1.2,
				alpha: 0.06
			});
		}
	}

	private flatPoly(pts: { x: number; y: number }[]): number[] {
		const flat: number[] = [];

		for (const p of pts) {
			flat.push(p.x, p.y);
		}

		return flat;
	}

	private cellRandom(col: number, row: number, salt: number): number {
		const x =
			Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
		return x - Math.floor(x);
	}
}