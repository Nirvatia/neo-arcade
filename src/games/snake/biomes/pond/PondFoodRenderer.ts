import type { Graphics } from 'pixi.js';
import type { FoodRender } from '../renderData.js';
import type { FoodRenderer } from '../renderers.js';
import { C } from './PondPalette.js';

export class PondFoodRenderer implements FoodRenderer {
	public render(
		g: Graphics,
		foods: FoodRender[],
		timeMS: number,
		_cellSize: number
	): void {
		const ph = timeMS * 0.004;

		for (const food of foods) {
			this.drawPrey(g, food.x, food.y, food.angle, ph + food.phase, food.bit);
		}
	}

	private drawPrey(
		g: Graphics,
		x: number,
		y: number,
		ang: number,
		ph: number,
		bit: 0 | 1
	): void {
		const halo = bit === 1 ? 0xfff8dc : 0xc8aaff;

		g.circle(x, y, 14).fill({ color: halo, alpha: 0.1 });
		g.circle(x, y, 10).fill({ color: halo, alpha: 0.12 });
		g.circle(x, y, 6).fill({ color: halo, alpha: 0.14 });

		if (bit === 1) {
			this.drawStrider(g, x, y, ang, ph);
		} else {
			this.drawBeetle(g, x, y, ang, ph);
		}
	}

	private drawStrider(g: Graphics, x: number, y: number, ang: number, ph: number): void {
		const wig = Math.sin(ph * 1.5) * 0.3;
		const cos = Math.cos(ang);
		const sin = Math.sin(ang);

		const rot = (lx: number, ly: number): [number, number] => [
			x + lx * cos - ly * sin,
			y + lx * sin + ly * cos
		];

		// Тень
		g.ellipse(x, y + 3, 6.5, 2.8).fill({ color: C.shoreDark, alpha: 0.3 });

		// Шесть ног
		for (let k = 0; k < 6; k++) {
			const a = (k / 6) * 6.28 + wig;
			const len = 9 + Math.sin(ph + k);

			const mx = Math.cos(a) * len * 0.5;
			const my = Math.sin(a) * len * 0.5 + Math.sin(ph + k) * 1.5;

			const [ex, ey] = rot(Math.cos(a) * len, Math.sin(a) * len);
			const [cmx, cmy] = rot(mx, my);

			g.moveTo(x, y).quadraticCurveTo(cmx, cmy, ex, ey);
			g.stroke({ color: 0x2a2410, width: 1.1, alpha: 1 });
		}

		// Тело
		const bodyPoints: number[] = [];
		const steps = 16;

		for (let i = 0; i < steps; i++) {
			const t = (i / steps) * Math.PI * 2;
			const lx = Math.cos(t) * 6;
			const ly = Math.sin(t) * 2.3;
			const [gx, gy] = rot(lx, ly);
			bodyPoints.push(gx, gy);
		}

		g.poly(bodyPoints).fill(0xb8a878);

		// Светлый верх
		const topPoints: number[] = [];

		for (let i = 0; i < steps; i++) {
			const t = (i / steps) * Math.PI * 2;
			const lx = Math.cos(t) * 5.2;
			const ly = Math.sin(t) * 1.6 - 0.6;
			const [gx, gy] = rot(lx, ly);
			topPoints.push(gx, gy);
		}

		g.poly(topPoints).fill({ color: 0xe8d8a8, alpha: 0.9 });
		g.poly(bodyPoints).stroke({ color: 0x2a2410, width: 1.3, alpha: 1 });

		// Блик
		const [bx, by] = rot(-1, -0.6);
		g.ellipse(bx, by, 3, 0.8).fill({ color: 0xfffff0, alpha: 0.5 });

		// Глаза
		const [e1x, e1y] = rot(4.2, -0.8);
		const [e2x, e2y] = rot(4.2, 0.8);

		g.circle(e1x, e1y, 0.9).fill(0x1a1408);
		g.circle(e2x, e2y, 0.9).fill(0x1a1408);
	}

