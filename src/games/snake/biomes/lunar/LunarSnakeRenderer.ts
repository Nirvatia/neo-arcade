import type { Graphics } from 'pixi.js';
import type { SnakeChainPoint, SnakeHeadRender, SnakeZoneStyle } from '../renderData.js';
import type { SnakeRenderer } from '../renderers.js';
import { C } from './LunarPalette.js';

interface ZonePal {
	mid: number;
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
 * Арт змейки Лунной Лагуны: угорь с биолюминесценцией.
 *
 * Серебристо-голубое тело с ярким контуром, пульсирующими точками свечения,
 * плавниками и аурой. Голова с большими глазами и усиками-антеннами.
 */
export class LunarSnakeRenderer implements SnakeRenderer {
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
		this.lastFxTimeMS = timeMS;
		const t = timeMS / 1000;
		const totalLen = chain.length > 0 ? chain[chain.length - 1].d : zones.length * cellSize;
		const radius = Math.max(2.5, cellSize * 0.14);

		// ===== Аура (биолюминесцентное свечение вокруг тела) =====
		this.drawAura(g, chain, totalLen, radius, t);

		// ===== Контактная тень =====
		this.drawShadow(g, chain, totalLen, radius);

		// ===== Тело с градиентом =====
		this.drawBody(g, chain, zones, totalLen, radius);

		// ===== Яркий контур =====
		this.drawOutline(g, chain, totalLen, radius);

		// ===== Биолюминесцентные точки =====
		this.drawBioPoints(g, chain, totalLen, radius, t);

		// ===== Плавники =====
		this.drawFins(g, chain, totalLen, t);

		// ===== Голова =====
		this.drawHead(g, head.x, head.y, head.angle, t, cellSize);
	}

	// ===== Аура: пульсирующее свечение вокруг тела =====
	private drawAura(
		g: Graphics,
		chain: SnakeChainPoint[],
		totalLen: number,
		radius: number,
		t: number
	): void {
		const glowA = 0.05 + 0.025 * Math.sin(t * 1.5);
		for (let i = 0; i < chain.length - 1; i += 3) {
			const a = chain[i];
			if (a === undefined) continue;
			const w = this.widthAt(a.d, totalLen, radius);
			const pulse = 0.5 + 0.5 * Math.sin(t * 2 + a.d * 0.08);
			g.circle(a.x, a.y, w * 0.9).fill({ color: C.aura, alpha: glowA * pulse });
		}
	}

