import type { Graphics } from 'pixi.js';

// Семисегментная цифра 0/1 для ЖК: рисуется прямоугольниками,
// без зависимости от шрифтов — всегда резкая и контрастная.
export function drawBitDigit(
	g: Graphics,
	bit: 0 | 1,
	cx: number,
	cy: number,
	h: number,
	color: number,
	alpha: number = 1
): void {
	const w = h * 0.62;
	const t = Math.max(2, h * 0.17);
	const x = cx - w / 2;
	const y = cy - h / 2;
	const hx = x + t * 0.5;
	const hw = w - t;
	const vy = y + t * 0.5;
	const vh = h / 2 - t;

	if (bit === 1) {
		// «1» — две правые вертикали.
		g.rect(x + w - t, vy, t, vh);
		g.rect(x + w - t, y + h / 2 + t * 0.5, t, vh);
	} else {
		// «0» — всё кроме средней перекладины.
		g.rect(hx, y, hw, t);
		g.rect(hx, y + h - t, hw, t);
		g.rect(x, vy, t, vh);
		g.rect(x + w - t, vy, t, vh);
		g.rect(x, y + h / 2 + t * 0.5, t, vh);
		g.rect(x + w - t, y + h / 2 + t * 0.5, t, vh);
	}
	g.fill({ color, alpha });
}