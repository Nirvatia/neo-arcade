import type { AmbientLayer } from '../contract/renderers.js';
import { C } from './LunarPalette.js';
import { fillCircle, fillEllipse, strokeCircle } from '../../canvas/canvasDraw.js';

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
	private readonly fireflies: Firefly[] = [];
	private readonly mists: Mist[] = [];
	private rings: Ring[] = [];
	private ringTimer = 2;
	private readonly fish: Fish[] = [];
	private readonly sparkles: Sparkle[] = [];
	private readonly stars: Star[] = [];

	private W = 0;
	private H = 0;
	private B = 0;
	private t = 0;

	// Лунная дорожка.
	private bandAx = 0;
	private bandAy = 0;
	private bandBx = 0;
	private bandBy = 0;
	private bandNx = 0;
	private bandNy = 0;
	private bandWA = 0;
	private bandWB = 0;

	constructor() {
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
				a: 0.018 + Math.random() * 0.014
			});
		}

		this.fish.push(
			{
				cx: 0.5,
				cy: 0.52,
				rx: 0.24,
				ry: 0.18,
				a: Math.random() * 6.28,
				speed: 0.16,
				ph: Math.random() * 6.28
			},
			{
				cx: 0.44,
				cy: 0.6,
				rx: 0.16,
				ry: 0.12,
				a: Math.random() * 6.28,
				speed: -0.22,
				ph: Math.random() * 6.28
			}
		);

		for (let i = 0; i < 12; i++) {
			this.sparkles.push({
				t: 0.08 + Math.random() * 0.85,
				u: (Math.random() * 2 - 1) * 0.8,
				ph: Math.random() * 6.28
			});
		}

		for (let i = 0; i < 24; i++) {
			this.stars.push({
				x: Math.random() * 600,
				y: Math.random() * 400,
				base: 0.07 + Math.random() * 0.11,
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

		if (this.W !== W || this.H !== H || this.B !== B) {
			this.W = W;
			this.H = H;
			this.B = B;
			this.redistribute(W, H, B);
		}

		this.t = t;

		// Лунная дорожка.
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

			if (m.x < B + 8) {
				m.x = W - B - 8;
			}

			if (m.x > W - B - 8) {
				m.x = B + 8;
			}
		}

		// Кольца на воде.
		this.ringTimer -= dt;

		if (this.ringTimer <= 0 && this.rings.length < 8) {
			this.ringTimer = 2.5 + Math.random() * 3;

			this.rings.push({
				x: B + 10 + Math.random() * Math.max(1, W - B * 2 - 20),
				y: B + 10 + Math.random() * Math.max(1, H - B * 2 - 20),
				r: 2,
				a: 0.36
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
	}

	/**
	 * Фоновый амбиент.
	 * Рисуется до еды, токенов и змейки.
	 */
	public render(ctx: CanvasRenderingContext2D): void {
		const W = this.W;
		const H = this.H;

		if (W <= 0 || H <= 0) {
			return;
		}

		ctx.save();
		ctx.lineCap = 'round';

		this.renderStars(ctx);
		this.renderMoonSparkles(ctx);
		this.renderRings(ctx, 0.75);
		this.renderFish(ctx);

		// Первая половина тумана — за игровыми объектами.
		this.renderMist(ctx, 0, 2);

		ctx.restore();
	}

	/**
	 * Передний план амбиента.
	 * Рисуется после змейки.
	 */
	public renderForeground(ctx: CanvasRenderingContext2D): void {
		const W = this.W;
		const H = this.H;

		if (W <= 0 || H <= 0) {
			return;
		}

		ctx.save();
		ctx.lineCap = 'round';

		// Вторая половина тумана — поверх змейки, но очень мягкая.
		this.renderMist(ctx, 2, this.mists.length);

		// Светлячки всегда читаются лучше поверх сцены.
		this.renderFireflies(ctx);

		ctx.restore();
	}

	public destroy(): void {
		this.fireflies.length = 0;
		this.mists.length = 0;
		this.rings.length = 0;
		this.fish.length = 0;
		this.sparkles.length = 0;
		this.stars.length = 0;

		this.W = 0;
		this.H = 0;
		this.B = 0;
		this.t = 0;
	}

	private renderStars(ctx: CanvasRenderingContext2D): void {
		const W = this.W;
		const H = this.H;
		const B = this.B;
		const t = this.t;

		for (const s of this.stars) {
			const sx = Math.max(B + 8, Math.min(W - B - 8, s.x));
			const sy = Math.max(B + 8, Math.min(H - B - 8, s.y));

			const a = s.base * (0.6 + 0.4 * Math.sin(t * s.speed + s.ph));

			// Мягкий ореол.
			fillCircle(ctx, sx, sy, 2.1, C.star, a * 0.35);

			// Ядро звезды.
			fillCircle(ctx, sx, sy, 1.05, C.star, a * 1.5);
		}
	}

	private renderMoonSparkles(ctx: CanvasRenderingContext2D): void {
		const t = this.t;

		const bdx = this.bandBx - this.bandAx;
		const bdy = this.bandBy - this.bandAy;
		const bdl = Math.hypot(bdx, bdy) || 1;

		const ux = bdx / bdl;
		const uy = bdy / bdl;

		for (const s of this.sparkles) {
			const a = Math.pow(Math.max(0, Math.sin(t * 1.3 + s.ph)), 2) * 0.15;

			if (a < 0.02) {
				continue;
			}

			const hw = this.bandWA + (this.bandWB - this.bandWA) * s.t;

			const x = this.bandAx + bdx * s.t + this.bandNx * s.u * hw;
			const y = this.bandAy + bdy * s.t + this.bandNy * s.u * hw;

			fillCircle(ctx, x, y, 1.6, C.path, a * 0.65);
			fillCircle(ctx, x, y, 0.7, C.star, a * 0.4);
		}
	}

	private renderRings(ctx: CanvasRenderingContext2D, alphaScale: number): void {
		for (const r of this.rings) {
			strokeCircle(ctx, r.x, r.y, r.r, C.path, 1, r.a * 0.42 * alphaScale);

			// Очень слабое внутреннее кольцо.
			if (r.r > 6) {
				strokeCircle(ctx, r.x, r.y, r.r * 0.62, C.path, 1, r.a * 0.16 * alphaScale);
			}
		}
	}

	private renderFish(ctx: CanvasRenderingContext2D): void {
		const W = this.W;
		const H = this.H;
		const B = this.B;
		const t = this.t;

		for (const f of this.fish) {
			const fx = f.cx * W + Math.cos(f.a) * f.rx * W;
			const fy = f.cy * H + Math.sin(f.a) * f.ry * H;

			if (fx < B || fx > W - B || fy < B || fy > H - B) {
				continue;
			}

			const direction = f.speed >= 0 ? 1 : -1;

			const fx2 = f.cx * W + Math.cos(f.a + 0.06 * direction) * f.rx * W;
			const fy2 = f.cy * H + Math.sin(f.a + 0.06 * direction) * f.ry * H;

			const ang = Math.atan2(fy2 - fy, fx2 - fx);
			const wig = Math.sin(t * 3 + f.ph) * 2.5;

			const cos = Math.cos(ang);
			const sin = Math.sin(ang);

			// Мягкое возмущение воды под рыбой.
			fillEllipse(ctx, fx, fy + 2.4, 16, 4.6, C.water2, 0.1);

			// Тело рыбы.
			fillEllipse(ctx, fx, fy, 13, 3.6, C.fish, 0.2);

			// Хвост.
			fillEllipse(ctx, fx - cos * 14, fy - sin * 14 + wig * 0.5, 5, 2.4, C.fish, 0.15);

			// Слабый блик на спине.
			fillEllipse(ctx, fx + cos * 2, fy + sin * 2 - 1, 5.5, 1.2, C.waterLight, 0.06);
		}
	}

	private renderMist(ctx: CanvasRenderingContext2D, start: number, end: number): void {
		for (let i = start; i < end; i++) {
			const m = this.mists[i];

			if (m === undefined) {
				continue;
			}

			// Основной пласт тумана.
			fillEllipse(ctx, m.x, m.y, m.rx, m.rx * 0.32, C.mist, m.a);

			// Смещённый нижний пласт.
			fillEllipse(ctx, m.x + m.rx * 0.3, m.y + 4, m.rx * 0.6, m.rx * 0.22, C.mist, m.a * 0.8);

			// Верхний мягкий пласт.
			fillEllipse(ctx, m.x - m.rx * 0.24, m.y - 3, m.rx * 0.42, m.rx * 0.16, C.mist, m.a * 0.5);
		}
	}

	private renderFireflies(ctx: CanvasRenderingContext2D): void {
		const t = this.t;

		for (const f of this.fireflies) {
			const blink = Math.pow(Math.max(0, Math.sin(t * 1.1 + f.ph)), 2);

			if (blink < 0.05) {
				continue;
			}

			// Большой мягкий ореол.
			fillCircle(ctx, f.x, f.y, 6.5, C.firefly, blink * 0.1);

			// Среднее свечение.
			fillCircle(ctx, f.x, f.y, 2.6, C.firefly, blink * 0.26);

			// Яркое ядро.
			fillCircle(ctx, f.x, f.y, 1.1, 0xfff4c8, blink * 0.92);
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
}
