import type { Graphics } from 'pixi.js';
import type {
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from '../renderData.js';
import type { SnakeRenderer } from '../renderers.js';
import { C } from './PondPalette.js';

interface Bubble {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
}

interface ZonePal {
	mid: number;
	edge: number;
	core: number;
	active: boolean;
}

/** Смешивает два цвета. t=0 → a, t=1 → b. */
function mixColor(a: number, b: number, t: number): number {
	const ar = (a >> 16) & 0xff;
	const ag = (a >> 8) & 0xff;
	const ab = a & 0xff;
	const br = (b >> 16) & 0xff;
	const bg = (b >> 8) & 0xff;
	const bb = b & 0xff;
	const r = Math.round(ar + (br - ar) * t);
	const g = Math.round(ag + (bg - ag) * t);
	const bl = Math.round(ab + (bb - ab) * t);
	return (r << 16) | (g << 8) | bl;
}

/**
 * Контур головы в локальных координатах (x — вперёд, y — вбок).
 * Узкая шея сзади, широкие скулы, сужающаяся тупая морда.
 */
const HEAD_SHAPE: readonly (readonly [number, number])[] = [
	[10.0, 0],
	[8.8, -2.7],
	[6.0, -4.7],
	[2.0, -5.3],
	[-1.5, -4.6],
	[-4.2, -4.0],
	[-5.6, 0],
	[-4.2, 4.0],
	[-1.5, 4.6],
	[2.0, 5.3],
	[6.0, 4.7],
	[8.8, 2.7]
];

/** Светлая полоса вдоль макушки — «солнечный» верх головы. */
const HEAD_STRIPE: readonly (readonly [number, number])[] = [
	[9.3, -0.85],
	[4.0, -1.25],
	[-1.0, -1.15],
	[-4.0, 0],
	[-1.0, 1.15],
	[4.0, 1.25],
	[9.3, 0.85]
];

/** Серп нижней челюсти — кремовое брюшко, переходящее на голову. */
const HEAD_JAW: readonly (readonly [number, number])[] = [
	[9.8, 0.6],
	[8.8, 2.6],
	[6.0, 4.6],
	[2.0, 5.2],
	[-1.5, 4.5],
	[-3.6, 3.6],
	[-1.0, 2.6],
	[2.5, 3.0],
	[6.0, 2.2],
	[8.4, 0.9]
];

/**
 * Арт змейки Пруда: уж, греющийся на солнце.
 *
 * Природная палитра, но резко светлее тёмной воды — читается мгновенно.
 * Тело: песочно-золотое, с тёмными пятнами на спине, кремовым брюшком
 * и солнечным бликом сверху. Активные биты — цветные кольца без неона.
 */
export class PondSnakeRenderer implements SnakeRenderer {
	private bubbleTimerMS = 0;
	private readonly bubbles: Bubble[] = [];
	private lastFxTimeMS = -1;

	public render(
		g: Graphics,
		chain: SnakeChainPoint[],
		zones: SnakeZoneStyle[],
		head: SnakeHeadRender,
		timeMS: number,
		cellSize: number
	): void {
		if (chain.length < 2 || zones.length === 0) {
			return;
		}

		const dt =
			this.lastFxTimeMS < 0
				? 1 / 60
				: Math.min(50, timeMS - this.lastFxTimeMS) / 1000;
		this.lastFxTimeMS = timeMS;

		const t = timeMS / 1000;
		const totalLen = zones.length * cellSize;
		const radius = Math.max(2.8, cellSize * 0.155);

		this.drawRipples(g, head, t);
		this.drawShadow(g, chain, totalLen, radius);
		this.drawOutline(g, chain, totalLen, radius);
		this.drawFill(g, chain, zones, totalLen, radius);
		this.drawShading(g, chain, zones, totalLen, radius);
		this.drawMarkings(g, chain, totalLen, radius, cellSize);
		this.drawSeparators(g, chain, totalLen, radius, cellSize);
		this.updateBubbles(g, dt, head.x, head.y, head.moving);
		this.drawHead(g, head.x, head.y, head.angle, t, cellSize);
	}

	// ===== Едва заметная рябь на воде =====
	private drawRipples(g: Graphics, head: SnakeHeadRender, t: number): void {
		if (!head.moving) {
			return;
		}
		for (let k = 0; k < 2; k++) {
			const r = (t * 1.2 + k * 2.5) % 4;
			if (r < 1) {
				g.circle(head.x, head.y + 2, 5 + r * 10).stroke({
					color: C.grid,
					width: 0.8,
					alpha: (1 - r) * 0.08
				});
			}
		}
	}

	// ===== Контактная тень: «прижимает» змейку к воде =====
	private drawShadow(
		g: Graphics,
		chain: SnakeChainPoint[],
		totalLen: number,
		radius: number
	): void {
		for (let i = 0; i < chain.length - 1; i++) {
			const a = chain[i];
			const b = chain[i + 1];
			if (a === undefined || b === undefined) continue;
			const w = this.widthAt((a.d + b.d) / 2, totalLen, radius);
			g.moveTo(a.x + 1.5, a.y + 3)
				.lineTo(b.x + 1.5, b.y + 3)
				.stroke({ color: C.shadow, width: w * 0.98, alpha: 0.32 });
		}
	}

	// ===== Тёмный контур =====
	private drawOutline(
		g: Graphics,
		chain: SnakeChainPoint[],
		totalLen: number,
		radius: number
	): void {
		for (let i = 0; i < chain.length - 1; i++) {
			const a = chain[i];
			const b = chain[i + 1];
			if (a === undefined || b === undefined) continue;
			const w = this.widthAt((a.d + b.d) / 2, totalLen, radius);
			g.moveTo(a.x, a.y)
				.lineTo(b.x, b.y)
				.stroke({ color: C.snakeOutline, width: w + 2.4, alpha: 1 });
		}
	}

	// ===== Основной цвет по зонам =====
	private drawFill(
		g: Graphics,
		chain: SnakeChainPoint[],
		zones: SnakeZoneStyle[],
		totalLen: number,
		radius: number
	): void {
		for (let i = 0; i < chain.length - 1; i++) {
			const a = chain[i];
			const b = chain[i + 1];
			if (a === undefined || b === undefined) continue;
			const w = this.widthAt((a.d + b.d) / 2, totalLen, radius);
			const pal = this.zonePalette(a.zone, zones);
			g.moveTo(a.x, a.y)
				.lineTo(b.x, b.y)
				.stroke({ color: pal.mid, width: w, alpha: 1 });
		}
	}

	// ===== Объём: брюшко снизу, солнечный блик сверху, ядро битового кольца =====
	private drawShading(
		g: Graphics,
		chain: SnakeChainPoint[],
		zones: SnakeZoneStyle[],
		totalLen: number,
		radius: number
	): void {
		for (let i = 0; i < chain.length - 1; i++) {
			const a = chain[i];
			const b = chain[i + 1];
			if (a === undefined || b === undefined) continue;
			const w = this.widthAt((a.d + b.d) / 2, totalLen, radius);
			const pal = this.zonePalette(a.zone, zones);

			// Ядро активного битового кольца — читаемость без неонового свечения.
			if (pal.active) {
				g.moveTo(a.x, a.y)
					.lineTo(b.x, b.y)
					.stroke({ color: pal.core, width: w * 0.4, alpha: 0.5 });
			}

			// Кремовое брюшко — свет снизу.
			const bellyOff = w * 0.22;
			g.moveTo(a.x, a.y + bellyOff)
				.lineTo(b.x, b.y + bellyOff)
				.stroke({ color: C.snakeBelly, width: w * 0.3, alpha: 0.45 });

			// Солнечный блик — свет сверху. Главный инструмент отделения от фона.
			const rimOff = w * 0.24;
			g.moveTo(a.x, a.y - rimOff)
				.lineTo(b.x, b.y - rimOff)
				.stroke({ color: C.snakeHi, width: w * 0.24, alpha: 0.85 });
		}
	}

	// ===== Природный узор: тёмные пятна на спине + мокрые блестки =====
	private drawMarkings(
		g: Graphics,
		chain: SnakeChainPoint[],
		totalLen: number,
		radius: number,
		cellSize: number
	): void {
		const stepD = this.chainStep(chain, cellSize);

		// Тёмные поперечные пятна (как у настоящего ужа).
		for (let d = cellSize * 0.55; d < totalLen - 4; d += cellSize * 0.55) {
			const idx = Math.min(chain.length - 2, Math.floor(d / stepD));
			const p = chain[idx];
			if (p === undefined) continue;
			const w = this.widthAt(d, totalLen, radius);
			const cos = Math.cos(p.angle);
			const sin = Math.sin(p.angle);
			const half = w * 0.16;
			g.moveTo(p.x - cos * half, p.y - sin * half)
				.lineTo(p.x + cos * half, p.y + sin * half)
				.stroke({ color: C.snakePattern, width: w * 0.36, alpha: 0.32 });
		}

		// Редкие солнечные блики-искры.
		for (let d = cellSize * 0.9; d < totalLen - 4; d += cellSize * 1.5) {
			const idx = Math.min(chain.length - 2, Math.floor(d / stepD));
			const p = chain[idx];
			if (p === undefined) continue;
			const w = this.widthAt(d, totalLen, radius);
			g.circle(p.x, p.y - w * 0.26, Math.max(0.7, w * 0.07)).fill({
				color: 0xffffff,
				alpha: 0.45
			});
		}
	}

	// ===== Мягкие разделители битовых колец =====
	private drawSeparators(
		g: Graphics,
		chain: SnakeChainPoint[],
		totalLen: number,
		radius: number,
		cellSize: number
	): void {
		const stepD = this.chainStep(chain, cellSize);
		for (let d = cellSize; d < totalLen - 2; d += cellSize) {
			const idx = Math.min(chain.length - 2, Math.floor(d / stepD));
			const p = chain[idx];
			if (p === undefined) continue;
			const w = this.widthAt(d, totalLen, radius);
			const nx = -Math.sin(p.angle);
			const ny = Math.cos(p.angle);
			const half = w / 2 - 0.6;
			g.moveTo(p.x + nx * half, p.y + ny * half)
				.lineTo(p.x - nx * half, p.y - ny * half)
				.stroke({ color: C.snakePattern, width: 1, alpha: 0.4 });
		}
	}

	private chainStep(chain: SnakeChainPoint[], cellSize: number): number {
		const a = chain[0];
		const b = chain[1];
		if (a === undefined || b === undefined) {
			return cellSize / 6;
		}
		return Math.max(0.001, b.d - a.d);
	}

	private zonePalette(zone: number, zones: SnakeZoneStyle[]): ZonePal {
		const style = zones[zone];
		if (zone > 0 && style !== undefined && style.active) {
			const bit = style.bit === 1 ? C.bitOne : C.bitZero;
			return {
				mid: mixColor(C.snakeMid, bit, 0.8),
				edge: mixColor(C.snakeOutline, bit, 0.45),
				core: mixColor(0xffffff, bit, 0.5),
				active: true
			};
		}
		return {
			mid: C.snakeMid,
			edge: C.snakeEdge,
			core: C.snakeHi,
			active: false
		};
	}

	private widthAt(d: number, total: number, radius: number): number {
		let w = radius;
		if (d < 10) {
			w = radius * (0.72 + 0.28 * (d / 10));
		}
		const taper = Math.max(0, total - 36);
		if (d > taper && total > taper) {
			w = Math.min(
				w,
				radius * Math.max(0.08, 1 - (d - taper) / (total - taper))
			);
		}
		return Math.max(1, w * 2);
	}

	/**
	 * Эллипс в локальных координатах головы.
	 * Строим полигоном, чтобы он корректно вращался вместе с головой.
	 */
	private localEllipse(
		rot: (lx: number, ly: number) => [number, number],
		cx: number,
		cy: number,
		rx: number,
		ry: number,
		steps = 14
	): number[] {
		const pts: number[] = [];
		for (let i = 0; i < steps; i++) {
			const th = (i / steps) * Math.PI * 2;
			const [gx, gy] = rot(cx + Math.cos(th) * rx, cy + Math.sin(th) * ry);
			pts.push(gx, gy);
		}
		return pts;
	}

	private localPoly(
		rot: (lx: number, ly: number) => [number, number],
		shape: readonly (readonly [number, number])[]
	): number[] {
		const pts: number[] = [];
		for (const [lx, ly] of shape) {
			const [gx, gy] = rot(lx, ly);
			pts.push(gx, gy);
		}
		return pts;
	}

	// ===== Голова =====
	private drawHead(
		g: Graphics,
		x: number,
		y: number,
		ang: number,
		t: number,
		cellSize: number
	): void {
		const hs = cellSize / 26;
		const bob = Math.sin(t * 2.2) * 0.7;
		const cos = Math.cos(ang);
		const sin = Math.sin(ang);
		const rot = (lx: number, ly: number): [number, number] => [
			x + lx * cos - ly * sin,
			y + bob * 0.35 + lx * sin + ly * cos
		];

		const shape = this.localPoly(
			(a, b) => rot(a * hs, b * hs),
			HEAD_SHAPE
		);

		// Тень головы.
		const shadowPts: number[] = [];
		for (let i = 0; i < shape.length; i += 2) {
			shadowPts.push((shape[i] ?? 0) + 1.2, (shape[i + 1] ?? 0) + 2.6);
		}
		g.poly(shadowPts).fill({ color: C.shadow, alpha: 0.3 });

		// Язычок — короткий, любопытный.
		const tt = t % 3.6;
		if (tt < 0.2) {
			const ext = Math.sin((tt / 0.2) * Math.PI) * 4.5;
			const [sx, sy] = rot(9.6 * hs, 0);
			const [ex, ey] = rot((9.6 + ext) * hs, 0);
			g.moveTo(sx, sy)
				.lineTo(ex, ey)
				.stroke({ color: 0xd4687a, width: 1.1, alpha: 0.95 });
			if (ext > 2) {
				const [f1x, f1y] = rot((9.6 + ext + 1.6) * hs, -1.1 * hs);
				const [f2x, f2y] = rot((9.6 + ext + 1.6) * hs, 1.1 * hs);
				g.moveTo(ex, ey)
					.lineTo(f1x, f1y)
					.stroke({ color: 0xd4687a, width: 1.1, alpha: 0.95 });
				g.moveTo(ex, ey)
					.lineTo(f2x, f2y)
					.stroke({ color: 0xd4687a, width: 1.1, alpha: 0.95 });
			}
		}

		// Основа головы.
		g.poly(shape).fill(C.snakeMid);

		// Серп нижней челюсти — кремовое брюшко.
		g.poly(this.localPoly((a, b) => rot(a * hs, b * hs), HEAD_JAW)).fill({
			color: C.snakeBelly,
			alpha: 0.32
		});

		// Светлая полоса вдоль макушки.
		g.poly(this.localPoly((a, b) => rot(a * hs, b * hs), HEAD_STRIPE)).fill({
			color: C.snakeHi,
			alpha: 0.42
		});

		// Контур поверх всего — чёткий силуэт.
		g.poly(shape).stroke({ color: C.snakeOutline, width: 1.8, alpha: 1 });

		// Фирменные жёлтые пятна ужа на затылке.
		for (const s of [-1, 1]) {
			const cxp = -2.9 * hs;
			const cyp = s * 2.9 * hs;
			const collar = this.localEllipse(
				(a, b) => rot(a * hs, b * hs),
				-2.9,
				s * 2.9,
				1.55,
				1.05
			);
			void cxp;
			void cyp;
			g.poly(collar).fill({ color: C.snakeCollar, alpha: 0.92 });
			g.poly(collar).stroke({
				color: C.snakeOutline,
				width: 0.7,
				alpha: 0.55
			});
		}

		// Линия пасти — лёгкая «улыбка».
		for (const s of [-1, 1]) {
			const [m1x, m1y] = rot(9.9 * hs, s * 0.25 * hs);
			const [m2x, m2y] = rot(7.2 * hs, s * 1.35 * hs);
			g.moveTo(m1x, m1y)
				.lineTo(m2x, m2y)
				.stroke({ color: C.snakeOutline, width: 0.9, alpha: 0.45 });
		}

		// Глаза — большие, тёплые, живые.
		const blink = t % 4.8 > 4.62;
		for (const s of [-1, 1]) {
			if (blink) {
				const [s1x, s1y] = rot(1.6 * hs, s * 2.9 * hs);
				const [s2x, s2y] = rot(4.8 * hs, s * 3.1 * hs);
				g.moveTo(s1x, s1y)
					.lineTo(s2x, s2y)
					.stroke({ color: C.snakeOutline, width: 1.3, alpha: 1 });
				continue;
			}

			// Белок.
			const white = this.localEllipse(
				(a, b) => rot(a * hs, b * hs),
				3.2,
				s * 2.95,
				2.15,
				1.9
			);
			g.poly(white).fill(0xfaf2dc);

			// Радужка — тёплый янтарь.
			const iris = this.localEllipse(
				(a, b) => rot(a * hs, b * hs),
				3.35,
				s * 2.95,
				1.75,
				1.6
			);
			g.poly(iris).fill(0xe8b028);

			// Зрачок — вертикальная щель, чуть смещён вперёд (смотрит куда едет).
			const pupil = this.localEllipse(
				(a, b) => rot(a * hs, b * hs),
				3.7,
				s * 2.95,
				0.72,
				1.45
			);
			g.poly(pupil).fill(0x140e04);

			// Блик.
			const glint = this.localEllipse(
				(a, b) => rot(a * hs, b * hs),
				2.5,
				s * 2.35,
				0.62,
				0.62,
				8
			);
			g.poly(glint).fill({ color: 0xffffff, alpha: 0.92 });

			// Обводка глаза.
			g.poly(white).stroke({
				color: C.snakeOutline,
				width: 0.85,
				alpha: 0.85
			});
		}

		// Ноздри.
		for (const s of [-1, 1]) {
			const nostril = this.localEllipse(
				(a, b) => rot(a * hs, b * hs),
				8.9,
				s * 1.15,
				0.5,
				0.42,
				8
			);
			g.poly(nostril).fill({ color: C.snakeOutline, alpha: 0.9 });
		}
	}

	// ===== Пузырьки =====
	private updateBubbles(
		g: Graphics,
		dt: number,
		hx: number,
		hy: number,
		moving: boolean
	): void {
		this.bubbleTimerMS -= dt * 1000;
		if (moving && this.bubbleTimerMS <= 0) {
			this.bubbleTimerMS = 900 + Math.random() * 600;
			this.bubbles.push({
				x: hx - 3 + Math.random() * 6,
				y: hy - 2 + Math.random() * 4,
				vx: (Math.random() - 0.5) * 6,
				vy: -(10 + Math.random() * 10),
				life: 0.4 + Math.random() * 0.3,
				maxLife: 0.7,
				size: 0.6 + Math.random() * 1
			});
		}
		for (let i = this.bubbles.length - 1; i >= 0; i--) {
			const b = this.bubbles[i];
			if (b === undefined) continue;
			b.life -= dt;
			if (b.life <= 0) {
				this.bubbles.splice(i, 1);
				continue;
			}
			b.x += b.vx * dt;
			b.y += b.vy * dt;
			g.circle(b.x, b.y, b.size).fill({
				color: C.bubble,
				alpha: Math.max(0, b.life / b.maxLife) * 0.35
			});
		}
	}

	public reset(): void {
		this.bubbles.length = 0;
		this.bubbleTimerMS = 0;
		this.lastFxTimeMS = -1;
	}

	public destroy(): void {
		this.reset();
	}
}