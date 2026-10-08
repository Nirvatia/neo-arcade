import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import type { ExitRenderer } from '../contract/renderers.js';
import { C } from './LunarPalette.js';
import { fillCircle, rgba, strokeCircle } from '../../canvas/canvasDraw.js';

const TAU = Math.PI * 2;

function seededRandom(i: number): number {
	const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

/**
 * Lunar Exit Renderer — ВОДОВОРОТ.
 *
 * Цвета воды (синий/тёмный), не розовый.
 * Спиральные рукава сходятся в тёмный центр-воронку.
 */
export class LunarExitRenderer implements ExitRenderer {
	public render(
		ctx: CanvasRenderingContext2D,
		grid: GridBitmask,
		timeMS: number,
		cellSize: number
	): void {
		const t = timeMS * 0.001;

		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				if (!grid.isExit(col, row)) {
					continue;
				}
				const cx = col * cellSize + cellSize / 2;
				const cy = row * cellSize + cellSize / 2;
				const r = cellSize * 0.7;
				this.drawWhirlpool(ctx, cx, cy, t, r);
			}
		}
	}

	private drawWhirlpool(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		t: number,
		r: number
	): void {
		const pulse = 0.5 + 0.5 * Math.sin(t * 1.3);

		// Тёмная воронка-углубление.
		fillCircle(ctx, cx, cy, r * 1.3, C.water2, 0.55);
		fillCircle(ctx, cx, cy, r * 1.0, C.water1, 0.4);

		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// Спиральные рукава, сходящиеся к центру.
		for (let arm = 0; arm < 3; arm++) {
			const off = (arm * TAU) / 3;
			const alpha = 0.4 - arm * 0.09;
			const width = 2.6 - arm * 0.5;

			ctx.beginPath();
			for (let i = 0; i <= 56; i++) {
				const p = i / 56;
				const ang = p * TAU * 1.8 + t * 1.5 + off;
				const rr = r * (1 - p * 0.88);
				const x = cx + Math.cos(ang) * rr;
				const y = cy + Math.sin(ang) * rr * 0.92;
				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}
			ctx.strokeStyle = rgba(C.path, alpha);
			ctx.lineWidth = width;
			ctx.stroke();
		}

		// Лёгкие концентрические кольца.
		for (let k = 0; k < 3; k++) {
			const rr = r * (0.35 + k * 0.2);
			const a = 0.05 + 0.02 * Math.sin(t * 1.2 + k * 1.7);
			strokeCircle(ctx, cx, cy, rr, C.path, 1, a);
		}

		// Частицы, затягиваемые в воронку.
		for (let i = 0; i < 10; i++) {
			const speed = 0.26 + seededRandom(i) * 0.3;
			const p = (t * speed + seededRandom(i + 9)) % 1;
			const ang = seededRandom(i + 20) * TAU + t * 1.5 + p * TAU * 1.4;
			const rr = r * (1 - p) * 0.88;
			const x = cx + Math.cos(ang) * rr;
			const y = cy + Math.sin(ang) * rr * 0.92;
			const size = 1.3 * (1 - p) + 0.4;
			fillCircle(ctx, x, y, size, C.moon, 0.45 * (1 - p));
		}

		// Тёмный центр — слив.
		fillCircle(ctx, cx, cy, r * 0.26, C.water2, 0.85);
		fillCircle(ctx, cx, cy, r * 0.13, 0x020408, 0.9);

		// Светлый ободок воронки.
		strokeCircle(ctx, cx, cy, r * 0.26, C.path, 1.4, 0.5 + pulse * 0.2);
	}
}