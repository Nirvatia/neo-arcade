import { rgba } from './canvasColor.js';

export { rgba };

const TAU = Math.PI * 2;

export function fillRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	color: number,
	alpha = 1
): void {
	if (width <= 0 || height <= 0 || alpha <= 0) {
		return;
	}

	ctx.fillStyle = rgba(color, alpha);
	ctx.fillRect(x, y, width, height);
}

export function strokeRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	color: number,
	lineWidth: number,
	alpha = 1
): void {
	if (width <= 0 || height <= 0 || alpha <= 0) {
		return;
	}

	ctx.strokeStyle = rgba(color, alpha);
	ctx.lineWidth = lineWidth;
	ctx.strokeRect(x, y, width, height);
}

export function fillCircle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	color: number,
	alpha = 1
): void {
	if (radius <= 0 || alpha <= 0) {
		return;
	}

	ctx.beginPath();
	ctx.arc(x, y, radius, 0, TAU);
	ctx.fillStyle = rgba(color, alpha);
	ctx.fill();
}

export function strokeCircle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	color: number,
	lineWidth: number,
	alpha = 1
): void {
	if (radius <= 0 || alpha <= 0) {
		return;
	}

	ctx.beginPath();
	ctx.arc(x, y, radius, 0, TAU);
	ctx.strokeStyle = rgba(color, alpha);
	ctx.lineWidth = lineWidth;
	ctx.stroke();
}

export function fillEllipse(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radiusX: number,
	radiusY: number,
	color: number,
	alpha = 1
): void {
	if (radiusX <= 0 || radiusY <= 0 || alpha <= 0) {
		return;
	}

	ctx.beginPath();
	ctx.ellipse(x, y, radiusX, radiusY, 0, 0, TAU);
	ctx.fillStyle = rgba(color, alpha);
	ctx.fill();
}

export function strokeEllipse(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radiusX: number,
	radiusY: number,
	color: number,
	lineWidth: number,
	alpha = 1
): void {
	if (radiusX <= 0 || radiusY <= 0 || alpha <= 0) {
		return;
	}

	ctx.beginPath();
	ctx.ellipse(x, y, radiusX, radiusY, 0, 0, TAU);
	ctx.strokeStyle = rgba(color, alpha);
	ctx.lineWidth = lineWidth;
	ctx.stroke();
}

export function fillPolyPoints(
	ctx: CanvasRenderingContext2D,
	points: { x: number; y: number }[],
	color: number,
	alpha = 1
): void {
	if (points.length < 3 || alpha <= 0) {
		return;
	}

	const first = points[0];
	if (first === undefined) {
		return;
	}

	ctx.beginPath();
	ctx.moveTo(first.x, first.y);

	for (let i = 1; i < points.length; i++) {
		const point = points[i];
		if (point === undefined) {
			continue;
		}

		ctx.lineTo(point.x, point.y);
	}

	ctx.closePath();
	ctx.fillStyle = rgba(color, alpha);
	ctx.fill();
}

export function strokePolyPoints(
	ctx: CanvasRenderingContext2D,
	points: { x: number; y: number }[],
	color: number,
	lineWidth: number,
	alpha = 1,
	join: CanvasLineJoin = 'round'
): void {
	if (points.length < 2 || alpha <= 0) {
		return;
	}

	const first = points[0];
	if (first === undefined) {
		return;
	}

	ctx.beginPath();
	ctx.moveTo(first.x, first.y);

	for (let i = 1; i < points.length; i++) {
		const point = points[i];
		if (point === undefined) {
			continue;
		}

		ctx.lineTo(point.x, point.y);
	}

	ctx.lineJoin = join;
	ctx.lineCap = 'round';
	ctx.strokeStyle = rgba(color, alpha);
	ctx.lineWidth = lineWidth;
	ctx.stroke();
}

export function fillPolyFlat(
	ctx: CanvasRenderingContext2D,
	flat: number[],
	color: number,
	alpha = 1
): void {
	if (flat.length < 6 || alpha <= 0) {
		return;
	}

	const firstX = flat[0];
	const firstY = flat[1];

	if (firstX === undefined || firstY === undefined) {
		return;
	}

	ctx.beginPath();
	ctx.moveTo(firstX, firstY);

	for (let i = 2; i + 1 < flat.length; i += 2) {
		const x = flat[i];
		const y = flat[i + 1];

		if (x === undefined || y === undefined) {
			continue;
		}

		ctx.lineTo(x, y);
	}

	ctx.closePath();
	ctx.fillStyle = rgba(color, alpha);
	ctx.fill();
}

export function strokePolyFlat(
	ctx: CanvasRenderingContext2D,
	flat: number[],
	color: number,
	lineWidth: number,
	alpha = 1,
	join: CanvasLineJoin = 'round'
): void {
	if (flat.length < 6 || alpha <= 0) {
		return;
	}

	const firstX = flat[0];
	const firstY = flat[1];

	if (firstX === undefined || firstY === undefined) {
		return;
	}

	ctx.beginPath();
	ctx.moveTo(firstX, firstY);

	for (let i = 2; i + 1 < flat.length; i += 2) {
		const x = flat[i];
		const y = flat[i + 1];

		if (x === undefined || y === undefined) {
			continue;
		}

		ctx.lineTo(x, y);
	}

	ctx.closePath();
	ctx.lineJoin = join;
	ctx.lineCap = 'round';
	ctx.strokeStyle = rgba(color, alpha);
	ctx.lineWidth = lineWidth;
	ctx.stroke();
}