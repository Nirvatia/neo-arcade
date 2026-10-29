import type { WeatherView } from '../../contracts/SeasonRenderBundle';
import type { GridLayout } from '../../maze/GridView';

interface Snowflake {
	x: number;
	y: number;
	speed: number;
	drift: number;
	size: number;
	alpha: number;
	phase: number;
}

const COUNT = 48;

export class WinterWeather implements WeatherView {
	private flakes: Snowflake[] | null = null;

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

		if (!this.flakes) {
			this.flakes = [];

			for (let i = 0; i < COUNT; i += 1) {
				this.flakes.push({
					x: Math.random(),
					y: Math.random(),
					speed: 0.02 + Math.random() * 0.04,
					drift: 0.005 + Math.random() * 0.012,
					size: 0.04 + Math.random() * 0.05,
					alpha: 0.35 + Math.random() * 0.4,
					phase: Math.random() * Math.PI * 2
				});
			}
		}

		ctx.save();

		for (const flake of this.flakes) {
			flake.y += flake.speed * safeDt;
			flake.x += (flake.drift + Math.sin(safeTime + flake.phase) * 0.008) * safeDt;

			if (flake.y > 1.02) {
				flake.y = -0.02;
				flake.x = Math.random();
			}

			if (flake.x > 1.02) {
				flake.x = -0.02;
			}

			const radius = Math.max(0.7, flake.size * layout.tileSize);
			ctx.globalAlpha = flake.alpha;
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.arc(flake.x * viewportWidth, flake.y * viewportHeight, radius, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}
}
