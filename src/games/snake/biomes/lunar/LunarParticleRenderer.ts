import type { ParticleRender } from '../contract/renderData.js';
import type { ParticleRenderer } from '../contract/renderers.js';
import { fillCircle } from '../../canvas/canvasDraw.js';

/**
 * Lunar Particle Renderer.
 *
 * Улучшенная отрисовка частиц:
 * - круглые частицы вместо квадратов;
 * - трёхслойное свечение (ореол, тело, ядро);
 * - квадратичное затухание для плавного исчезновения.
 */
export class LunarParticleRenderer implements ParticleRenderer {
	public render(
		ctx: CanvasRenderingContext2D,
		particles: ParticleRender[],
		_timeMS: number,
		_cellSize: number
	): void {
		for (const p of particles) {
			const size = Math.max(0.5, p.size * p.life);
			// Квадратичное затухание для более плавного исчезновения.
			const alpha = p.life * p.life;

			if (alpha <= 0.01) {
				continue;
			}

			// Внешнее мягкое свечение.
			fillCircle(ctx, p.x, p.y, size * 2.8, p.color, alpha * 0.12);

			// Средний слой свечения.
			fillCircle(ctx, p.x, p.y, size * 1.6, p.color, alpha * 0.3);

			// Основное тело частицы.
			fillCircle(ctx, p.x, p.y, size, p.color, alpha);

			// Яркое ядро для крупных частиц.
			if (size > 1.5) {
				fillCircle(
					ctx,
					p.x,
					p.y,
					size * 0.35,
					0xffffff,
					alpha * 0.7
				);
			}
		}
	}
}