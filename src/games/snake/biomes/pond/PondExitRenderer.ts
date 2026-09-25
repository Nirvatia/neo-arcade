import type { Graphics } from 'pixi.js';
import type { GridBitmask } from '../../logic/GridBitmask.js';
import type { ExitRenderer } from '../renderers.js';

export class PondExitRenderer implements ExitRenderer {
	public render(
		g: Graphics,
		grid: GridBitmask,
		timeMS: number,
		cellSize: number
	): void {
		const pulse = Math.sin(timeMS * 0.004) * 0.5 + 0.5;

		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				if (!grid.isExit(col, row)) {
					continue;
				}

				const cx = col * cellSize + cellSize / 2;
				const cy = row * cellSize + cellSize / 2;

				// Свечение
				g.circle(cx, cy, cellSize * 0.65 + pulse * 3).fill({
					color: 0xffe696,
					alpha: 0.1 + pulse * 0.06
				});

				g.circle(cx, cy, cellSize * 0.45 + pulse * 2).fill({
					color: 0xffe696,
					alpha: 0.1 + pulse * 0.06
				});

				// Нора
				g.ellipse(cx, cy + 1, cellSize * 0.34, cellSize * 0.28).fill(0x1a2410);

				// Свет внутри
				g.ellipse(cx, cy + 1, cellSize * 0.22, cellSize * 0.16).fill({
					color: 0xfff2cc,
					alpha: 0.75 + pulse * 0.25
				});

				g.ellipse(cx, cy + 1, cellSize * 0.12, cellSize * 0.09).fill({
					color: 0xffffff,
					alpha: 0.5 + pulse * 0.3
				});
			}
		}
	}
}