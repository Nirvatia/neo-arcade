import type { Graphics } from 'pixi.js';
import type { GridBitmask } from '../../logic/grid/GridBitmask.js';
import type { ExitRenderer } from '../renderers.js';
import { C } from './LunarPalette.js';

const TAU = Math.PI * 2;

function seededRandom(i: number): number {
	const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

/**
 * Выход Лунной Лагуны.
 *
 * Водоворот с тёмно-водной подложкой, без чёрной дыры.
 * Читается за счёт контраста воды и лунных спиралей.
 */
export class LunarExitRenderer implements ExitRenderer {
	public render(
		g: Graphics,
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

				this.drawMaelstrom(g, cx, cy, t, r);
			}
		}
	}

	private drawMaelstrom(
		g: Graphics,
		cx: number,
		cy: number,
		t: number,
		r: number
	): void {
		const pulse = 0.5 + 0.5 * Math.sin(t * 1.35);

		// Подложка: тёмная вода, не чёрный фон.
		g.circle(cx, cy, r * 1.28).fill({
			color: C.path,
			alpha: 0.025 + pulse * 0.012
		});

		g.circle(cx, cy, r * 1.05).fill({
			color: C.water2,
			alpha: 0.34
		});

		g.circle(cx, cy, r * 0.66).fill({
			color: C.water0,
			alpha: 0.24
		});

		g.circle(cx, cy, r * 0.34).fill({
			color: C.water1,
			alpha: 0.18
		});

		// Внешнее кольцо, чтобы водоворот не сливался с водой.
		g.circle(cx, cy, r * 1.05).stroke({
			color: C.path,
			width: 1.4,
			alpha: 0.16 + pulse * 0.08
		});

		// Три спиральных рукава.
		for (let arm = 0; arm < 3; arm++) {
			const off = (arm * TAU) / 3;
			const alpha = 0.38 - arm * 0.08;
			const width = 2.4 - arm * 0.5;

			for (let i = 0; i <= 54; i++) {
				const p = i / 54;
				const ang = p * TAU * 1.6 + t * 1.2 + off;
				const rr = r * (1 - p) * 0.92;

				const x = cx + Math.cos(ang) * rr;
				const y = cy + Math.sin(ang) * rr * 0.94;

				if (i === 0) {
					g.moveTo(x, y);
				} else {
					g.lineTo(x, y);
				}
			}

			g.stroke({ color: C.path, width, alpha });
		}

		// Слабые концентрические кольца.
		for (let k = 0; k < 3; k++) {
			const rr = r * (0.3 + k * 0.18);
			const a = 0.06 + 0.02 * Math.sin(t * 1.2 + k * 1.7);

			g.circle(cx, cy, rr).stroke({ color: C.path, width: 1, alpha: a });
		}

		// Частицы, затягиваемые в водоворот.
		for (let i = 0; i < 10; i++) {
			const speed = 0.24 + seededRandom(i) * 0.34;
			const p = (t * speed + seededRandom(i + 9)) % 1;
			const ang = seededRandom(i + 20) * TAU + t * 1.2 + p * TAU * 1.3;
			const rr = r * (1 - p) * 0.86;

			const x = cx + Math.cos(ang) * rr;
			const y = cy + Math.sin(ang) * rr * 0.94;
			const size = 1.3 * (1 - p) + 0.4;

			g.circle(x, y, size).fill({
				color: C.moon,
				alpha: 0.5 * (1 - p)
			});
		}

		// Центр: не чёрная дыра, а уплотнение воды и свет.
		g.circle(cx, cy, r * 0.18).fill({
			color: C.water0,
			alpha: 0.36
		});

		g.circle(cx, cy, r * 0.18).stroke({
			color: C.path,
			width: 1.6,
			alpha: 0.6 + pulse * 0.2
		});

		g.circle(cx, cy, r * 0.06).fill({
			color: C.moon,
			alpha: 0.8 + pulse * 0.2
		});
	}
}