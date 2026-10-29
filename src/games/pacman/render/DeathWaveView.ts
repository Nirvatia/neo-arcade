import type { GridLayout } from './GridView';

const DEBRIS_COUNT = 14;

export function deathWaveEase(progress: number): number {
	const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
	return 1 - Math.pow(1 - clamped, 1.6);
}

export function deathWaveMaxRadius(gridWidth: number, gridHeight: number): number {
	if (
		!Number.isFinite(gridWidth) ||
		gridWidth <= 0 ||
		!Number.isFinite(gridHeight) ||
		gridHeight <= 0
	) {
		console.error('deathWaveMaxRadius', 'invalid grid size', {
			gridWidth,
			gridHeight
		});
		return 0;
	}
	return Math.sqrt(gridWidth * gridWidth + gridHeight * gridHeight);
}

export class DeathWaveView {
	draw(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		gridWidth: number,
		gridHeight: number,
		centerX: number,
		centerY: number,
		progress: number
	): void {
		if (!Number.isFinite(progress) || progress <= 0) {
			return;
		}
		if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
			console.error('DeathWaveView.draw', 'invalid center', { centerX, centerY });
			return;
		}
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('DeathWaveView.draw', 'invalid tile size', layout.tileSize);
			return;
		}
		const eased = deathWaveEase(progress);
		const radius = eased * deathWaveMaxRadius(gridWidth, gridHeight) * layout.tileSize;
		if (!Number.isFinite(radius) || radius < 1) {
			return;
		}
		const px = layout.offsetX + centerX * layout.tileSize;
		const py = layout.offsetY + centerY * layout.tileSize;
		const gridPixelWidth = gridWidth * layout.tileSize;
		const gridPixelHeight = gridHeight * layout.tileSize;
		ctx.save();
		ctx.beginPath();
		ctx.rect(layout.offsetX, layout.offsetY, gridPixelWidth, gridPixelHeight);
		ctx.clip();
		this.drawFront(ctx, px, py, radius, eased, layout.tileSize);
		this.drawDebris(ctx, px, py, radius, eased, layout.tileSize);
		ctx.restore();
	}

	private drawFront(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		radius: number,
		progress: number,
		tileSize: number
	): void {
		const alpha = Math.max(0, 0.85 - progress * 0.55);
		if (alpha <= 0) {
			return;
		}
		const ringWidth = Math.max(2, tileSize * 0.38);
		ctx.strokeStyle = `rgba(255, 130, 45, ${alpha})`;
		ctx.lineWidth = ringWidth;
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.stroke();
		const innerAlpha = Math.max(0, alpha * 0.6);
		ctx.strokeStyle = `rgba(255, 220, 110, ${innerAlpha})`;
		ctx.lineWidth = Math.max(1, ringWidth * 0.35);
		ctx.beginPath();
		ctx.arc(cx, cy, Math.max(0, radius - ringWidth * 0.6), 0, Math.PI * 2);
		ctx.stroke();
	}

	private drawDebris(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		radius: number,
		progress: number,
		tileSize: number
	): void {
		const alpha = Math.max(0, 0.75 - progress * 0.6);
		if (alpha <= 0) {
			return;
		}
		for (let i = 0; i < DEBRIS_COUNT; i += 1) {
			const angle = (i / DEBRIS_COUNT) * Math.PI * 2 + progress * 3.2;
			const wobble = Math.sin(progress * 10 + i * 1.7) * tileSize * 0.25;
			const dist = radius + wobble;
			const x = cx + Math.cos(angle) * dist;
			const y = cy + Math.sin(angle) * dist;
			const size = Math.max(1, tileSize * (0.08 + 0.06 * Math.abs(Math.sin(i * 2.3))));
			const brightness = 140 + Math.floor(80 * Math.abs(Math.sin(i * 1.1)));
			ctx.fillStyle = `rgba(255, ${brightness}, 60, ${alpha})`;
			ctx.fillRect(x - size / 2, y - size / 2, size, size);
		}
	}
}
