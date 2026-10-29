import { drawFruitPrimitive } from './fruitPrimitive';

export function drawOrange(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number
): void {
	drawFruitPrimitive(ctx, x, y, radius, '#ffb14d');
}
