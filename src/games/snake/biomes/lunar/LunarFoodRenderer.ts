import type { Graphics } from 'pixi.js';
import type { FoodRender } from '../renderData.js';
import type { FoodRenderer } from '../renderers.js';
import { C } from './LunarPalette.js';

export class LunarFoodRenderer implements FoodRenderer {
	public render(g: Graphics, foods: FoodRender[], timeMS: number, _cellSize: number): void {
		const ph = timeMS * 0.0015;
		for (const food of foods) {
			const bitColor = food.bit === 1 ? C.bitOne : C.bitZero;

			// Ореол.
			g.circle(food.x, food.y, 18).fill({ color: bitColor, alpha: 0.13 });

			// Чёткое кольцо.
			g.circle(food.x, food.y, 11.5).stroke({
				color: bitColor,
				width: 2,
				alpha: 0.7
			});

			if (food.bit === 1) {
				this.drawMoth(g, food.x, food.y, food.angle, ph + food.phase);
			} else {
				this.drawOrb(g, food.x, food.y, ph + food.phase);
			}
		}
	}

	// ===== Бит 1: Мотылёк =====
	private drawMoth(g: Graphics, x: number, y: number, ang: number, p: number): void {
		const bc = C.bitOne;
		const bh = C.bitOneHi;
		const cos = Math.cos(ang);
		const sin = Math.sin(ang);

		// Сегментированное тело (5 точек, волнообразное движение).
		const pts: { x: number; y: number }[] = [];
		for (let k = 0; k < 5; k++) {
			const d = 7 - k * 3.4;
			const wig = Math.sin(p * 1.8 + k * 1.1) * (k === 0 ? 0.3 : 1.5);
			pts.push({
				x: x + cos * d - sin * wig,
				y: y + sin * d + cos * wig
			});
		}

		const trace = (): void => {
			const first = pts[0];
			if (first === undefined) return;
			g.moveTo(first.x, first.y);
			for (let k = 1; k < 5; k++) {
				const pt = pts[k];
				if (pt !== undefined) {
					g.lineTo(pt.x, pt.y);
				}
			}
		};

		// Внешнее свечение тела.
		trace();
		g.stroke({ color: bc, width: 14, alpha: 0.3 });
		// Основное тело.
		trace();
		g.stroke({ color: bc, width: 7.5, alpha: 0.95 });
		// Блик.
		trace();
		g.stroke({ color: bh, width: 3, alpha: 0.9 });

		// Голова.
		const head = pts[0];
		if (head !== undefined) {
			g.circle(head.x, head.y, 5).fill({ color: bc, alpha: 0.5 });
			g.circle(head.x, head.y, 2.3).fill({ color: 0xffffff, alpha: 0.9 });
		}
	}

	// ===== Бит 0: Кристалл =====
	private drawOrb(g: Graphics, x: number, y: number, p: number): void {
		const bc = C.bitZero;
		const bh = C.bitZeroHi;
		const pulse = 0.85 + 0.15 * Math.sin(p * 1.4);
		const size = 6.5 * pulse;

		// Внешнее свечение.
		g.circle(x, y, size + 4).fill({ color: bc, alpha: 0.15 });

		// Кристалл — шестиугольник.
		const hexPts: number[] = [];
		for (let i = 0; i < 6; i++) {
			const angle = (i / 6) * Math.PI * 2 - Math.PI / 2 + p * 0.3;
			hexPts.push(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
		}
		g.poly(hexPts).fill(bc);
		g.poly(hexPts).stroke({ color: bh, width: 1.5, alpha: 0.8 });

		// Внутренние грани (ромб).
		g.moveTo(x, y - size * 0.6)
			.lineTo(x + size * 0.5, y)
			.lineTo(x, y + size * 0.6)
			.lineTo(x - size * 0.5, y)
			.closePath()
			.stroke({ color: 0xffffff, width: 0.8, alpha: 0.4 });

		// Блик.
		g.circle(x - size * 0.3, y - size * 0.3, 1.5).fill({
			color: 0xffffff,
			alpha: 0.8
		});

		// Яркое ядро.
		g.circle(x, y, size * 0.4).fill({ color: bh, alpha: 0.95 });
		g.circle(x, y, size * 0.2).fill({ color: 0xffffff, alpha: 0.9 });
	}
}