import { drawFruitPrimitive } from './fruitPrimitive';

export function drawStrawberry(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number
): void {
	drawFruitPrimitive(ctx, x, y, radius, '#ff9de2');
}
