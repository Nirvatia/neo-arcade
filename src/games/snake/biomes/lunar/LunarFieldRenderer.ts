import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import type { FieldRenderer } from '../contract/renderers.js';
import { C } from './LunarPalette.js';
import {
	fillCircle,
	fillEllipse,
	fillRect,
	rgba,
	strokePolyPoints
} from '../../canvas/canvasDraw.js';
import { GridConfig } from '../../config/index.js';

const TAU = Math.PI * 2;

/**
 * Детерминированный хэш для декораций.
 *
 * Важно: в статичном поле больше нет Math.random().
 * Поле запекается в GridView, и его освещение не должно
 * меняться случайным образом при пересоздании фона.
 */
function hash01(seed: number): number {
	const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

/**
 * Lunar Field Renderer.
 *
 * Новое освещение:
 * - мягкий радиальный лунный свет;
 * - широкий отражающий градиент вместо жёсткой лунной дорожки;
 * - детерминированные световые пятна;
 * - вода клиппится по береговому контуру;
 * - радиальная виньетка без угловых артефактов.
 */
export class LunarFieldRenderer implements FieldRenderer {
	public render(ctx: CanvasRenderingContext2D, grid: GridBitmask, cellSize: number): void {
		const W = grid.cols * cellSize;
		const H = grid.rows * cellSize;
		const B = cellSize;

		const seed = this.gridSeed(cellSize);

		// Берег.
		this.renderShoreBase(ctx, W, H, B);
		this.renderShoreTexture(ctx, grid, cellSize);

		// Вода и освещение.
		const shore = this.buildWallContour(grid, cellSize);
		this.renderWater(ctx, shore, W, H, B, seed, cellSize);

		// Навигационная сетка.
		this.renderGrid(ctx, grid, cellSize);

		// Кромка берега.
		this.renderShoreEdge(ctx, shore, cellSize);

		// Мягкая радиальная виньетка.
		this.renderVignette(ctx, W, H);
	}

	private renderShoreBase(ctx: CanvasRenderingContext2D, W: number, H: number, B: number): void {
		// База камня.
		fillRect(ctx, 0, 0, W, H, C.shore0);

		// Вертикальный градиент берега.
		const shoreGradient = ctx.createLinearGradient(0, 0, 0, H);
		shoreGradient.addColorStop(0, rgba(C.shoreLight, 0.2));
		shoreGradient.addColorStop(0.45, rgba(C.shore0, 0));
		shoreGradient.addColorStop(1, rgba(C.shoreDark, 0.38));

		ctx.fillStyle = shoreGradient;
		ctx.fillRect(0, 0, W, H);

		// Очень слабый верхний лунный свет на камне.
		fillRect(ctx, 0, 0, W, B * 0.8, C.moon, 0.02);

		// Нижнее затенение берега.
		fillRect(ctx, 0, H - B * 0.9, W, B * 0.9, C.vignette, 0.1);
	}

	private renderShoreTexture(
		ctx: CanvasRenderingContext2D,
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
				for (let i = 0; i < 3; i++) {
					const x = x0 + this.cellRandom(col, row, i * 3.1) * cellSize;
					const y = y0 + this.cellRandom(col, row, i * 5.7) * cellSize;
					const r = 0.4 + this.cellRandom(col, row, i * 7.3) * 1.2;

					fillCircle(ctx, x, y, r, i % 2 === 0 ? C.stoneDark : C.stoneLight, 0.14);
				}

				// Камни.
				for (let i = 0; i < 2; i++) {
					const x = x0 + 4 + this.cellRandom(col, row, i * 11.7) * (cellSize - 8);
					const y = y0 + 4 + this.cellRandom(col, row, i * 13.1) * (cellSize - 8);

					const rx = 1.5 + this.cellRandom(col, row, i * 17.3) * 2.4;
					const ry = 0.9 + this.cellRandom(col, row, i * 19.7) * 1.6;

					// Тень камня.
					fillEllipse(ctx, x + 1, y + 1.5, rx, ry, 0x1a2535, 0.38);

					// Тело камня.
					fillEllipse(ctx, x, y, rx, ry, i % 2 === 0 ? C.stone : C.stoneDark, 0.52);

					// Блик.
					fillEllipse(ctx, x - rx * 0.3, y - ry * 0.3, rx * 0.4, ry * 0.4, C.stoneLight, 0.28);
				}

				// Трещина.
				{
					let cx = x0 + 3 + this.cellRandom(col, row, 23.1) * (cellSize - 6);
					let cy = y0 + 3 + this.cellRandom(col, row, 29.3) * (cellSize - 6);

					ctx.beginPath();
					ctx.moveTo(cx, cy);

					const len = 3 + Math.floor(this.cellRandom(col, row, 31.7) * 3);

					for (let j = 0; j < len; j++) {
						cx += (this.cellRandom(col, row, 37.1 + j * 7.3) - 0.5) * 7;
						cy += (this.cellRandom(col, row, 41.3 + j * 11.9) - 0.5) * 7;

						cx = Math.max(x0 + 1, Math.min(x0 + cellSize - 1, cx));
						cy = Math.max(y0 + 1, Math.min(y0 + cellSize - 1, cy));

						ctx.lineTo(cx, cy);
					}

					ctx.strokeStyle = rgba(C.cracks, 0.36);
					ctx.lineWidth = 0.65;
					ctx.stroke();
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
						const mx = x0 + cellSize / 2 + (nc - col) * (cellSize * 0.5 - 2);
						const my = y0 + cellSize / 2 + (nr - row) * (cellSize * 0.5 - 2);

						fillCircle(ctx, mx, my, 0.8 + this.cellRandom(col, row, 47.7) * 1.2, C.moss, 0.34);
					}
				}
			}
		}
	}

	private renderWater(
		ctx: CanvasRenderingContext2D,
		shore: { x: number; y: number }[],
		W: number,
		H: number,
		B: number,
		seed: number,
		cellSize: number
	): void {
		if (shore.length < 3) {
			return;
		}

		// Базовая вода.
		this.traceShore(ctx, shore);

		const waterBase = ctx.createLinearGradient(0, B, 0, H - B);
		waterBase.addColorStop(0, rgba(C.waterLight, 0.96));
		waterBase.addColorStop(0.3, rgba(C.water1, 1));
		waterBase.addColorStop(1, rgba(C.water2, 1));

		ctx.fillStyle = waterBase;
		ctx.fill();

		// Всё освещение воды клиппим по берегу.
		ctx.save();
		this.traceShore(ctx, shore);
		ctx.clip();

		// Градиент глубины.
		const depth = ctx.createLinearGradient(0, B, 0, H - B);
		depth.addColorStop(0, rgba(C.waterLight, 0.1));
		depth.addColorStop(0.45, rgba(C.water0, 0));
		depth.addColorStop(1, rgba(C.water2, 0.5));

		ctx.fillStyle = depth;
		ctx.fillRect(0, 0, W, H);

		// Основной лунный свет.
		const moonX = W * 0.5;
		const moonY = B * 0.8;
		const moonRadius = Math.max(W, H) * 0.65;

		const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius);

		moonGlow.addColorStop(0, rgba(C.glowTop, 0.2));
		moonGlow.addColorStop(0.35, rgba(C.glowMid, 0.07));
		moonGlow.addColorStop(1, rgba(C.glowTop, 0));

		ctx.fillStyle = moonGlow;
		ctx.fillRect(0, 0, W, H);

		// Широкое отражение луны.
		// Не узкий луч, а мягкая вертикальная зона.
		const bandWidth = W * 0.16;
		const bandX = W * 0.5;

		const reflection = ctx.createLinearGradient(bandX - bandWidth, 0, bandX + bandWidth, 0);

		reflection.addColorStop(0, rgba(C.path, 0));
		reflection.addColorStop(0.5, rgba(C.path, 0.05));
		reflection.addColorStop(1, rgba(C.path, 0));

		ctx.fillStyle = reflection;
		ctx.fillRect(bandX - bandWidth, B, bandWidth * 2, (H - B * 2) * 0.72);

		// Нижняя глубина.
		const abyss = ctx.createLinearGradient(0, H - B * 3, 0, H - B);
		abyss.addColorStop(0, rgba(C.water2, 0));
		abyss.addColorStop(1, rgba(C.water2, 0.4));

		ctx.fillStyle = abyss;
		ctx.fillRect(0, H - B * 3, W, B * 2);

		// Позиции привязаны к центру мира, а не к текущему размеру поля.
		const centerX = W / 2;
		const centerY = H / 2;
		const worldW = GridConfig.MAX_COLS * cellSize;
		const worldH = GridConfig.MAX_ROWS * cellSize;

		for (let i = 0; i < 12; i++) {
			const nx = hash01(seed + i * 17.7) - 0.5;
			const ny = hash01(seed + i * 29.3) - 0.5;

			const px = centerX + nx * worldW * 0.72;
			const py = centerY + ny * worldH * 0.72;

			if (px < B || px > W - B || py < B || py > H - B) {
				continue;
			}

			const pr = cellSize * (2.2 + hash01(seed + i * 41.1) * 2.6);

			const pool = ctx.createRadialGradient(px, py, 0, px, py, pr);
			pool.addColorStop(0, rgba(C.glowMid, 0.03));
			pool.addColorStop(1, rgba(C.glowMid, 0));
			ctx.fillStyle = pool;
			ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
		}

		// Позиции также привязаны к центру мира.
		for (let i = 0; i < 36; i++) {
			const nx = hash01(seed + i * 53.7) - 0.5;
			const ny = hash01(seed + i * 61.3) - 0.5;

			const x = centerX + nx * worldW * 0.8;
			const y = centerY + ny * worldH * 0.8;

			if (x < B + 8 || x > W - B - 8 || y < B + 8 || y > H - B - 8) {
				continue;
			}

			const alpha = 0.02 + hash01(seed + i * 71.9) * 0.04;
			fillCircle(ctx, x, y, 0.8, C.star, alpha);
		}

		// Кувшинки.
		this.renderLilyPads(ctx, shore, W, H, seed, cellSize);

		ctx.restore();
	}

	private renderLilyPads(
		ctx: CanvasRenderingContext2D,
		shore: { x: number; y: number }[],
		W: number,
		H: number,
		seed: number,
		cellSize: number
	): void {
		for (let i = 0; i < 3; i++) {
			const h1 = hash01(seed + i * 97.1);
			const shoreIndex = Math.floor(h1 * shore.length);
			const shorePoint = shore[shoreIndex];

			if (shorePoint === undefined) {
				continue;
			}

			const dx = W / 2 - shorePoint.x;
			const dy = H / 2 - shorePoint.y;
			const dl = Math.hypot(dx, dy) || 1;

			const distance = cellSize * (0.8 + hash01(seed + i * 103.7) * 1.4);

			const lx = shorePoint.x + (dx / dl) * distance;
			const ly = shorePoint.y + (dy / dl) * distance;

			const r = cellSize * (0.16 + hash01(seed + i * 113.9) * 0.12);
			const angle = hash01(seed + i * 127.7) * TAU;

			// Тень под кувшинкой.
			fillEllipse(ctx, lx + 1, ly + 2, r * 1.05, r * 0.8, C.water2, 0.22);

			// Лист с вырезом.
			ctx.beginPath();
			ctx.moveTo(lx, ly);
			ctx.arc(lx, ly, r, angle + 0.5, angle + TAU - 0.5);
			ctx.closePath();

			ctx.fillStyle = rgba(C.lily, 0.92);
			ctx.fill();

			ctx.strokeStyle = rgba(C.lilyEdge, 0.6);
			ctx.lineWidth = 1;
			ctx.stroke();

			// Цветок только на одной кувшинке.
			if (i === 0) {
				fillCircle(ctx, lx, ly, r * 0.35, C.flower, 0.14);
				fillCircle(ctx, lx, ly, r * 0.14, C.flowerCore, 0.9);
			}
		}
	}

	private renderGrid(ctx: CanvasRenderingContext2D, grid: GridBitmask, cellSize: number): void {
		const W = grid.cols * cellSize;
		const H = grid.rows * cellSize;
		const B = cellSize;

		ctx.beginPath();

		for (let c = 1; c < grid.cols - 1; c++) {
			const x = c * cellSize;
			ctx.moveTo(x + 0.5, B);
			ctx.lineTo(x + 0.5, H - B);
		}

		for (let r = 1; r < grid.rows - 1; r++) {
			const y = r * cellSize;
			ctx.moveTo(B, y + 0.5);
			ctx.lineTo(W - B, y + 0.5);
		}

		ctx.strokeStyle = rgba(C.grid, 0.03);
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	private renderShoreEdge(
		ctx: CanvasRenderingContext2D,
		shore: { x: number; y: number }[],
		cellSize: number
	): void {
		if (shore.length < 3) {
			return;
		}

		// Мягкая внутренняя тень воды у берега.
		strokePolyPoints(ctx, shore, C.water2, Math.max(4, cellSize * 0.16), 0.24, 'round');

		// Каменная кромка.
		strokePolyPoints(ctx, shore, C.shoreDark, 3, 0.8, 'round');

		// Светлый край.
		strokePolyPoints(ctx, shore, C.shoreLight, 1.2, 0.55, 'round');

		// Лёгкий лунный блик на кромке.
		strokePolyPoints(ctx, shore, C.moon, 1, 0.05, 'round');
	}

	private renderVignette(ctx: CanvasRenderingContext2D, W: number, H: number): void {
		const cx = W / 2;
		const cy = H / 2;
		const maxRadius = Math.hypot(W, H) / 2;

		const vignette = ctx.createRadialGradient(cx, cy, maxRadius * 0.42, cx, cy, maxRadius);

		vignette.addColorStop(0, rgba(C.vignette, 0));
		vignette.addColorStop(1, rgba(C.vignette, 0.42));

		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, W, H);
	}

	private traceShore(ctx: CanvasRenderingContext2D, shore: { x: number; y: number }[]): void {
		const first = shore[0];

		if (first === undefined) {
			return;
		}

		ctx.beginPath();
		ctx.moveTo(first.x, first.y);

		for (let i = 1; i < shore.length; i++) {
			const point = shore[i];

			if (point === undefined) {
				continue;
			}

			ctx.lineTo(point.x, point.y);
		}

		ctx.closePath();
	}

	private buildWallContour(grid: GridBitmask, cellSize: number): { x: number; y: number }[] {
		const W = grid.cols * cellSize;
		const H = grid.rows * cellSize;
		const B = cellSize;

		const points: { x: number; y: number }[] = [];
		const step = cellSize / 2;

		// Верхний левый угол.
		points.push({ x: B, y: B });

		// Верхняя стена.
		for (let x = B + step; x <= W - B - step; x += step) {
			const out = this.wallBite(x, 0.7, cellSize);
			points.push({ x, y: B - out });
		}

		// Верхний правый угол.
		points.push({ x: W - B, y: B });

		// Правая стена.
		for (let y = B + step; y <= H - B - step; y += step) {
			const out = this.wallBite(y, 2.3, cellSize);
			points.push({ x: W - B + out, y });
		}

		// Нижний правый угол.
		points.push({ x: W - B, y: H - B });

		// Нижняя стена.
		for (let x = W - B - step; x >= B + step; x -= step) {
			const out = this.wallBite(x, 4.1, cellSize);
			points.push({ x, y: H - B + out });
		}

		// Нижний левый угол.
		points.push({ x: B, y: H - B });

		// Левая стена.
		for (let y = H - B - step; y >= B + step; y -= step) {
			const out = this.wallBite(y, 6.2, cellSize);
			points.push({ x: B - out, y });
		}

		return points;
	}

	/**
	 * Органичный контур стены.
	 *
	 * Без жёсткого квантования, чтобы берег не выглядел
	 * как пиксельные ступени.
	 */
	private wallBite(t: number, seed: number, cellSize: number): number {
		const n =
			Math.sin(t * 0.085 + seed) * 0.5 +
			Math.sin(t * 0.23 + seed * 1.7) * 0.3 +
			Math.sin(t * 0.61 + seed * 0.6) * 0.2;

		const normalized = (n + 1) / 2;
		const smooth = normalized * normalized * (3 - 2 * normalized);

		return smooth * cellSize * 0.34;
	}

	private cellRandom(col: number, row: number, salt: number): number {
		const x = Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
		return x - Math.floor(x);
	}

	private gridSeed(cellSize: number): number {
		let h = 2166136261;

		// Фиксированный базовый сид, чтобы поле не «пересобиралось»
		// визуально при каждом расширении.
		h = Math.imul(h ^ 0x5eed, 16777619);
		h = Math.imul(h ^ cellSize, 16777619);

		return h >>> 0;
	}
}
