import type { BitOp } from '../../components/index.js';
import type { TokenRenderer } from '../contract/renderers.js';
import { C } from './LunarPalette.js';
import {
	fillCircle,
	fillPolyFlat,
	rgba,
	strokePolyFlat
} from '../../canvas/canvasDraw.js';

const TAU = Math.PI * 2;

/**
 * Lunar Token Factory.
 *
 * Исправлен баг: плашка теперь рисуется в координатах токена,
 * а не в левом верхнем углу канваса.
 * Размер токена немного увеличен.
 */
export class LunarTokenFactory implements TokenRenderer {
	public render(
		ctx: CanvasRenderingContext2D,
		op: BitOp,
		x: number,
		y: number,
		cellSize: number
	): void {
		const cx = x + cellSize / 2;
		const cy = y + cellSize / 2;

		const isBoost = op === '<<';

		const mainColor = isBoost ? C.tokenRight : C.tokenLeft;
		const hiColor = isBoost ? C.tokenRightHi : C.tokenLeftHi;
		const darkBg = isBoost ? 0x4a3a12 : 0x3a2a5a;

		// Мягкое свечение позади токена.
		fillCircle(ctx, cx, cy, cellSize * 0.46, mainColor, 0.1);

		// Тень под токеном.
		ctx.beginPath();
		ctx.ellipse(
			cx,
			cy + cellSize * 0.32,
			cellSize * 0.28,
			cellSize * 0.08,
			0,
			0,
			TAU
		);
		ctx.fillStyle = rgba(C.fish, 0.3);
		ctx.fill();

		// Плашка.
		const inset = cellSize * 0.12;
		const size = cellSize - inset * 2;

		this.roundRectPath(
			ctx,
			x + inset,
			y + inset,
			size,
			size,
			cellSize * 0.22
		);

		ctx.fillStyle = rgba(darkBg, 1);
		ctx.fill();

		ctx.lineWidth = 1.6;
		ctx.strokeStyle = rgba(mainColor, 0.95);
		ctx.stroke();

		// Блик сверху.
		this.roundRectPath(
			ctx,
			x + inset + 2,
			y + inset + 2,
			size - 4,
			size * 0.35,
			cellSize * 0.14
		);

		ctx.fillStyle = rgba(0xffffff, 0.1);
		ctx.fill();

		// Иконка.
		const iconSize = cellSize * 0.27;

		if (isBoost) {
			this.drawBolt(ctx, cx, cy, iconSize, mainColor, hiColor);
		} else {
			this.drawUndo(ctx, cx, cy, iconSize, mainColor);
		}
	}

	private drawBolt(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		s: number,
		color: number,
		hiColor: number
	): void {
		const pts = [
			{ x: 0.3, y: -1 },
			{ x: -0.55, y: 0.12 },
			{ x: -0.08, y: 0.12 },
			{ x: -0.3, y: 1 },
			{ x: 0.55, y: -0.12 },
			{ x: 0.08, y: -0.12 }
		];

		const flat: number[] = [];

		for (const p of pts) {
			flat.push(cx + p.x * s, cy + p.y * s);
		}

		// Лёгкое свечение позади молнии.
		ctx.save();
		ctx.lineJoin = 'round';

		ctx.beginPath();
		this.traceFlat(ctx, flat);

		ctx.strokeStyle = rgba(color, 0.35);
		ctx.lineWidth = 4;
		ctx.stroke();

		ctx.restore();

		fillPolyFlat(ctx, flat, color, 1);
		strokePolyFlat(ctx, flat, hiColor, 1.4, 0.85);
	}

	private drawUndo(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		s: number,
		color: number
	): void {
		const r = s * 0.8;
		const gapHalf = 0.55;
		const lineWidth = s * 0.32;

		const aEnd = -Math.PI / 2 - gapHalf;

		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// Свечение дуги.
		ctx.beginPath();
		ctx.arc(cx, cy, r, -Math.PI / 2 + gapHalf, aEnd + TAU, false);
		ctx.strokeStyle = rgba(color, 0.3);
		ctx.lineWidth = lineWidth + 3;
		ctx.stroke();

		// Основная дуга.
		ctx.beginPath();
		ctx.arc(cx, cy, r, -Math.PI / 2 + gapHalf, aEnd + TAU, false);
		ctx.strokeStyle = rgba(color, 1);
		ctx.lineWidth = lineWidth;
		ctx.stroke();

		// Наконечник стрелки.
		const tipX = cx + Math.cos(aEnd) * r;
		const tipY = cy + Math.sin(aEnd) * r;

		const dirX = Math.sin(aEnd);
		const dirY = -Math.cos(aEnd);

		const perpX = -dirY;
		const perpY = dirX;

		const hl = s * 0.6;
		const hw = s * 0.42;

		const apexX = tipX + dirX * hl;
		const apexY = tipY + dirY * hl;

		ctx.beginPath();
		ctx.moveTo(apexX, apexY);
		ctx.lineTo(tipX + perpX * hw, tipY + perpY * hw);
		ctx.lineTo(tipX - perpX * hw, tipY - perpY * hw);
		ctx.closePath();

		ctx.fillStyle = rgba(color, 1);
		ctx.fill();
	}

	private traceFlat(ctx: CanvasRenderingContext2D, flat: number[]): void {
		const firstX = flat[0];
		const firstY = flat[1];

		if (firstX === undefined || firstY === undefined) {
			return;
		}

		ctx.moveTo(firstX, firstY);

		for (let i = 2; i + 1 < flat.length; i += 2) {
			const x = flat[i];
			const y = flat[i + 1];

			if (x === undefined || y === undefined) {
				continue;
			}

			ctx.lineTo(x, y);
		}

		ctx.closePath();
	}

	private roundRectPath(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number
	): void {
		const r = Math.min(radius, width / 2, height / 2);

		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + width, y, x + width, y + height, r);
		ctx.arcTo(x + width, y + height, x, y + height, r);
		ctx.arcTo(x, y + height, x, y, r);
		ctx.arcTo(x, y, x + width, y, r);
		ctx.closePath();
	}
}