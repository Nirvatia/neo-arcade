export function drawFruitPrimitive(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	color: string
): void {
	if (!Number.isFinite(radius) || radius <= 0) {
		console.error('fruitPrimitive.drawFruitPrimitive', 'invalid radius', radius);
		return;
	}
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y + radius * 0.1, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
	ctx.beginPath();
	ctx.arc(x - radius * 0.3, y - radius * 0.2, Math.max(1, radius * 0.22), 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#79ff6f';
	ctx.fillRect(
		x - Math.max(1, radius * 0.12),
		y - radius * 1.05,
		Math.max(1, radius * 0.24),
		Math.max(2, radius * 0.5)
	);
}