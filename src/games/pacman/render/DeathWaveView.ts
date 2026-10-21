import type { GridLayout } from './GridView';

const DEBRIS_COUNT = 14;

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
		const clamped = Math.min(1, Math.max(0, progress));
		const eased = 1 - Math.pow(1 - clamped, 1.6);
		const px = layout.offsetX + centerX * layout.tileSize;
		const py = layout.offsetY + centerY * layout.tileSize;
		const gridPixelWidth = gridWidth * layout.tileSize;
		const gridPixelHeight = gridHeight * layout.tileSize;
		const maxRadius = Math.sqrt(
			gridPixelWidth * gridPixelWidth + gridPixelHeight * gridPixelHeight
		);
		const radius = eased * maxRadius;
		if (radius < 1) {
			return;
		}
		ctx.save();
		ctx.beginPath();
		ctx.rect(layout.offsetX, layout.offsetY, gridPixelWidth, gridPixelHeight);
		ctx.clip();
		this.drawConsumption(ctx, px, py, radius, layout.offsetX, layout.offsetY, gridPixelWidth, gridPixelHeight);
		this.drawFront(ctx, px, py, radius, clamped, layout.tileSize);
		this.drawDebris(ctx, px, py, radius, clamped, layout.tileSize);
		ctx.restore();
	}

	private drawConsumption(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		radius: number,
		ox: number,
		oy: number,
		w: number,
		h: number
	): void {
		const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
		gradient.addColorStop(0, 'rgba(2, 3, 6, 0.97)');
		gradient.addColorStop(0.6, 'rgba(2, 3, 6, 0.94)');
		gradient.addColorStop(0.82, 'rgba(12, 5, 3, 0.8)');
		gradient.addColorStop(0.93, 'rgba(255, 110, 40, 0.22)');
		gradient.addColorStop(1, 'rgba(255, 110, 40, 0)');
		ctx.fillStyle = gradient;
		ctx.fillRect(ox, oy, w, h);
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