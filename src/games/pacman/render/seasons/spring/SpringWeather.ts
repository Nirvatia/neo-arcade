import type { WeatherView } from '../../contracts/SeasonRenderBundle';
import type { GridLayout } from '../../maze/GridView';

interface Petal {
	x: number;
	y: number;
	speed: number;
	drift: number;
	size: number;
	alpha: number;
	phase: number;
	color: string;
}

const COUNT = 42;

export class SpringWeather implements WeatherView {
	private petals: Petal[] | null = null;

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

		if (!this.petals) {
			this.petals = [];
			const colors = ['#ffd7ea', '#fff4f9', '#ffc4e0', '#e8ffd8'];

			for (let i = 0; i < COUNT; i += 1) {
				this.petals.push({
					x: Math.random(),
					y: Math.random(),
					speed: 0.02 + Math.random() * 0.035,
					drift: 0.004 + Math.random() * 0.012,
					size: 0.045 + Math.random() * 0.05,
					alpha: 0.35 + Math.random() * 0.4,
					phase: Math.random() * Math.PI * 2,
					color: colors[Math.floor(Math.random() * colors.length)] ?? '#ffd7ea'
				});
			}
		}

		ctx.save();

		for (const petal of this.petals) {
			petal.y += petal.speed * safeDt;
			petal.x += (petal.drift + Math.sin(safeTime + petal.phase) * 0.006) * safeDt;

			if (petal.y > 1.02) {
				petal.y = -0.02;
				petal.x = Math.random();
			}

			if (petal.x > 1.02) {
				petal.x = -0.02;
			}

			const radius = Math.max(0.7, petal.size * layout.tileSize);
			ctx.globalAlpha = petal.alpha;
			ctx.fillStyle = petal.color;
			ctx.save();
			ctx.translate(petal.x * viewportWidth, petal.y * viewportHeight);
			ctx.rotate(safeTime * 1.5 + petal.phase);
			ctx.beginPath();
			ctx.ellipse(0, 0, radius, radius * 0.6, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		ctx.restore();
	}
}
