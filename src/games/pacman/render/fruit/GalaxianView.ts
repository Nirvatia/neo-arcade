import { drawFruitPrimitive } from './fruitPrimitive';

export function drawGalaxian(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
	drawFruitPrimitive(ctx, x, y, radius, '#5c8bff');
}