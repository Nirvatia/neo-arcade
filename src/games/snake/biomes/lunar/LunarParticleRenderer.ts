import type { ParticleRender } from '../contract/renderData.js';
import type { ParticleRenderer } from '../contract/renderers.js';
import { fillCircle } from '../../canvas/canvasDraw.js';

export class LunarParticleRenderer implements ParticleRenderer {
	public render(
		ctx: CanvasRenderingContext2D,
		particles: ParticleRender[],
		count: number,
		_timeMS: number,
		_cellSize: number
	): void {
		for (let i = 0; i < count; i++) {
			const p = particles[i];
			if (p === undefined) continue;
			
			const size = Math.max(0.5, p.size * p.life);
			const alpha = p.life * p.life;
			if (alpha <= 0.01) continue;
			
			fillCircle(ctx, p.x, p.y, size * 2.8, p.color, alpha * 0.12);
			fillCircle(ctx, p.x, p.y, size * 1.6, p.color, alpha * 0.3);
			fillCircle(ctx, p.x, p.y, size, p.color, alpha);
			
			if (size > 1.5) {
				fillCircle(ctx, p.x, p.y, size * 0.35, 0xffffff, alpha * 0.7);
			}
		}
	}
}