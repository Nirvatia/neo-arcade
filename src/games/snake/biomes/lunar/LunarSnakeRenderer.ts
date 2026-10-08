import type { SnakeChainPoint, SnakeHeadRender, SnakeZoneStyle } from '../contract/renderData.js';
import type { SnakeRenderer } from '../contract/renderers.js';
import { C } from './LunarPalette.js';
import { fillCircle, rgba, strokeCircle } from '../../canvas/canvasDraw.js';

const ELECTRIC = 0x82e8ff;
const RIM = 0xc8f6ff;
const BODY_BASE = 0x2a5174;
const BODY_DARK = 0x0d1a28;

interface ZonePal {
	mid: number;
	core: number;
	active: boolean;
}

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

export class LunarSnakeRenderer implements SnakeRenderer {
	public render(
		ctx: CanvasRenderingContext2D,
		chain: SnakeChainPoint[],
		start: number,
		end: number,
		zones: SnakeZoneStyle[],
		head: SnakeHeadRender,
		timeMS: number,
		cellSize: number
	): void {
		if (end - start < 2 || zones.length === 0) {
			return;
		}

		const t = timeMS / 1000;
		const last = chain[end - 1];
		const totalLen = last !== undefined ? last.d : zones.length * cellSize;
		const radius = Math.max(2.5, cellSize * 0.14);

		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		this.drawShadow(ctx, chain, start, end, totalLen, radius);
		this.drawBody(ctx, chain, start, end, zones, totalLen, radius);
		this.drawOutline(ctx, chain, start, end, totalLen, radius);
		this.drawElectric(ctx, chain, start, end, totalLen, radius, t);
		this.drawHead(ctx, head.x, head.y, head.angle, t, cellSize);

		ctx.restore();
	}

	private drawShadow(
		ctx: CanvasRenderingContext2D,
		chain: SnakeChainPoint[],
		start: number,
		end: number,
		totalLen: number,
		radius: number
	): void {
		for (let i = start; i < end - 1; i++) {
			const a = chain[i];
			const b = chain[i + 1];
			if (a === undefined || b === undefined) continue;

			const w = this.widthAt((a.d + b.d) / 2, totalLen, radius);
			ctx.beginPath();
			ctx.moveTo(a.x + 1, a.y + 3.5);
			ctx.lineTo(b.x + 1, b.y + 3.5);
			ctx.strokeStyle = rgba(C.shadow, 0.42);
			ctx.lineWidth = w * 0.95;
			ctx.stroke();
		}
	}

	private drawBody(
		ctx: CanvasRenderingContext2D,
		chain: SnakeChainPoint[],
		start: number,
		end: number,
		zones: SnakeZoneStyle[],
		totalLen: number,
		radius: number
	): void {
		for (let i = start; i < end - 1; i++) {
			const a = chain[i];
			const b = chain[i + 1];
			if (a === undefined || b === undefined) continue;

			const w = this.widthAt((a.d + b.d) / 2, totalLen, radius);
			const pal = this.zonePalette(a.zone, zones);
			const bodyColor = pal.active ? pal.mid : BODY_BASE;
			const hiColor = pal.active ? pal.core : ELECTRIC;
			const darkColor = mixColor(bodyColor, BODY_DARK, 0.6);

			const nx = -Math.sin(a.angle);
			const ny = Math.cos(a.angle);
			const halfW = w / 2;

			ctx.beginPath();
			ctx.moveTo(a.x - nx * halfW, a.y - ny * halfW);
			ctx.lineTo(b.x - nx * halfW, b.y - ny * halfW);
			ctx.lineTo(b.x + nx * halfW, b.y + ny * halfW);
			ctx.lineTo(a.x + nx * halfW, a.y + ny * halfW);
			ctx.closePath();
			ctx.fillStyle = rgba(bodyColor, 1);
			ctx.fill();

			const hiOff = halfW * 0.3;
			ctx.beginPath();
			ctx.moveTo(a.x - nx * hiOff, a.y - ny * hiOff);
			ctx.lineTo(b.x - nx * hiOff, b.y - ny * hiOff);
			ctx.strokeStyle = rgba(hiColor, pal.active ? 0.95 : 0.78);
			ctx.lineWidth = w * 0.3;
			ctx.stroke();

			const darkOff = halfW * 0.3;
			ctx.beginPath();
			ctx.moveTo(a.x + nx * darkOff, a.y + ny * darkOff);
			ctx.lineTo(b.x + nx * darkOff, b.y + ny * darkOff);
			ctx.strokeStyle = rgba(darkColor, 0.6);
			ctx.lineWidth = w * 0.3;
			ctx.stroke();

			if (pal.active) {
				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.strokeStyle = rgba(pal.core, 0.9);
				ctx.lineWidth = w * 0.4;
				ctx.stroke();

				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.strokeStyle = rgba(0xffffff, 0.32);
				ctx.lineWidth = w * 0.14;
				ctx.stroke();
			}
		}
	}

