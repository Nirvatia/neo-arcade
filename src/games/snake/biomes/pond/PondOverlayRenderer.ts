import type { Graphics } from 'pixi.js';
import type { OverlayRenderer } from '../renderers.js';
import { POND_OVERLAY } from './PondPalette.js';

/**
 * Фон оверлейных экранов Пруда.
 * Тёмная вода, восходящие частицы, мягкое свечение, виньетка.
 */
export class PondOverlayRenderer implements OverlayRenderer {
	public render(
		g: Graphics,
		width: number,
		height: number,
		timeMS: number,
		_cellSize: number
	): void {
		const op = POND_OVERLAY;
		const t = timeMS * 0.001;
		const cx = width / 2;
		const cy = height / 2;
		const base = Math.min(width, height);

		// Подложка.
		g.rect(0, 0, width, height).fill({ color: op.background, alpha: op.backgroundAlpha });

		// Глубина воды: верх светлее, низ темнее.
		g.rect(0, 0, width, height * 0.5).fill({ color: 0x141e0c, alpha: 0.35 });
		g.rect(0, height * 0.5, width, height * 0.5).fill({ color: 0x060a04, alpha: 0.5 });

		// Центральное свечение, чтобы оверлей не был плоским.
		g.circle(cx, cy - base * 0.05, base * 0.55).fill({ color: op.accent, alpha: 0.05 });
		g.circle(cx, cy - base * 0.05, base * 0.3).fill({ color: op.accent, alpha: 0.05 });

		// Восходящие светлячки.
		for (let i = 0; i < 14; i++) {
			const px = (Math.sin(t * 0.4 + i * 1.7) * 0.5 + 0.5) * width;
			const py = ((t * 0.02 + i * 0.13) % 1) * height;
			const sz = 1 + Math.sin(t * 2 + i) * 0.5;
			g.circle(px, py, sz).fill({ color: 0xffe9a0, alpha: 0.12 });
		}

		// Виньетка.
		g.rect(0, 0, width, height).stroke({ color: 0x05080a, width: 60, alpha: 0.3 });

		// Акцентные линии.
		g.rect(0, 0, width, 2).fill({ color: op.accent, alpha: 0.2 });
		g.rect(0, height - 2, width, 2).fill({ color: op.accent, alpha: 0.2 });
	}
}