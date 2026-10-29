import { drawFruitPrimitive } from './fruitPrimitive';

export function drawCherry(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
	drawFruitPrimitive(ctx, x, y, radius, '#ff4d4d');
}