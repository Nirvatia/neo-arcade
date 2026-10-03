import type { Graphics } from 'pixi.js';
import type { OverlayRenderer } from '../renderers.js';
import { LUNAR_OVERLAY, C } from './LunarPalette.js';

function seededRandom(i: number): number {
	const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

/**
 * Оверлейные экраны Лунной Лагуны.
 * Фон для меню / паузы / game over / victory.
 */
export class LunarOverlayRenderer implements OverlayRenderer {
	public render(
		g: Graphics,
		width: number,
		height: number,
		timeMS: number,
		_cellSize: number
	): void {
		const op = LUNAR_OVERLAY;
		const t = timeMS * 0.001;

		const cx = width / 2;
		const cy = height / 2;
		const base = Math.min(width, height);

		// ===== Подложка =====
		g.rect(0, 0, width, height).fill({
			color: op.background,
			alpha: op.backgroundAlpha
		});

		// ===== Глубина воды =====
		g.rect(0, 0, width, height * 0.52).fill({ color: C.water0, alpha: 0.24 });
		g.rect(0, height * 0.52, width, height * 0.48).fill({
			color: C.water2,
			alpha: 0.42
		});

		// ===== Луна =====
		const moonY = height * 0.14;
		const moonR = base * 0.085;

		g.circle(cx, moonY, moonR * 3.2).fill({ color: C.glowTop, alpha: 0.045 });
		g.circle(cx, moonY, moonR * 1.9).fill({ color: C.glowMid, alpha: 0.05 });
		g.circle(cx, moonY, moonR).fill({ color: C.moon, alpha: 0.16 });
		g.circle(cx, moonY, moonR).stroke({ color: C.path, width: 1, alpha: 0.22 });

		// ===== Световой столб / отражение =====
		const shaftTop = moonY + moonR * 0.4;

		g.moveTo(cx - base * 0.015, shaftTop)
			.lineTo(cx + base * 0.015, shaftTop)
			.lineTo(cx + base * 0.09, height * 0.86)
			.lineTo(cx - base * 0.09, height * 0.86)
			.closePath()
			.fill({ color: C.path, alpha: 0.022 });

		g.ellipse(cx, height * 0.36, base * 0.17, base * 0.05).fill({
			color: C.path,
			alpha: 0.03
		});

		// ===== Звёзды =====
		for (let i = 0; i < 22; i++) {
			const sx = seededRandom(i * 3.1) * width;
			const sy = seededRandom(i * 5.7) * height * 0.8;
			const blink = 0.5 + 0.5 * Math.sin(t * (0.5 + (i % 5) * 0.18) + i * 1.3);

			g.circle(sx, sy, 0.9).fill({ color: C.star, alpha: 0.04 + blink * 0.09 });
		}

		// ===== Тонкие волны =====
		for (let j = 0; j < 7; j++) {
			const y0 = height * 0.24 + height * 0.62 * (j / 6);

			g.moveTo(width * 0.08, y0);

			for (let x = width * 0.12; x <= width * 0.92; x += 14) {
				g.lineTo(x, y0 + Math.sin(x * 0.035 + j * 1.7 + t * 0.35) * 2);
			}

			g.stroke({ color: C.path, width: 1.2, alpha: 0.03 });
		}

		// ===== Туман =====
		for (let i = 0; i < 5; i++) {
			const mx =
				width * (0.14 + 0.18 * i) + Math.sin(t * 0.05 + i * 1.7) * 18;
			const my = height * (0.3 + 0.13 * i);

			g.ellipse(mx, my, 46 + i * 8, 10 + i * 2).fill({
				color: C.mist,
				alpha: 0.015
			});
		}

		// ===== Центральное свечение для читаемости текста =====
		g.circle(cx, cy, base * 0.34).fill({ color: op.accent, alpha: 0.035 });
		g.circle(cx, cy, base * 0.22).fill({ color: op.accent, alpha: 0.03 });

		// ===== Виньетка =====
		g.rect(0, 0, width, height).stroke({
			color: C.vignette,
			width: base * 0.14,
			alpha: 0.38
		});

		// ===== Акцентная рамка =====
		g.rect(0, 0, width, 1).fill({ color: op.accent, alpha: 0.14 });
		g.rect(0, height - 1, width, 1).fill({ color: op.accent, alpha: 0.14 });
		g.rect(0, 0, 1, height).fill({ color: op.accent, alpha: 0.05 });
		g.rect(width - 1, 0, 1, height).fill({ color: op.accent, alpha: 0.05 });
	}
}