	private drawOutline(
		ctx: CanvasRenderingContext2D,
		chain: SnakeChainPoint[],
		start: number,
		end: number,
		totalLen: number,
		radius: number
	): void {
		ctx.beginPath();

		for (let i = start; i < end; i++) {
			const p = chain[i];
			if (p === undefined) continue;

			const w = this.widthAt(p.d, totalLen, radius);
			const nx = -Math.sin(p.angle);
			const ny = Math.cos(p.angle);
			const halfW = w / 2;

			if (i === start) {
				ctx.moveTo(p.x + nx * halfW, p.y + ny * halfW);
			} else {
				ctx.lineTo(p.x + nx * halfW, p.y + ny * halfW);
			}
		}

		for (let i = end - 1; i >= start; i--) {
			const p = chain[i];
			if (p === undefined) continue;

			const w = this.widthAt(p.d, totalLen, radius);
			const nx = -Math.sin(p.angle);
			const ny = Math.cos(p.angle);
			const halfW = w / 2;
			ctx.lineTo(p.x - nx * halfW, p.y - ny * halfW);
		}

		ctx.closePath();

		ctx.strokeStyle = rgba(RIM, 0.24);
		ctx.lineWidth = Math.max(2.3, radius * 0.32);
		ctx.stroke();

		ctx.strokeStyle = rgba(BODY_DARK, 0.94);
		ctx.lineWidth = 1.35;
		ctx.stroke();
	}

