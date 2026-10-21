import type { SeasonName } from '../logic/SeasonCatalog';
import type { GridLayout } from './GridView';

interface WeatherParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	alpha: number;
	phase: number;
}

const SPRING_COUNT = 24;
const SUMMER_COUNT = 14;
const AUTUMN_COUNT = 56;
const WINTER_COUNT = 42;

export class WeatherView {
	private particles: WeatherParticle[] = [];
	private seasonValue: SeasonName | null = null;
	private timeValue = 0;

	draw(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		gridWidth: number,
		gridHeight: number,
		season: SeasonName,
		dt: number
	): void {
		if (!Number.isFinite(dt) || dt < 0) {
			return;
		}
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			return;
		}
		if (this.seasonValue !== season) {
			this.seasonValue = season;
			this.initParticles(season, gridWidth, gridHeight);
		}
		this.timeValue += dt;
		this.updateParticles(dt, gridWidth, gridHeight, season);
		const pw = gridWidth * layout.tileSize;
		const ph = gridHeight * layout.tileSize;
		ctx.save();
		ctx.beginPath();
		ctx.rect(layout.offsetX, layout.offsetY, pw, ph);
		ctx.clip();
		this.drawParticles(ctx, layout, season);
		ctx.restore();
	}

	private initParticles(season: SeasonName, gw: number, gh: number): void {
		const count = this.countFor(season);
		this.particles = [];
		for (let i = 0; i < count; i += 1) {
			this.particles.push(this.spawnParticle(season, gw, gh, true));
		}
	}

	private countFor(season: SeasonName): number {
		if (season === 'spring') return SPRING_COUNT;
		if (season === 'summer') return SUMMER_COUNT;
		if (season === 'autumn') return AUTUMN_COUNT;
		return WINTER_COUNT;
	}

	private spawnParticle(season: SeasonName, gw: number, gh: number, randomY: boolean): WeatherParticle {
		const x = Math.random() * gw;
		const y = randomY ? Math.random() * gh : -2;
		if (season === 'autumn') {
			return { x, y, vx: -1.2 - Math.random() * 0.8, vy: 8 + Math.random() * 4, size: 1, alpha: 0.25 + Math.random() * 0.2, phase: Math.random() * Math.PI * 2 };
		}
		if (season === 'winter') {
			return { x, y, vx: 0.6 + Math.random() * 1.2, vy: 2.5 + Math.random() * 2, size: 1.5 + Math.random() * 1.5, alpha: 0.4 + Math.random() * 0.35, phase: Math.random() * Math.PI * 2 };
		}
		if (season === 'spring') {
			return { x, y, vx: 0.3 + Math.random() * 0.5, vy: 1.2 + Math.random() * 0.8, size: 2 + Math.random() * 1.5, alpha: 0.35 + Math.random() * 0.25, phase: Math.random() * Math.PI * 2 };
		}
		return { x: Math.random() * gw, y: Math.random() * gh, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.3, size: 1.5 + Math.random() * 1, alpha: 0.3 + Math.random() * 0.4, phase: Math.random() * Math.PI * 2 };
	}

	private updateParticles(dt: number, gw: number, gh: number, season: SeasonName): void {
		for (let i = 0; i < this.particles.length; i += 1) {
			const p = this.particles[i];
			if (!p) continue;
			if (season === 'spring') {
				p.x += (p.vx + Math.sin(this.timeValue * 2 + p.phase) * 0.6) * dt;
				p.y += p.vy * dt;
			} else if (season === 'autumn') {
				p.x += p.vx * dt;
				p.y += p.vy * dt;
			} else if (season === 'winter') {
				p.x += (p.vx + Math.sin(this.timeValue * 1.5 + p.phase) * 0.8) * dt;
				p.y += p.vy * dt;
			} else {
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.alpha = 0.3 + 0.3 * Math.abs(Math.sin(this.timeValue * 2.5 + p.phase));
			}
			if (p.y > gh + 2 || p.x < -2 || p.x > gw + 2) {
				this.particles[i] = this.spawnParticle(season, gw, gh, false);
			}
			if (season === 'summer' && (p.y < -2 || p.y > gh + 2 || p.x < -2 || p.x > gw + 2)) {
				this.particles[i] = this.spawnParticle(season, gw, gh, true);
			}
		}
	}

	private drawParticles(ctx: CanvasRenderingContext2D, layout: GridLayout, season: SeasonName): void {
		const ts = layout.tileSize;
		for (const p of this.particles) {
			const px = layout.offsetX + p.x * ts;
			const py = layout.offsetY + p.y * ts;
			ctx.globalAlpha = Math.min(1, Math.max(0, p.alpha));
			if (season === 'autumn') {
				ctx.strokeStyle = 'rgba(160, 200, 255, 0.6)';
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(px, py);
				ctx.lineTo(px + p.vx * ts * 0.12, py + p.vy * ts * 0.12);
				ctx.stroke();
			} else if (season === 'winter') {
				ctx.fillStyle = '#e8f0ff';
				ctx.beginPath();
				ctx.arc(px, py, p.size * ts * 0.06, 0, Math.PI * 2);
				ctx.fill();
			} else if (season === 'spring') {
				ctx.fillStyle = '#ffb7d5';
				ctx.beginPath();
				ctx.arc(px, py, p.size * ts * 0.05, 0, Math.PI * 2);
				ctx.fill();
			} else {
				ctx.fillStyle = '#ffe89d';
				ctx.beginPath();
				ctx.arc(px, py, p.size * ts * 0.05, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.globalAlpha = 1;
	}
}