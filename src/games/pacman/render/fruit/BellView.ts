import { drawFruitPrimitive } from './fruitPrimitive';

export function drawBell(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number
): void {
	drawFruitPrimitive(ctx, x, y, radius, '#ffd93b');
}
