import type { WeatherView } from '../../contracts/SeasonRenderBundle';
import type { GridLayout } from '../../GridView';

interface Firefly {
	x: number;
	y: number;
	speed: number;
	drift: number;
	size: number;
	alpha: number;
	phase: number;
	color: string;
}

const COUNT = 36;

export class SummerWeather implements WeatherView {
	private fireflies: Firefly[] | null = null;

	draw(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		viewportWidth: number,
		viewportHeight: number,
		dt: number,
		time: number
	): void {
		if (
			!Number.isFinite(viewportWidth) ||
			viewportWidth <= 0 ||
			!Number.isFinite(viewportHeight) ||
			viewportHeight <= 0 ||
			!Number.isFinite(layout.tileSize) ||
			layout.tileSize <= 0
		) {
			return;
		}

		const safeDt = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
		const safeTime = Number.isFinite(time) && time >= 0 ? time : 0;

		if (!this.fireflies) {
			this.fireflies = [];
			const colors = ['#ffcf4d', '#ffe8a0', '#b8ff7a', '#ff9d4d'];

			for (let i = 0; i < COUNT; i += 1) {
				this.fireflies.push({
					x: Math.random(),
					y: Math.random(),
					speed: 0.015 + Math.random() * 0.03,
					drift: (Math.random() - 0.5) * 0.01,
					size: 0.035 + Math.random() * 0.04,
					alpha: 0.3 + Math.random() * 0.45,
					phase: Math.random() * Math.PI * 2,
					color: colors[Math.floor(Math.random() * colors.length)] ?? '#ffcf4d'
				});
			}
		}

		ctx.save();

		for (const firefly of this.fireflies) {
			firefly.y -= firefly.speed * safeDt * 0.35;
			firefly.x += (firefly.drift + Math.sin(safeTime * 0.8 + firefly.phase) * 0.006) * safeDt;

			if (firefly.y < -0.02) {
				firefly.y = 1.02;
				firefly.x = Math.random();
			}

			if (firefly.x > 1.02) {
				firefly.x = -0.02;
			}

			if (firefly.x < -0.02) {
				firefly.x = 1.02;
			}

			const px = firefly.x * viewportWidth;
			const py = firefly.y * viewportHeight;
			const pulse = 0.5 + 0.5 * Math.sin(safeTime * 3 + firefly.phase);
			const radius = Math.max(0.6, firefly.size * layout.tileSize);

			ctx.globalAlpha = firefly.alpha * pulse * 0.4;
			ctx.fillStyle = firefly.color;
			ctx.beginPath();
			ctx.arc(px, py, radius * 2.2, 0, Math.PI * 2);
			ctx.fill();

			ctx.globalAlpha = firefly.alpha * pulse;
			ctx.beginPath();
			ctx.arc(px, py, radius, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}
}