	// ===== Контактная тень =====
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
			g.moveTo(a.x + 1, a.y + 3)
				.lineTo(b.x + 1, b.y + 3)
				.stroke({ color: C.shadow, width: w * 0.9, alpha: 0.35 });
		}
	}

	// ===== Тело: сегменты с градиентом по зонам =====
	private drawBody(
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
			const bodyColor = pal.active ? pal.mid : C.snakeBody;
			const hiColor = pal.active ? pal.core : C.snakeHi;
			const darkColor = mixColor(bodyColor, 0x1a3a5a, 0.4);

			const nx = -Math.sin(a.angle);
			const ny = Math.cos(a.angle);
			const halfW = w / 2;

			// Градиент от верха к низу тела.
			// Верх — светлый, низ — тёмный.
			g.moveTo(a.x - nx * halfW, a.y - ny * halfW)
				.lineTo(b.x - nx * halfW, b.y - ny * halfW)
				.lineTo(b.x + nx * halfW, b.y + ny * halfW)
				.lineTo(a.x + nx * halfW, a.y + ny * halfW)
				.closePath()
				.fill(bodyColor);

			// Верхний блик.
			const hiOff = halfW * 0.3;
			g.moveTo(a.x - nx * hiOff, a.y - ny * hiOff)
				.lineTo(b.x - nx * hiOff, b.y - ny * hiOff)
				.stroke({ color: hiColor, width: w * 0.24, alpha: 0.9 });

			// Нижнее затенение.
			const darkOff = halfW * 0.3;
			g.moveTo(a.x + nx * darkOff, a.y + ny * darkOff)
				.lineTo(b.x + nx * darkOff, b.y + ny * darkOff)
				.stroke({ color: darkColor, width: w * 0.28, alpha: 0.5 });

			// Активная зона — яркое ядро.
			if (pal.active) {
				g.moveTo(a.x, a.y)
					.lineTo(b.x, b.y)
					.stroke({ color: pal.core, width: w * 0.45, alpha: 0.85 });
			}
		}
	}

	// ===== Яркий контур по всему телу =====
	private drawOutline(
		g: Graphics,
		chain: SnakeChainPoint[],
		totalLen: number,
		radius: number
	): void {
		// Верхний край.
		g.beginPath();
		for (let i = 0; i < chain.length; i++) {
			const p = chain[i];
			if (p === undefined) continue;
			const w = this.widthAt(p.d, totalLen, radius);
			const nx = -Math.sin(p.angle);
			const ny = Math.cos(p.angle);
			const halfW = w / 2;
			if (i === 0) {
				g.moveTo(p.x + nx * halfW, p.y + ny * halfW);
			} else {
				g.lineTo(p.x + nx * halfW, p.y + ny * halfW);
			}
		}
		// Нижний край (в обратном порядке).
		for (let i = chain.length - 1; i >= 0; i--) {
			const p = chain[i];
			if (p === undefined) continue;
			const w = this.widthAt(p.d, totalLen, radius);
			const nx = -Math.sin(p.angle);
			const ny = Math.cos(p.angle);
			const halfW = w / 2;
			g.lineTo(p.x - nx * halfW, p.y - ny * halfW);
		}
		g.closePath().stroke({ color: C.snakeOutline, width: 1.5, alpha: 0.8 });
	}

	// ===== Биолюминесцентные точки =====
	private drawBioPoints(
		g: Graphics,
		chain: SnakeChainPoint[],
		totalLen: number,
		radius: number,
		t: number
	): void {
		for (let i = 0; i < chain.length; i += 5) {
			const p = chain[i];
			if (p === undefined) continue;
			const pulse = 0.3 + 0.7 * Math.pow(Math.max(0, Math.sin(t * 2.5 + p.d * 0.12)), 2);
			const w = this.widthAt(p.d, totalLen, radius);
			g.circle(p.x, p.y, w * 0.3).fill({ color: C.aura, alpha: 0.6 * pulse });
			g.circle(p.x, p.y, w * 0.15).fill({ color: 0xffffff, alpha: 0.9 * pulse });
		}
	}

	// ===== Плавники (с обеих сторон тела) =====
	private drawFins(g: Graphics, chain: SnakeChainPoint[], totalLen: number, t: number): void {
		for (let i = 10; i < chain.length - 5; i += 12) {
			const p = chain[i];
			if (p === undefined) continue;
			if (p.d > totalLen - 10) continue;
			const nx = -Math.sin(p.angle);
			const ny = Math.cos(p.angle);
			const finLen = 2.5 + Math.sin(t * 1.8 + p.d * 0.1) * 1;
			for (const side of [-1, 1]) {
				const fx = p.x + nx * finLen * side;
				const fy = p.y + ny * finLen * side;
				const wave = Math.sin(t * 3 + p.d * 0.15 + side) * 1;
				g.moveTo(p.x, p.y);
				g.quadraticCurveTo(
					p.x + nx * finLen * 0.5 * side + wave,
					p.y + ny * finLen * 0.5 * side + wave * 0.5,
					fx + wave * 0.3,
					fy + wave * 0.2
				);
				g.stroke({ color: C.snakeHi, width: 1.2, alpha: 0.5 });
			}
		}
	}

	// ===== Голова угря =====
	private drawHead(
		g: Graphics,
		x: number,
		y: number,
		ang: number,
		t: number,
		cellSize: number
	): void {
		const hs = cellSize / 25;
		const cos = Math.cos(ang);
		const sin = Math.sin(ang);
		const rot = (lx: number, ly: number): [number, number] => [
			x + lx * cos - ly * sin,
			y + lx * sin + ly * cos
		];

		// Тень головы.
		g.moveTo(rot(9 * hs, -4 * hs)[0]! + 1.5, rot(9 * hs, -4 * hs)[1]! + 3)
			.lineTo(rot(-5 * hs, -3.5 * hs)[0]! + 1.5, rot(-5 * hs, -3.5 * hs)[1]! + 3)
			.lineTo(rot(-5 * hs, 3.5 * hs)[0]! + 1.5, rot(-5 * hs, 3.5 * hs)[1]! + 3)
			.lineTo(rot(9 * hs, 4 * hs)[0]! + 1.5, rot(9 * hs, 4 * hs)[1]! + 3)
			.closePath()
			.fill({ color: C.shadow, alpha: 0.35 });

		// Форма головы.
		g.moveTo(...rot(10 * hs, 0));
		g.quadraticCurveTo(...rot(9 * hs, -4 * hs), ...rot(5 * hs, -4.5 * hs));
		g.quadraticCurveTo(...rot(0, -4 * hs), ...rot(-5 * hs, -3 * hs));
		g.quadraticCurveTo(...rot(-6 * hs, 0), ...rot(-5 * hs, 3 * hs));
		g.quadraticCurveTo(...rot(0, 4 * hs), ...rot(5 * hs, 4.5 * hs));
		g.quadraticCurveTo(...rot(9 * hs, 4 * hs), ...rot(10 * hs, 0));
		g.closePath();

		// Градиент головы.
		g.fill(C.snakeBody);
		g.stroke({ color: C.snakeOutline, width: 1.5, alpha: 0.9 });

		// Биолюминесцентные точки на голове.
		const pulse = 0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(t * 2.8)), 2);
		for (const [lx, ly] of [
			[2, -2],
			[2, 2],
			[-2, 0]
		] as const) {
			const [px, py] = rot(lx * hs, ly * hs);
			g.circle(px, py, 1.8).fill({ color: C.aura, alpha: 0.6 * pulse });
			g.circle(px, py, 0.8).fill({ color: 0xffffff, alpha: 0.8 * pulse });
		}

		// Глаза.
		const blink = t % 7 > 6.5;
		for (const s of [-1, 1]) {
			const [ex, ey] = rot(3 * hs, s * 2.5 * hs);
			if (blink) {
				g.moveTo(...rot(1 * hs, s * 2.5 * hs));
				g.lineTo(...rot(5 * hs, s * 2.5 * hs));
				g.stroke({ color: C.snakeOutline, width: 1.2, alpha: 0.9 });
			} else {
				// Белок.
				g.circle(ex, ey, 2.4).fill(0xf0f8ff);
				// Радужка.
				g.circle(ex, ey, 1.6).fill(0x40c8a0);
				// Зрачок.
				g.circle(ex + 0.3, ey, 0.85).fill(C.pupil);
				// Блик.
				g.circle(ex - 0.4, ey - 0.5, 0.5).fill({ color: 0xffffff, alpha: 0.95 });
				// Обводка.
				g.circle(ex, ey, 2.4).stroke({ color: C.snakeOutline, width: 0.9, alpha: 0.9 });
			}
		}

		// Усики-антенны (свечение на кончиках).
		for (const s of [-1, 1]) {
			const baseX = 10;
			const baseY = s * 1;
			const wave = Math.sin(t * 2 + s * 0.5) * 1;
			g.moveTo(...rot(baseX * hs, baseY * hs));
			g.quadraticCurveTo(
				...rot((baseX + 1.5) * hs, (baseY + wave) * hs),
				...rot((baseX + 2.5) * hs, (baseY + wave * 0.5) * hs)
			);
			g.stroke({ color: C.snakeHi, width: 1.2, alpha: 0.7 });
			const [tx, ty] = rot((baseX + 2.5) * hs, (baseY + wave * 0.5) * hs);
			g.circle(tx, ty, 0.8).fill({ color: C.aura, alpha: 0.9 * pulse });
		}

		// Боковые плавники на голове.
		for (const s of [-1, 1]) {
			const wave = Math.sin(t * 1.5 + s) * 0.8;
			g.moveTo(...rot(0, s * 4 * hs));
			g.quadraticCurveTo(
				...rot(-1.5 * hs, (s * 5.5 + wave) * hs),
				...rot(-3 * hs, (s * 4.5 + wave) * hs)
			);
			g.stroke({ color: C.snakeHi, width: 1.8, alpha: 0.6 });
		}
	}

	private zonePalette(zone: number, zones: SnakeZoneStyle[]): ZonePal {
		const style = zones[zone];
		if (zone > 0 && style !== undefined && style.active) {
			const bitColor = style.bit === 1 ? C.bitOne : C.bitZero;
			const bitCore = style.bit === 1 ? C.bitOneHi : C.bitZeroHi;
			return {
				mid: mixColor(C.snakeBody, bitColor, 0.88),
				core: bitCore,
				active: true
			};
		}
		return {
			mid: C.snakeBody,
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
			w = Math.min(w, radius * Math.max(0.08, 1 - (d - taper) / (total - taper)));
		}
		return Math.max(1, w * 2);
	}

	public reset(): void {
		this.lastFxTimeMS = -1;
	}

	public destroy(): void {
		this.reset();
	}
}
