import { drawFruitPrimitive } from './fruitPrimitive';

export function drawApple(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number
): void {
	drawFruitPrimitive(ctx, x, y, radius, '#8fe36a');
}