	private drawElectric(
		ctx: CanvasRenderingContext2D,
		chain: SnakeChainPoint[],
		start: number,
		end: number,
		totalLen: number,
		radius: number,
		t: number
	): void {
		for (let i = start; i < end; i += 6) {
			const p = chain[i];
			if (p === undefined) continue;

			const w = this.widthAt(p.d, totalLen, radius);
			const pulse = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 2.8 + p.d * 0.14)), 2);
			fillCircle(ctx, p.x, p.y, w * 0.17, ELECTRIC, 0.4 * pulse);
			fillCircle(ctx, p.x, p.y, w * 0.07, 0xffffff, 0.8 * pulse);
		}

		for (let i = start + 3; i + 7 < end; i += 8) {
			const a = chain[i];
			const b = chain[i + 7];
			if (a === undefined || b === undefined) continue;

			const dx = b.x - a.x;
			const dy = b.y - a.y;
			if (Math.hypot(dx, dy) < 2) continue;

			const seed = a.d * 0.173 + i * 0.311;
			const flicker = Math.sin(t * 7.3 + seed) * Math.sin(t * 12.7 + seed * 1.7);
			if (flicker < 0.3) continue;

			const intensity = (flicker - 0.3) / 0.7;
			const alpha = 0.18 + 0.46 * intensity;
			const side = i % 16 < 8 ? 1 : -1;
			const w = this.widthAt((a.d + b.d) / 2, totalLen, radius);
			const ang = Math.atan2(dy, dx);
			const nx = -Math.sin(ang) * side;
			const ny = Math.cos(ang) * side;

			ctx.beginPath();
			const steps = 4;
			for (let k = 0; k <= steps; k++) {
				const f = k / steps;
				const bx = a.x + dx * f;
				const by = a.y + dy * f;
				const envelope = Math.sin(Math.PI * f);
				const jitter =
					Math.sin(seed * 5.1 + f * 8.3 + t * 15) * w * 0.22 +
					Math.sin(seed * 9.7 + f * 14.9 + t * 23) * w * 0.1;
				const offset = w * 0.52 + envelope * (w * 0.28 + jitter);
				const x = bx + nx * offset;
				const y = by + ny * offset;

				if (k === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}
			ctx.strokeStyle = rgba(ELECTRIC, alpha);
			ctx.lineWidth = 1.15;
			ctx.stroke();
		}
	}

	private drawHead(
		ctx: CanvasRenderingContext2D,
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

		{
			const p0 = rot(9 * hs, -4 * hs);
			const p1 = rot(-5 * hs, -3.5 * hs);
			const p2 = rot(-5 * hs, 3.5 * hs);
			const p3 = rot(9 * hs, 4 * hs);
			ctx.beginPath();
			ctx.moveTo(p0[0] + 1.5, p0[1] + 3);
			ctx.lineTo(p1[0] + 1.5, p1[1] + 3);
			ctx.lineTo(p2[0] + 1.5, p2[1] + 3);
			ctx.lineTo(p3[0] + 1.5, p3[1] + 3);
			ctx.closePath();
			ctx.fillStyle = rgba(C.shadow, 0.42);
			ctx.fill();
		}

		{
			let p = rot(10 * hs, 0);
			ctx.beginPath();
			ctx.moveTo(p[0], p[1]);
			let cp = rot(9 * hs, -4 * hs);
			p = rot(5 * hs, -4.5 * hs);
			ctx.quadraticCurveTo(cp[0], cp[1], p[0], p[1]);
			cp = rot(0, -4 * hs);
			p = rot(-5 * hs, -3 * hs);
			ctx.quadraticCurveTo(cp[0], cp[1], p[0], p[1]);
			cp = rot(-6 * hs, 0);
			p = rot(-5 * hs, 3 * hs);
			ctx.quadraticCurveTo(cp[0], cp[1], p[0], p[1]);
			cp = rot(0, 4 * hs);
			p = rot(5 * hs, 4.5 * hs);
			ctx.quadraticCurveTo(cp[0], cp[1], p[0], p[1]);
			cp = rot(9 * hs, 4 * hs);
			p = rot(10 * hs, 0);
			ctx.quadraticCurveTo(cp[0], cp[1], p[0], p[1]);
			ctx.closePath();
			ctx.fillStyle = rgba(BODY_BASE, 1);
			ctx.fill();

			ctx.strokeStyle = rgba(RIM, 0.22);
			ctx.lineWidth = 2.6;
			ctx.stroke();

			ctx.strokeStyle = rgba(BODY_DARK, 0.96);
			ctx.lineWidth = 1.4;
			ctx.stroke();
		}

		const pulse = 0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(t * 3)), 2);
		for (const [lx, ly] of [
			[2, -2],
			[2, 2],
			[-2, 0]
		] as const) {
			const [px, py] = rot(lx * hs, ly * hs);
			fillCircle(ctx, px, py, 1.5, ELECTRIC, 0.6 * pulse);
			fillCircle(ctx, px, py, 0.65, 0xffffff, 0.8 * pulse);
		}

		const blink = t % 7 > 6.55;
		for (const s of [-1, 1]) {
			if (blink) {
				const a = rot(1 * hs, s * 2.5 * hs);
				const b = rot(5 * hs, s * 2.5 * hs);
				ctx.beginPath();
				ctx.moveTo(a[0], a[1]);
				ctx.lineTo(b[0], b[1]);
				ctx.strokeStyle = rgba(BODY_DARK, 0.96);
				ctx.lineWidth = 1.2;
				ctx.stroke();
			} else {
				const [ex, ey] = rot(3 * hs, s * 2.5 * hs);
				fillCircle(ctx, ex, ey, 2.3, 0xf0f8ff, 1);
				fillCircle(ctx, ex, ey, 1.5, ELECTRIC, 1);
				fillCircle(ctx, ex + 0.3, ey, 0.8, C.pupil, 1);
				fillCircle(ctx, ex - 0.4, ey - 0.5, 0.45, 0xffffff, 0.95);
				strokeCircle(ctx, ex, ey, 2.3, BODY_DARK, 0.9, 0.9);
			}
		}

		for (const s of [-1, 1]) {
			const baseX = 10;
			const baseY = s * 1;
			const wave = Math.sin(t * 2.5 + s * 0.5) * 1;
			const start = rot(baseX * hs, baseY * hs);
			const cp = rot((baseX + 1.5) * hs, (baseY + wave) * hs);
			const end = rot((baseX + 2.5) * hs, (baseY + wave * 0.5) * hs);
			ctx.beginPath();
			ctx.moveTo(start[0], start[1]);
			ctx.quadraticCurveTo(cp[0], cp[1], end[0], end[1]);
			ctx.strokeStyle = rgba(ELECTRIC, 0.8);
			ctx.lineWidth = 1.1;
			ctx.stroke();
			fillCircle(ctx, end[0], end[1], 0.8, ELECTRIC, pulse);
		}

		for (const s of [-1, 1]) {
			const wave = Math.sin(t * 1.5 + s) * 0.8;
			const start = rot(0, s * 4 * hs);
			const cp = rot(-1.5 * hs, (s * 5.5 + wave) * hs);
			const end = rot(-3 * hs, (s * 4.5 + wave) * hs);
			ctx.beginPath();
			ctx.moveTo(start[0], start[1]);
			ctx.quadraticCurveTo(cp[0], cp[1], end[0], end[1]);
			ctx.strokeStyle = rgba(ELECTRIC, 0.4);
			ctx.lineWidth = 1.6;
			ctx.stroke();
		}
	}

	private zonePalette(zone: number, zones: SnakeZoneStyle[]): ZonePal {
		const style = zones[zone];
		if (style !== undefined && style.active) {
			const bitColor = style.bit === 1 ? C.bitOne : C.bitZero;
			const bitCore = style.bit === 1 ? C.bitOneHi : C.bitZeroHi;
			return {
				mid: mixColor(BODY_BASE, bitColor, 0.78),
				core: bitCore,
				active: true
			};
		}
		return {
			mid: BODY_BASE,
			core: ELECTRIC,
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
		// Нет состояния для сброса.
	}

	public destroy(): void {
		this.reset();
	}
}