	private drawBeetle(g: Graphics, x: number, y: number, ang: number, ph: number): void {
		const wig = Math.sin(ph * 2) * 0.35;
		const cos = Math.cos(ang);
		const sin = Math.sin(ang);

		const rot = (lx: number, ly: number): [number, number] => [
			x + lx * cos - ly * sin,
			y + lx * sin + ly * cos
		];

		// Тень
		g.ellipse(x, y + 3, 6.5, 3.2).fill({ color: C.shoreDark, alpha: 0.3 });

		// Задние ноги-вёсла
		const legs = [
			[-3, wig * 3, -10, wig * 4],
			[-3, -wig * 3, -10, -wig * 4],
			[-6, wig * 3 + 1, -12, wig * 4 + 2],
			[-6, -wig * 3 - 1, -12, -wig * 4 - 2]
		];

		for (const [x1, y1, x2, y2] of legs) {
			const [gx1, gy1] = rot(x1, y1);
			const [gx2, gy2] = rot(x2, y2);

			g.moveTo(gx1, gy1).lineTo(gx2, gy2);
		}

		g.stroke({ color: 0xffd050, width: 2, alpha: 1 });

		// Передние лапки
		const frontLegs = [
			[4, 2, 6.5, 3.5],
			[4, -2, 6.5, -3.5]
		];

		for (const [x1, y1, x2, y2] of frontLegs) {
			const [gx1, gy1] = rot(x1, y1);
			const [gx2, gy2] = rot(x2, y2);

			g.moveTo(gx1, gy1).lineTo(gx2, gy2);
		}

		g.stroke({ color: 0x3a2e14, width: 1, alpha: 1 });

		// Тело
		const bodyPoints: number[] = [];
		const steps = 16;

		for (let i = 0; i < steps; i++) {
			const t = (i / steps) * Math.PI * 2;
			const lx = Math.cos(t) * 6.5;
			const ly = Math.sin(t) * 4;
			const [gx, gy] = rot(lx, ly);
			bodyPoints.push(gx, gy);
		}

		g.poly(bodyPoints).fill(0x3a2810);

		// Светлый верх
		const topPoints: number[] = [];

		for (let i = 0; i < steps; i++) {
			const t = (i / steps) * Math.PI * 2;
			const lx = Math.cos(t) * 4.5 - 1.5;
			const ly = Math.sin(t) * 2.6 - 1;
			const [gx, gy] = rot(lx, ly);
			topPoints.push(gx, gy);
		}

		g.poly(topPoints).fill({ color: 0x6a4820, alpha: 0.8 });
		g.poly(bodyPoints).stroke({ color: 0x1a1408, width: 1.4, alpha: 1 });

		// Блик
		const [bx, by] = rot(-1.5, -1.5);
		g.ellipse(bx, by, 2.5, 1).fill({ color: 0xffe6aa, alpha: 0.4 });

		// Линия надкрылий
		const [l1x, l1y] = rot(-5, 0);
		const [l2x, l2y] = rot(5, 0);

		g.moveTo(l1x, l1y)
			.lineTo(l2x, l2y)
			.stroke({ color: 0x140c04, width: 0.9, alpha: 0.7 });

		// Голова
		const headPoints: number[] = [];

		for (let i = 0; i < steps; i++) {
			const t = (i / steps) * Math.PI * 2;
			const lx = Math.cos(t) * 2 + 5.5;
			const ly = Math.sin(t) * 2.5;
			const [gx, gy] = rot(lx, ly);
			headPoints.push(gx, gy);
		}

		g.poly(headPoints).fill(0x241a08);
		g.poly(headPoints).stroke({ color: 0x1a1408, width: 1, alpha: 1 });

		// Глаза
		const [eye1x, eye1y] = rot(6.5, -1);
		const [eye2x, eye2y] = rot(6.5, 1);

		g.circle(eye1x, eye1y, 0.8).fill(0xffd050);
		g.circle(eye2x, eye2y, 0.8).fill(0xffd050);
	}
}