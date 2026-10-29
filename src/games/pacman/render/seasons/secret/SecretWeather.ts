import type { WeatherView } from '../../contracts/SeasonRenderBundle';
import type { GridLayout } from '../../maze/GridView';

interface Spark {
	x: number;
	y: number;
	speed: number;
	drift: number;
	size: number;
	alpha: number;
	phase: number;
	color: string;
}

const COUNT = 44;

export class SecretWeather implements WeatherView {
	private sparks: Spark[] | null = null;

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

		if (!this.sparks) {
			this.sparks = [];
			const colors = ['#b98fff', '#d9c9ff', '#7fd8ff', '#ff9de2'];

			for (let i = 0; i < COUNT; i += 1) {
				this.sparks.push({
					x: Math.random(),
					y: Math.random(),
					speed: 0.015 + Math.random() * 0.03,
					drift: (Math.random() - 0.5) * 0.012,
					size: 0.035 + Math.random() * 0.04,
					alpha: 0.3 + Math.random() * 0.45,
					phase: Math.random() * Math.PI * 2,
					color: colors[Math.floor(Math.random() * colors.length)] ?? '#b98fff'
				});
			}
		}

		ctx.save();

		for (const spark of this.sparks) {
			spark.y -= spark.speed * safeDt * 0.35;
			spark.x += (spark.drift + Math.sin(safeTime * 0.8 + spark.phase) * 0.006) * safeDt;

			if (spark.y < -0.02) {
				spark.y = 1.02;
				spark.x = Math.random();
			}

			if (spark.x > 1.02) {
				spark.x = -0.02;
			}

			if (spark.x < -0.02) {
				spark.x = 1.02;
			}

			const px = spark.x * viewportWidth;
			const py = spark.y * viewportHeight;
			const twinkle = 0.5 + 0.5 * Math.sin(safeTime * 3 + spark.phase);
			const radius = Math.max(0.6, spark.size * layout.tileSize);

			ctx.globalAlpha = spark.alpha * twinkle * 0.45;
			ctx.fillStyle = spark.color;
			ctx.beginPath();
			ctx.arc(px, py, radius * 2.2, 0, Math.PI * 2);
			ctx.fill();

			ctx.globalAlpha = spark.alpha * twinkle;
			ctx.beginPath();
			ctx.arc(px, py, radius, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}
}
