import { drawFruitPrimitive } from './fruitPrimitive';

export function drawMelon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
	drawFruitPrimitive(ctx, x, y, radius, '#59f0ff');
}