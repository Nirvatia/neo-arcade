import { Container, Graphics } from 'pixi.js';
import type { AmbientLayer } from '../renderers.js';
import { C } from './LunarPalette.js';

interface Firefly {
	x: number;
	y: number;
	vx: number;
	vy: number;
	t: number;
	ph: number;
}

interface Mist {
	x: number;
	y: number;
	rx: number;
	vx: number;
	a: number;
}

interface Ring {
	x: number;
	y: number;
	r: number;
	a: number;
}

interface Fish {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	a: number;
	speed: number;
	ph: number;
}

interface Sparkle {
	t: number;
	u: number;
	ph: number;
}

interface Star {
	x: number;
	y: number;
	base: number;
	speed: number;
	ph: number;
}

export class LunarAmbient implements AmbientLayer {
	public readonly container: Container;
	private graphics: Graphics | null = null;
	private readonly fireflies: Firefly[] = [];
	private readonly mists: Mist[] = [];
	private rings: Ring[] = [];
	private ringTimer = 2;
	private readonly fish: Fish[] = [];
	private readonly sparkles: Sparkle[] = [];
	private readonly stars: Star[] = [];
	// Лунная дорожка (параметры).
	private bandAx = 0;
	private bandAy = 0;
	private bandBx = 0;
	private bandBy = 0;
	private bandNx = 0;
	private bandNy = 0;
	private bandWA = 0;
	private bandWB = 0;

