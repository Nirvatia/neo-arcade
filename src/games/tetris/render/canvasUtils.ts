export function prepareCanvas(
	canvas: HTMLCanvasElement,
	width: number,
	height: number
): CanvasRenderingContext2D | null {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	const logicalWidth = Math.max(1, Math.round(width));
	const logicalHeight = Math.max(1, Math.round(height));

	canvas.width = Math.max(1, Math.round(logicalWidth * dpr));
	canvas.height = Math.max(1, Math.round(logicalHeight * dpr));
	canvas.style.width = `${logicalWidth}px`;
	canvas.style.height = `${logicalHeight}px`;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return null;
	}

	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.imageSmoothingEnabled = false;

	return ctx;
}