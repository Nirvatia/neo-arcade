import type { WeatherView } from '../../contracts/SeasonRenderBundle';
import type { GridLayout } from '../../GridView';

interface Leaf {
	x: number;
	y: number;
	speed: number;
	drift: number;
	size: number;
	alpha: number;
	phase: number;
	color: string;
}

const COUNT = 40;

export class AutumnWeather implements WeatherView {
	private leaves: Leaf[] | null = null;

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

		if (!this.leaves) {
			this.leaves = [];
			const colors = ['#ffb14d', '#ff6b4d', '#ffd34d', '#d9532f'];

			for (let i = 0; i < COUNT; i += 1) {
				this.leaves.push({
					x: Math.random(),
					y: Math.random(),
					speed: 0.02 + Math.random() * 0.04,
					drift: (Math.random() - 0.5) * 0.012,
					size: 0.045 + Math.random() * 0.05,
					alpha: 0.35 + Math.random() * 0.4,
					phase: Math.random() * Math.PI * 2,
					color: colors[Math.floor(Math.random() * colors.length)] ?? '#ffb14d'
				});
			}
		}

		ctx.save();

		for (const leaf of this.leaves) {
			leaf.y += leaf.speed * safeDt;
			leaf.x += (leaf.drift + Math.sin(safeTime * 0.9 + leaf.phase) * 0.007) * safeDt;

			if (leaf.y > 1.02) {
				leaf.y = -0.02;
				leaf.x = Math.random();
			}

			if (leaf.x > 1.02) {
				leaf.x = -0.02;
			}

			if (leaf.x < -0.02) {
				leaf.x = 1.02;
			}

			const px = leaf.x * viewportWidth;
			const py = leaf.y * viewportHeight;
			const radius = Math.max(0.7, leaf.size * layout.tileSize);

			ctx.globalAlpha = leaf.alpha;
			ctx.fillStyle = leaf.color;
			ctx.save();
			ctx.translate(px, py);
			ctx.rotate(safeTime * 1.2 + leaf.phase);
			ctx.beginPath();
			ctx.ellipse(0, 0, radius, radius * 0.6, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		ctx.restore();
	}
}