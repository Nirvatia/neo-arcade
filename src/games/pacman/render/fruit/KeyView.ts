import { drawFruitPrimitive } from './fruitPrimitive';

export function drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
	drawFruitPrimitive(ctx, x, y, radius, '#e8efff');
}
