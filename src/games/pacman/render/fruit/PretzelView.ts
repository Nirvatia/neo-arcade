import { drawFruitPrimitive } from './fruitPrimitive';

export function drawPretzel(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
	drawFruitPrimitive(ctx, x, y, radius, '#c08a4d');
}