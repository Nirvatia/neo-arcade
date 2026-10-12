import type { PieceDefinition } from '../config/PiecesConfig';
import { THEME } from '../config/ThemeConfig';

export function drawPiece(
	ctx: CanvasRenderingContext2D,
	piece: PieceDefinition | null,
	cx: number,
	cy: number,
	cellSize: number,
	alpha: number = 1
): void {
	if (!piece) {
		return;
	}

	const matrix = piece.rotations[0];
	if (!matrix) {
		return;
	}

	const cell = Math.max(4, Math.round(cellSize));

	let minX = 999;
	let maxX = -1;
	let minY = 999;
	let maxY = -1;

	for (let r = 0; r < matrix.length; r++) {
		const row = matrix[r];
		if (!row) {
			continue;
		}

		for (let c = 0; c < row.length; c++) {
			const value = row[c] ?? 0;
			if (value !== 0) {
				minX = Math.min(minX, c);
				maxX = Math.max(maxX, c);
				minY = Math.min(minY, r);
				maxY = Math.max(maxY, r);
			}
		}
	}

	if (maxX < minX || maxY < minY) {
		return;
	}

	const w = (maxX - minX + 1) * cell;
	const h = (maxY - minY + 1) * cell;

	const ox = Math.round(cx - w / 2);
	const oy = Math.round(cy - h / 2);

	ctx.globalAlpha = alpha;

	for (let r = 0; r < matrix.length; r++) {
		const row = matrix[r];
		if (!row) {
			continue;
		}

		for (let c = 0; c < row.length; c++) {
			const value = row[c] ?? 0;
			if (value !== 0) {
				drawCell(
					ctx,
					ox + (c - minX) * cell,
					oy + (r - minY) * cell,
					cell,
					value,
					false
				);
			}
		}
	}

	ctx.globalAlpha = 1;
}

export function drawCell(
	ctx: CanvasRenderingContext2D,
	px: number,
	py: number,
	s: number,
	colorId: number,
	ghost: boolean
): void {
	const color = THEME.pieceColors[colorId];
	if (!color) {
		return;
	}

	const x = Math.round(px);
	const y = Math.round(py);
	const size = Math.max(4, Math.round(s));

	const ghostInset = Math.max(2, Math.min(3, Math.floor(size / 5)));
	const bevel = Math.max(2, Math.min(5, Math.floor(size / 3)));
	const rivetOffset = Math.max(4, Math.min(6, Math.floor(size / 5)));

	if (ghost) {
		const inner = Math.max(0, size - ghostInset * 2);
		if (inner <= 0) {
			return;
		}

		ctx.globalAlpha = THEME.ghostFillAlpha;
		ctx.fillStyle = color.base;
		ctx.fillRect(x + ghostInset, y + ghostInset, inner, inner);

		ctx.globalAlpha = THEME.ghostLineAlpha;
		ctx.strokeStyle = color.base;
		ctx.lineWidth = 2;
		ctx.strokeRect(x + ghostInset, y + ghostInset, inner, inner);

		ctx.globalAlpha = 1;
		return;
	}

	ctx.fillStyle = color.base;
	ctx.fillRect(x, y, size, size);

	ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + size, y);
	ctx.lineTo(x + size - bevel, y + bevel);
	ctx.lineTo(x + bevel, y + bevel);
	ctx.lineTo(x + bevel, y + size - bevel);
	ctx.lineTo(x, y + size);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
	ctx.beginPath();
	ctx.moveTo(x + size, y);
	ctx.lineTo(x + size, y + size);
	ctx.lineTo(x, y + size);
	ctx.lineTo(x + bevel, y + size - bevel);
	ctx.lineTo(x + size - bevel, y + size - bevel);
	ctx.lineTo(x + size - bevel, y + bevel);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';

	const rivets: [number, number][] = [
		[rivetOffset, rivetOffset],
		[size - rivetOffset, rivetOffset],
		[rivetOffset, size - rivetOffset],
		[size - rivetOffset, size - rivetOffset]
	];

	for (const p of rivets) {
		ctx.beginPath();
		ctx.arc(x + p[0], y + p[1], 1.6, 0, 7);
		ctx.fill();
	}

	ctx.strokeStyle = 'rgba(12, 8, 6, 0.9)';
	ctx.lineWidth = 2;
	ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
}