import { drawFruitPrimitive } from './fruitPrimitive';

export function drawPear(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
	drawFruitPrimitive(ctx, x, y, radius, '#c8e05a');
}