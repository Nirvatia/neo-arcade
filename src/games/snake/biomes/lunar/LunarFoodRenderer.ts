import type { FoodRender } from '../contract/renderData.js';
import type { FoodRenderer } from '../contract/renderers.js';
import { C } from './LunarPalette.js';
import {
	fillCircle,
	fillEllipse,
	fillPolyFlat,
	rgba,
	strokeCircle,
	strokePolyFlat
} from '../../canvas/canvasDraw.js';

const TAU = Math.PI * 2;

export class LunarFoodRenderer implements FoodRenderer {
	public render(
		ctx: CanvasRenderingContext2D,
		foods: FoodRender[],
		count: number,
		timeMS: number,
		_cellSize: number
	): void {
		const t = timeMS * 0.001;
		for (let i = 0; i < count; i++) {
			const food = foods[i];
			if (food === undefined) continue;
			
			const bitColor = food.bit === 1 ? C.bitOne : C.bitZero;
			const phase = food.phase % TAU;
			const pulse = 0.92 + 0.08 * Math.sin(t * 1.25 + phase);
			
			fillEllipse(ctx, food.x, food.y + 7, 6, 2, C.fish, 0.24);
			fillCircle(ctx, food.x, food.y, 10, bitColor, 0.09);
			strokeCircle(ctx, food.x, food.y, 8.3, bitColor, 1.3, 0.45);
			
			if (food.bit === 1) {
				this.drawSpark(ctx, food.x, food.y, food.angle, t, phase, pulse);
			} else {
				this.drawCrystal(ctx, food.x, food.y, t, phase, pulse);
			}
		}
	}

	private drawCrystal(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		t: number,
		phase: number,
		pulse: number
	): void {
		const bc = C.bitZero;
		const bh = C.bitZeroHi;
		const size = 5.2 * (0.94 + 0.06 * pulse);
		
		const hex: number[] = [];
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * TAU - Math.PI / 2 + t * 0.25 + phase * 0.1;
			hex.push(x + Math.cos(a) * size, y + Math.sin(a) * size);
		}
		
		fillPolyFlat(ctx, hex, bc, 1);
		strokePolyFlat(ctx, hex, bh, 1.3, 0.85);
		
		ctx.beginPath();
		ctx.moveTo(x, y - size * 0.55);
		ctx.lineTo(x + size * 0.45, y);
		ctx.lineTo(x, y + size * 0.55);
		ctx.lineTo(x - size * 0.45, y);
		ctx.closePath();
		ctx.strokeStyle = rgba(0xffffff, 0.32);
		ctx.lineWidth = 0.8;
		ctx.stroke();
		
		fillCircle(ctx, x - size * 0.25, y - size * 0.25, 1.1, 0xffffff, 0.85);
		fillCircle(ctx, x, y, size * 0.32, bh, 0.95);
		fillCircle(ctx, x, y, size * 0.14, 0xffffff, 0.9);
	}

	private drawSpark(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		angle: number,
		t: number,
		phase: number,
		pulse: number
	): void {
		const bc = C.bitOne;
		const bh = C.bitOneHi;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		
		for (let k = 1; k <= 3; k++) {
			const fade = 1 - k / 4;
			fillCircle(ctx, x - cos * k * 3.2, y - sin * k * 3.2, 2.2 * fade, bc, 0.16 * fade * pulse);
		}
		
		fillCircle(ctx, x, y, 4.2, bc, 0.28 * pulse);
		fillCircle(ctx, x, y, 2.4, bh, 0.95);
		fillCircle(ctx, x, y, 1.1, 0xffffff, 0.95);
		
		for (let i = 0; i < 3; i++) {
			const a = t * 0.85 + phase + (i / 3) * TAU;
			const twinkle = Math.pow(Math.max(0, Math.sin(t * 1.7 + phase + i * 2.1)), 2);
			if (twinkle < 0.12) continue;
			
			const sr = 6.2 + Math.sin(t * 0.9 + phase + i) * 0.8;
			fillCircle(ctx, x + Math.cos(a) * sr, y + Math.sin(a) * sr, 0.85, bh, twinkle * 0.6);
		}
	}
}