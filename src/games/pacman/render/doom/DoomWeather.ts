import type { WeatherView } from '../contracts/SeasonRenderBundle';
import type { GridLayout } from '../GridView';

interface Ember {
	x: number;
	y: number;
	speed: number;
	drift: number;
	size: number;
	alpha: number;
	phase: number;
	color: string;
}

const COUNT = 46;

export class DoomWeather implements WeatherView {
	private embers: Ember[] | null = null;

	draw(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		viewportWidth: number,
		viewportHeight: number,
		dt: number,
		time: number
	): void {
		if (
			!Number.isFinite(viewportWidth) || viewportWidth <= 0 ||
			!Number.isFinite(viewportHeight) || viewportHeight <= 0 ||
			!Number.isFinite(layout.tileSize) || layout.tileSize <= 0
		) {
			return;
		}
		const safeDt = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
		const safeTime = Number.isFinite(time) && time >= 0 ? time : 0;
		if (!this.embers) {
			this.embers = [];
			const colors = ['#ff4d4d', '#ff9d4d', '#ffd34d', '#ff6b6b'];
			for (let i = 0; i < COUNT; i += 1) {
				this.embers.push({
					x: Math.random(),
					y: Math.random(),
					speed: 0.018 + Math.random() * 0.035,
					drift: (Math.random() - 0.5) * 0.014,
					size: 0.035 + Math.random() * 0.045,
					alpha: 0.3 + Math.random() * 0.45,
					phase: Math.random() * Math.PI * 2,
					color: colors[Math.floor(Math.random() * colors.length)] ?? '#ff4d4d'
				});
			}
		}
		ctx.save();
		for (const ember of this.embers) {
			ember.y -= ember.speed * safeDt * 0.35;
			ember.x += (ember.drift + Math.sin(safeTime * 0.9 + ember.phase) * 0.007) * safeDt;
			if (ember.y < -0.02) {
				ember.y = 1.02;
				ember.x = Math.random();
			}
			if (ember.y > 1.02) {
				ember.y = -0.02;
			}
			if (ember.x > 1.02) {
				ember.x = -0.02;
			}
			if (ember.x < -0.02) {
				ember.x = 1.02;
			}
			const px = ember.x * viewportWidth;
			const py = ember.y * viewportHeight;
			const twinkle = 0.5 + 0.5 * Math.sin(safeTime * 4 + ember.phase);
			const radius = Math.max(0.6, ember.size * layout.tileSize);
			ctx.globalAlpha = ember.alpha * twinkle * 0.35;
			ctx.fillStyle = ember.color;
			ctx.beginPath();
			ctx.arc(px, py, radius * 2.3, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = ember.alpha * twinkle;
			ctx.beginPath();
			ctx.arc(px, py, radius, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}
}