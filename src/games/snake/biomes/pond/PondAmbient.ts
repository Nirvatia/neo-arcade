import { Container, Graphics } from 'pixi.js';
import type { AmbientLayer } from '../renderers.js';
import { C } from './PondPalette.js';

interface Mote {
	x: number;
	y: number;
	vy: number;
	ph: number;
	sz: number;
	a: number;
}

interface Strider {
	x: number;
	y: number;
	vx: number;
	vy: number;
	t: number;
}

export class PondAmbient implements AmbientLayer {
	public readonly container: Container;

	private graphics: Graphics | null = null;
	private readonly motes: Mote[] = [];
	private readonly striders: Strider[] = [];

	constructor() {
		this.container = new Container();

		for (let i = 0; i < 8; i++) {
			this.motes.push({
				x: Math.random() * 600,
				y: Math.random() * 400,
				vy: -(2 + Math.random() * 5),
				ph: Math.random() * 6.28,
				sz: 0.6 + Math.random() * 0.8,
				a: 0.08 + Math.random() * 0.14
			});
		}

		for (let i = 0; i < 2; i++) {
			this.striders.push({
				x: Math.random() * 600,
				y: Math.random() * 400,
				vx: (Math.random() - 0.5) * 60,
				vy: (Math.random() - 0.5) * 60,
				t: Math.random() * 2
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

		for (const m of this.motes) {
			m.y += m.vy * dt;
			m.x += Math.sin(t * 0.7 + m.ph) * 2 * dt;

			if (m.y < B) {
				m.y = H - B;
				m.x = B + Math.random() * Math.max(1, W - B * 2);
			}
		}

		for (const s of this.striders) {
			s.t -= dt;

			if (s.t <= 0) {
				s.t = 0.6 + Math.random() * 1.4;

				const a = Math.random() * 6.28;
				const sp = 20 + Math.random() * 30;

				s.vx = Math.cos(a) * sp;
				s.vy = Math.sin(a) * sp;
			}

			s.x += s.vx * dt;
			s.y += s.vy * dt;

			const drag = Math.exp(-1.8 * dt);

			s.vx *= drag;
			s.vy *= drag;

			s.x = Math.max(B + 8, Math.min(W - B - 8, s.x));
			s.y = Math.max(B + 8, Math.min(H - B - 8, s.y));
		}

		if (this.graphics === null) {
			this.graphics = new Graphics();
			this.container.addChild(this.graphics);
		}

		const g = this.graphics;

		g.clear();

		// Солнечные блики
		for (let k = 0; k < 2; k++) {
			const gx = W * 0.3 + k * W * 0.4 + Math.sin(t * 0.3 + k) * 18;
			const gy = H * 0.4 + Math.cos(t * 0.25 + k) * 12;

			g.circle(gx, gy, 75).fill({ color: C.sun, alpha: 0.03 });
			g.circle(gx, gy, 42).fill({ color: C.sun, alpha: 0.03 });
		}

		// Светящиеся частички
		for (const m of this.motes) {
			g.circle(m.x, m.y, m.sz).fill({ color: 0xffe9a0, alpha: m.a });
		}

		// Водомерки на фоне
		for (const s of this.striders) {
			g.ellipse(s.x, s.y + 2, 4.5, 2.2).fill({ color: C.shoreDark, alpha: 0.15 });

			for (let k = 0; k < 6; k++) {
				const a = (k / 6) * 6.28;
				const len = 5.5 + Math.sin(t * 4 + k) * 1.2;

				g.moveTo(s.x, s.y).lineTo(s.x + Math.cos(a) * len, s.y + Math.sin(a) * len);
				g.stroke({ color: 0x283218, width: 0.8, alpha: 0.6 });
			}

			g.ellipse(s.x, s.y, 2.2, 1.3).fill({ color: C.mud, alpha: 0.8 });
		}
	}

	public destroy(): void {
		this.container.destroy({ children: true });
		this.graphics = null;
		this.motes.length = 0;
		this.striders.length = 0;
	}
}