	constructor() {
		this.container = new Container();
		for (let i = 0; i < 12; i++) {
			this.fireflies.push({
				x: Math.random() * 600,
				y: Math.random() * 400,
				vx: 0,
				vy: 0,
				t: Math.random(),
				ph: Math.random() * 6.28
			});
		}
		for (let i = 0; i < 4; i++) {
			this.mists.push({
				x: Math.random() * 600,
				y: Math.random() * 400,
				rx: 50 + Math.random() * 40,
				vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3),
				a: 0.02 + Math.random() * 0.015
			});
		}
		this.fish.push(
			{ cx: 0.5, cy: 0.52, rx: 0.24, ry: 0.18, a: Math.random() * 6.28, speed: 0.16, ph: Math.random() * 6.28 },
			{ cx: 0.44, cy: 0.6, rx: 0.16, ry: 0.12, a: Math.random() * 6.28, speed: -0.22, ph: Math.random() * 6.28 }
		);
		for (let i = 0; i < 12; i++) {
			this.sparkles.push({
				t: 0.08 + Math.random() * 0.85,
				u: (Math.random() * 2 - 1) * 0.8,
				ph: Math.random() * 6.28
			});
		}
		for (let i = 0; i < 25; i++) {
			this.stars.push({
				x: Math.random() * 600,
				y: Math.random() * 400,
				base: 0.08 + Math.random() * 0.12,
				speed: 0.4 + Math.random() * 0.8,
				ph: Math.random() * 6.28
			});
		}
	}

	public update(
		deltaMS: number,
		timeMS: number,
		cellSize: number,
		cols: number,
		rows: number
	): void {
		const W = cols * cellSize;
		const H = rows * cellSize;
		const B = cellSize;
		const dt = deltaMS * 0.001;
		const t = timeMS * 0.001;

		// Инициализация позиций при первом вызове или смене размера.
		if (this.stars.length > 0 && this.stars[0]!.x > W) {
			this.redistribute(W, H, B);
		}

		// Обновление лунной дорожки.
		this.bandAx = W * 0.92;
		this.bandAy = -H * 0.1;
		this.bandBx = W * 0.3;
		this.bandBy = H * 1.08;
		const dx = this.bandBx - this.bandAx;
		const dy = this.bandBy - this.bandAy;
		const dl = Math.hypot(dx, dy) || 1;
		this.bandNx = -dy / dl;
		this.bandNy = dx / dl;
		this.bandWA = W * 0.04;
		this.bandWB = W * 0.1;

		// Светлячки.
		for (const f of this.fireflies) {
			f.t -= dt;
			if (f.t <= 0) {
				f.t = 0.5 + Math.random() * 1.2;
				const a = Math.random() * 6.28;
				const s = 6 + Math.random() * 12;
				f.vx = Math.cos(a) * s;
				f.vy = Math.sin(a) * s;
			}
			f.x += f.vx * dt;
			f.y += f.vy * dt;
			const drag = Math.exp(-1.4 * dt);
			f.vx *= drag;
			f.vy *= drag;
			f.x = Math.max(B + 8, Math.min(W - B - 8, f.x));
			f.y = Math.max(B + 8, Math.min(H - B - 8, f.y));
		}

		// Туман.
		for (const m of this.mists) {
			m.x += m.vx * dt;
			if (m.x < B + 8) m.x = W - B - 8;
			if (m.x > W - B - 8) m.x = B + 8;
		}

		// Кольца на воде.
		this.ringTimer -= dt;
		if (this.ringTimer <= 0) {
			this.ringTimer = 2.5 + Math.random() * 3;
			this.rings.push({
				x: B + 10 + Math.random() * Math.max(1, W - B * 2 - 20),
				y: B + 10 + Math.random() * Math.max(1, H - B * 2 - 20),
				r: 2,
				a: 0.4
			});
		}
		for (const r of this.rings) {
			r.r += 15 * dt;
			r.a -= dt * 0.3;
		}
		this.rings = this.rings.filter((r) => r.a > 0);

		// Рыбы.
		for (const f of this.fish) {
			f.a += f.speed * dt;
		}

		// ===== Отрисовка =====
		if (this.graphics === null) {
			this.graphics = new Graphics();
			this.container.addChild(this.graphics);
		}
		const g = this.graphics;
		g.clear();

		// Мерцающие звёзды.
		for (const s of this.stars) {
			const sx = Math.max(B + 8, Math.min(W - B - 8, s.x));
			const sy = Math.max(B + 8, Math.min(H - B - 8, s.y));
			const a = s.base * (0.6 + 0.4 * Math.sin(t * s.speed + s.ph));
			g.circle(sx, sy, 1.2).fill({ color: C.star, alpha: a * 1.6 });
		}

		// Искры на лунной дорожке.
		{
			const bdx = this.bandBx - this.bandAx;
			const bdy = this.bandBy - this.bandAy;
			const bdl = Math.hypot(bdx, bdy) || 1;
			const ux = bdx / bdl;
			const uy = bdy / bdl;
			for (const s of this.sparkles) {
				const a = Math.pow(Math.max(0, Math.sin(t * 1.3 + s.ph)), 2) * 0.15;
				if (a < 0.02) continue;
				const hw = this.bandWA + (this.bandWB - this.bandWA) * s.t;
				const x = this.bandAx + bdx * s.t + this.bandNx * s.u * hw;
				const y = this.bandAy + bdy * s.t + this.bandNy * s.u * hw;
				g.moveTo(x - ux * 2.5, y - uy * 2.5)
					.lineTo(x + ux * 2.5, y + uy * 2.5)
					.stroke({ color: C.path, width: 1.2, alpha: a });
			}
		}

		// Кольца на воде.
		for (const r of this.rings) {
			g.circle(r.x, r.y, r.r).stroke({ color: C.path, width: 1, alpha: r.a * 0.5 });
		}

		// Туман.
		for (const m of this.mists) {
			g.ellipse(m.x, m.y, m.rx, m.rx * 0.32).fill({ color: C.mist, alpha: m.a });
			g.ellipse(m.x + m.rx * 0.3, m.y + 4, m.rx * 0.6, m.rx * 0.22).fill({
				color: C.mist,
				alpha: m.a * 0.8
			});
		}

		// Рыбы (тени под водой).
		for (const f of this.fish) {
			const fx = f.cx * W + Math.cos(f.a) * f.rx * W;
			const fy = f.cy * H + Math.sin(f.a) * f.ry * H;
			if (fx < B || fx > W - B || fy < B || fy > H - B) continue;
			const fx2 = f.cx * W + Math.cos(f.a + 0.06 * Math.sign(f.speed)) * f.rx * W;
			const fy2 = f.cy * H + Math.sin(f.a + 0.06 * Math.sign(f.speed)) * f.ry * H;
			const ang = Math.atan2(fy2 - fy, fx2 - fx);
			const wig = Math.sin(t * 3 + f.ph) * 2.5;
			g.save?.();
			// Тело рыбы (тень).
			const cos = Math.cos(ang);
			const sin = Math.sin(ang);
			g.ellipse(fx, fy, 13, 3.6).fill({ color: C.fish, alpha: 0.2 });
			// Хвост.
			g.ellipse(fx - cos * 14, fy - sin * 14 + wig * 0.5, 5, 2.4).fill({
				color: C.fish,
				alpha: 0.16
			});
		}

		// Светлячки.
		for (const f of this.fireflies) {
			const blink = Math.pow(Math.max(0, Math.sin(t * 1.1 + f.ph)), 2);
			if (blink < 0.04) continue;
			g.circle(f.x, f.y, 5).fill({ color: C.firefly, alpha: blink * 0.22 });
			g.circle(f.x, f.y, 1.3).fill({ color: 0xfff4c8, alpha: blink * 0.9 });
		}
	}

	private redistribute(W: number, H: number, B: number): void {
		for (const s of this.stars) {
			s.x = B + 8 + Math.random() * Math.max(1, W - B * 2 - 16);
			s.y = B + 8 + Math.random() * Math.max(1, H - B * 2 - 16);
		}
		for (const f of this.fireflies) {
			f.x = B + 8 + Math.random() * Math.max(1, W - B * 2 - 16);
			f.y = B + 8 + Math.random() * Math.max(1, H - B * 2 - 16);
		}
		for (const m of this.mists) {
			m.x = B * 2 + Math.random() * Math.max(1, W - B * 4);
			m.y = B * 2 + Math.random() * Math.max(1, H - B * 4);
		}
	}

	public destroy(): void {
		this.container.destroy({ children: true });
		this.graphics = null;
		this.fireflies.length = 0;
		this.mists.length = 0;
		this.rings.length = 0;
		this.fish.length = 0;
		this.sparkles.length = 0;
		this.stars.length = 0;
	}
}