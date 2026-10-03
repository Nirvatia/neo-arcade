import type { Graphics } from 'pixi.js';
import type { ParticleRender } from '../renderData.js';
import type { ParticleRenderer } from '../renderers.js';

export class LunarParticleRenderer implements ParticleRenderer {
	public render(
		g: Graphics,
		particles: ParticleRender[],
		_timeMS: number,
		_cellSize: number
	): void {
		for (const p of particles) {
			const size = Math.max(1, p.size * p.life);
			g.rect(p.x - size / 2, p.y - size / 2, size, size).fill({
				color: p.color,
				alpha: p.life
			});
		}
	}
}