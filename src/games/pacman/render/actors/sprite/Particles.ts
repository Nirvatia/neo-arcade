// A small particle pool for the character sprites. Emission is decided by the caller (by
// distance travelled or by an event), randomness comes from a seeded generator, and every
// particle fades out smoothly over its life: no per-frame noise, so nothing flickers.
import type { RGB } from './bakeKit';
import { glowSprite, rgba, seeded } from './bakeKit';

export type ParticleShape = 'glow' | 'star' | 'heart' | 'ember';

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	spin: number;
	rot: number;
	color: RGB;
	shape: ParticleShape;
	active: boolean;
}

export interface ParticleSpec {
	readonly x: number;
	readonly y: number;
	readonly vx: number;
	readonly vy: number;
	readonly life: number;
	readonly size: number;
	readonly color: RGB;
	readonly shape: ParticleShape;
	readonly spin?: number;
}

const glows = new Map<string, HTMLCanvasElement>();
function glowFor(c: RGB): HTMLCanvasElement {
	const key = c.join(',');
	let g = glows.get(key);
	if (!g) {
		g = glowSprite(c);
		glows.set(key, g);
	}
	return g;
}

export class Particles {
	private readonly pool: Particle[];
	readonly random: () => number;

	constructor(size: number, seed: number) {
		this.random = seeded(seed);
		this.pool = Array.from({ length: size }, () => ({
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			life: 0,
			max: 1,
			size: 1,
			spin: 0,
			rot: 0,
			color: [255, 255, 255] as RGB,
			shape: 'glow' as ParticleShape,
			active: false
		}));
	}

	reset(): void {
		for (const p of this.pool) p.active = false;
	}

	spawn(s: ParticleSpec): void {
		const p = this.pool.find((q) => !q.active);
		if (!p) return;
		p.x = s.x;
		p.y = s.y;
		p.vx = s.vx;
		p.vy = s.vy;
		p.life = s.life;
		p.max = s.life;
		p.size = s.size;
		p.color = s.color;
		p.shape = s.shape;
		p.spin = s.spin ?? 0;
		p.rot = this.random() * Math.PI * 2;
		p.active = true;
	}

	update(dt: number, drag = 0.9): void {
		const k = Math.pow(drag, dt * 60);
		for (const p of this.pool) {
			if (!p.active) continue;
			p.life -= dt;
			if (p.life <= 0) {
				p.active = false;
				continue;
			}
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= k;
			p.vy *= k;
			p.rot += p.spin * dt;
		}
	}

	draw(ctx: CanvasRenderingContext2D): void {
		for (const p of this.pool) {
			if (!p.active) continue;
			const u = p.life / p.max;
			// ease in quickly, fade out slowly
			const a = Math.min(1, (1 - u) * 6) * Math.pow(u, 0.8);
			const s = p.size * (0.6 + 0.4 * u);
			ctx.globalAlpha = a * 0.7;
			const g = glowFor(p.color);
			ctx.drawImage(g, p.x - s * 2.2, p.y - s * 2.2, s * 4.4, s * 4.4);
			ctx.globalAlpha = a;
			if (p.shape === 'star') {
				ctx.fillStyle = 'rgba(255,255,250,1)';
				ctx.beginPath();
				for (let i = 0; i < 4; i++) {
					const an = p.rot + (i * Math.PI) / 2;
					ctx.lineTo(p.x + Math.cos(an) * s * 1.6, p.y + Math.sin(an) * s * 1.6);
					ctx.lineTo(
						p.x + Math.cos(an + Math.PI / 4) * s * 0.35,
						p.y + Math.sin(an + Math.PI / 4) * s * 0.35
					);
				}
				ctx.closePath();
				ctx.fill();
			} else if (p.shape === 'heart') {
				ctx.fillStyle = rgba(p.color, 1);
				const h = s * 1.2;
				ctx.beginPath();
				ctx.moveTo(p.x, p.y + h * 0.9);
				ctx.bezierCurveTo(
					p.x - h * 1.3,
					p.y + h * 0.1,
					p.x - h * 0.9,
					p.y - h * 1.1,
					p.x,
					p.y - h * 0.4
				);
				ctx.bezierCurveTo(
					p.x + h * 0.9,
					p.y - h * 1.1,
					p.x + h * 1.3,
					p.y + h * 0.1,
					p.x,
					p.y + h * 0.9
				);
				ctx.fill();
			} else {
				ctx.fillStyle = p.shape === 'ember' ? rgba(p.color, 1) : 'rgba(255,255,245,1)';
				ctx.beginPath();
				ctx.arc(p.x, p.y, s * (p.shape === 'ember' ? 0.55 : 0.45), 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.globalAlpha = 1;
	}
}
