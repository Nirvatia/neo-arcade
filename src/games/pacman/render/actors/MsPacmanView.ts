// Ms. Pac-Man, from the owner's "Stardust Heart" mock-up (MS_PACMAN.html, PIXI): a rose
// body with a bright doppler rim, a ribbon bow, a pink ribbon trail, sparkles, hearts and
// stars. Ported to Canvas2D and fitted to the tile: every size follows the radius (the
// mock-up was drawn at r = 24 px), the bow stays on top of the head, glows stay close.
import type { PlayerService } from '../../logic/actors/PlayerService';
import type { PacmanAudioCue } from '../../core/Events';
import type { GridLayout } from '../maze/GridView';
import { rgba } from '../common/color';
import type { PlayerDrawOptions } from './PlayerView';

const ROSE_CORE = 0x661133;
const ROSE_EDGE = 0xaa2255;
const ROSE_LIGHT = 0xd8487e;
const ROSE_INNER = 0xff66aa;
const RIBBON_BASE = 0xff3388;
const RIBBON_GLOW = 0xffaacc;
const GOLD_ACCENT = 0xffcc44;
const GOLD_BRIGHT = 0xffee88;
const SPARKLE_BASE = 0xff88aa;
const SPARKLE_GLOW = 0xffddee;
const HEART_GLOW = 0xff5599;
const MOUTH_GLOW = 0x991144;
const MOUTH_BUFFED = 0xcc4488;
const WHITE = 0xffffff;

const TAU = Math.PI * 2;
const MAX_MOUTH = Math.PI / 3;
const IDLE_MOUTH = Math.PI / 12;
const BOW_SIZE = 0.7;
const TRAIL_LIFE = 0.5;
const DEATH_TIME = 1.95;

type PartKind = 'sparkle' | 'ribbon' | 'star' | 'heart';
type RingKind = 'dot' | 'pill' | 'wormhole-in' | 'wormhole-out';

interface Part {
	kind: PartKind;
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	/** Size in tiles. */
	s: number;
	rot: number;
	spin: number;
}

interface Ring {
	kind: RingKind;
	x: number;
	y: number;
	/** Radius in tiles at full size. */
	r: number;
	life: number;
	max: number;
	rot: number;
}

function mixHex(a: number, b: number, t: number): number {
	const ch = (shift: number) => {
		const x = (a >> shift) & 255;
		const y = (b >> shift) & 255;
		return Math.round(x + (y - x) * t);
	};
	return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

function facingAngle(facing: string | null, fallback: number): number {
	if (facing === 'UP') return -Math.PI / 2;
	if (facing === 'DOWN') return Math.PI / 2;
	if (facing === 'LEFT') return Math.PI;
	if (facing === 'RIGHT') return 0;
	return fallback;
}

export class MsPacmanView {
	private time = 0;
	private lastTime = -1;
	private angle = 0;
	private chomp = 0;
	private speed = 0;
	/** 0 → 1 as overdrive (the energized look) fades in. */
	private buff = 0;
	/** +1: bow on the left of the head (facing right); -1: on the right (facing left). */
	private bowSide = 1;
	private last: { x: number; y: number } | null = null;
	private trail: Array<{ x: number; y: number; life: number }> = [];
	private parts: Part[] = [];
	private rings: Ring[] = [];
	private flash: { kind: 'dot' | 'pill' | 'ghost'; t: number; max: number } | null = null;
	private dyingTime = -1;
	private deathEmit = 0;
	private teleported = false;

	trigger(cue: PacmanAudioCue): void {
		if (cue === 'dot') {
			this.flash = { kind: 'dot', t: 0.1, max: 0.1 };
			this.ring('dot', 0.38, 0.22, 0.36);
		} else if (cue === 'energizer' || cue === 'fruit-collect' || cue === 'egg-collect') {
			this.flash = { kind: 'pill', t: 0.45, max: 0.45 };
			this.ring('pill', 0, 0.55, 0.62);
		} else if (cue === 'ghost-eaten') {
			this.flash = { kind: 'ghost', t: 0.4, max: 0.4 };
			this.starburst();
		} else if (cue === 'teleport') {
			this.teleported = true;
		}
	}

	reset(): void {
		this.trail = [];
		this.parts = [];
		this.rings = [];
		this.flash = null;
		this.last = null;
		this.dyingTime = -1;
	}

	draw(
		ctx: CanvasRenderingContext2D,
		player: PlayerService,
		layout: GridLayout,
		time: number,
		options: PlayerDrawOptions
	): void {
		const S = layout.tileSize;
		const pos = player.position;
		if (!(S > 0) || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
			return;
		}
		const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
		this.lastTime = time;
		this.time += dt;
		this.update(dt, player, options);

		const cx = layout.offsetX + pos.x * S;
		const cy = layout.offsetY + pos.y * S;
		const r = S * 0.42;
		ctx.save();
		if (this.dyingTime >= 0) {
			this.drawDeath(ctx, cx, cy, r);
			this.drawParts(ctx, layout);
			ctx.restore();
			return;
		}
		this.drawTrail(ctx, layout, r);
		ctx.globalAlpha = player.isInvulnerable ? 0.55 + 0.45 * Math.sin(this.time * 20) : 1;
		this.drawAura(ctx, cx, cy, r);
		const [sa, ea] = this.mouthArc();
		this.drawBody(ctx, cx, cy, r, sa, ea);
		this.drawBow(ctx, cx, cy, r);
		ctx.globalAlpha = 1;
		this.drawParts(ctx, layout);
		this.drawRings(ctx, layout, cx, cy, r);
		this.drawFlash(ctx, cx, cy, r);
		ctx.restore();
	}

	private ring(
		kind: RingKind,
		ahead: number,
		life: number,
		radius: number,
		at?: { x: number; y: number }
	): void {
		const p = at ?? this.last;
		if (!p) {
			return;
		}
		this.rings.push({
			kind,
			x: p.x + Math.cos(this.angle) * ahead,
			y: p.y + Math.sin(this.angle) * ahead,
			r: radius,
			life,
			max: life,
			rot: Math.random() * Math.PI
		});
	}

	private part(p: Omit<Part, 'max'>): void {
		if (this.parts.length < 160) {
			this.parts.push({ ...p, max: p.life });
		}
	}

	private starburst(): void {
		const p = this.last;
		if (!p) {
			return;
		}
		for (let i = 0; i < 16; i++) {
			const a = (i / 16) * TAU;
			const v = 2.2 + Math.random() * 2.8;
			this.part({
				kind: 'star',
				x: p.x,
				y: p.y,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: 0.45 + Math.random() * 0.35,
				s: 0.06 + Math.random() * 0.05,
				rot: Math.random() * TAU,
				spin: (Math.random() - 0.5) * 8
			});
		}
	}

	private update(dt: number, player: PlayerService, options: PlayerDrawOptions): void {
		const pos = player.position;
		this.buff += ((options.look === 'energized' ? 1 : 0) - this.buff) * Math.min(1, dt * 5);
		this.flash =
			this.flash && this.flash.t - dt > 0 ? { ...this.flash, t: this.flash.t - dt } : null;
		for (const p of this.parts) {
			p.life -= dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= Math.pow(0.94, dt * 60);
			p.vy *= Math.pow(0.94, dt * 60);
			p.rot += p.spin * dt;
		}
		this.parts = this.parts.filter((p) => p.life > 0);
		for (const g of this.rings) {
			g.life -= dt;
		}
		this.rings = this.rings.filter((g) => g.life > 0);

		if (options.dying) {
			if (this.dyingTime < 0) {
				this.dyingTime = 0;
				this.trail = [];
			}
			this.dyingTime += dt;
			this.emitDeath(dt);
			return;
		}
		if (this.dyingTime >= 0) {
			this.reset();
		}

		const moved = this.last ? Math.hypot(pos.x - this.last.x, pos.y - this.last.y) : 0;
		if (this.teleported || moved > 1.5) {
			// a wormhole closes behind her and opens where she comes out
			if (this.last) {
				this.ring('wormhole-out', 0, 0.3, 0.7, this.last);
			}
			this.ring('wormhole-in', 0, 0.4, 0.7, pos);
			this.trail = [];
			this.teleported = false;
		} else if (dt > 0) {
			this.speed += (moved / dt - this.speed) * Math.min(1, dt * 10);
		}
		this.last = { x: pos.x, y: pos.y };

		const target = facingAngle(player.facing, this.angle);
		let turn = target - this.angle;
		while (turn > Math.PI) turn -= TAU;
		while (turn < -Math.PI) turn += TAU;
		this.angle += turn * Math.min(1, dt * 18);
		const cos = Math.cos(target);
		if (Math.abs(cos) > 0.5) {
			this.bowSide = cos > 0 ? 1 : -1;
		}

		const running = this.speed > 0.5;
		this.chomp += dt * (running ? 8 * (1 + 0.35 * this.buff) : 0);
		for (const t of this.trail) {
			t.life -= dt;
		}
		this.trail = this.trail.filter((t) => t.life > 0);
		const head = this.trail[this.trail.length - 1];
		if (running && (!head || Math.hypot(head.x - pos.x, head.y - pos.y) > 0.12)) {
			this.trail.push({ x: pos.x, y: pos.y, life: TRAIL_LIFE * (1 + 0.4 * this.buff) });
		}
		if (running && Math.random() < dt * (6 + 14 * this.buff)) {
			const a = Math.random() * TAU;
			const d = 0.42 * (0.5 + Math.random() * 0.6);
			this.part({
				kind: 'sparkle',
				x: pos.x + Math.cos(a) * d,
				y: pos.y + Math.sin(a) * d,
				vx: 0,
				vy: -0.15,
				life: 0.4 + Math.random() * 0.4,
				s: 0.05 + Math.random() * 0.05,
				rot: Math.random() * TAU,
				spin: 0
			});
		}
		if (running && Math.random() < dt * (3 + 9 * this.buff)) {
			const a = this.angle + Math.PI + (Math.random() - 0.5) * 0.8;
			const v = 0.8 + Math.random() * 1.2;
			this.part({
				kind: 'ribbon',
				x: pos.x - Math.cos(this.angle) * 0.3,
				y: pos.y - Math.sin(this.angle) * 0.3,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: 0.4 + Math.random() * 0.4,
				s: 0.03 + Math.random() * 0.04,
				rot: 0,
				spin: 0
			});
		}
	}

	private mouthArc(): [number, number] {
		let mouth = this.speed > 0.5 ? Math.abs(Math.sin(this.chomp)) * MAX_MOUTH : IDLE_MOUTH;
		mouth = Math.max(0.06, Math.min(mouth, Math.PI * 0.5));
		mouth = Math.min(mouth * (1 + 0.15 * this.buff), Math.PI * 0.52);
		return [this.angle + mouth, this.angle + TAU - mouth];
	}

	private drawTrail(ctx: CanvasRenderingContext2D, layout: GridLayout, r: number): void {
		if (this.trail.length < 2 || !this.last) {
			return;
		}
		const S = layout.tileSize;
		const px = (x: number) => layout.offsetX + x * S;
		const py = (y: number) => layout.offsetY + y * S;
		const pts = [...this.trail, { ...this.last, life: TRAIL_LIFE }];
		const base = r * (0.4 + 0.2 * this.buff);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		for (let i = 1; i < pts.length; i++) {
			const a = pts[i - 1];
			const b = pts[i];
			const k = Math.min(1, a.life / TRAIL_LIFE);
			if (k <= 0.01) continue;
			const w = base * k;
			ctx.globalCompositeOperation = 'source-over';
			ctx.strokeStyle = rgba(RIBBON_BASE, k * 0.28);
			ctx.lineWidth = w * 2.2;
			ctx.beginPath();
			ctx.moveTo(px(a.x), py(a.y));
			ctx.lineTo(px(b.x), py(b.y));
			ctx.stroke();
			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = rgba(
				mixHex(RIBBON_GLOW, GOLD_BRIGHT, this.buff),
				k * (0.5 + 0.25 * this.buff)
			);
			ctx.lineWidth = w * (0.65 + 0.45 * this.buff);
			ctx.beginPath();
			ctx.moveTo(px(a.x), py(a.y));
			ctx.lineTo(px(b.x), py(b.y));
			ctx.stroke();
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawAura(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
		const R = r * (1.08 + 0.06 * this.buff);
		const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, R);
		g.addColorStop(0, rgba(mixHex(ROSE_INNER, GOLD_ACCENT, this.buff), 0.18 + 0.12 * this.buff));
		g.addColorStop(1, rgba(ROSE_INNER, 0));
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, TAU);
		ctx.fill();
		ctx.globalCompositeOperation = 'source-over';
	}

	private wedge(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		r: number,
		sa: number,
		ea: number
	): void {
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.arc(cx, cy, r, sa, ea, false);
		ctx.closePath();
	}

	private drawBody(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		r: number,
		sa: number,
		ea: number
	): void {
		const k = r / 24;
		// soft volume: lit from the top-left like Pac-Man
		const g = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.36, r * 0.05, cx, cy, r);
		g.addColorStop(0, rgba(ROSE_LIGHT, 1));
		g.addColorStop(0.55, rgba(ROSE_EDGE, 1));
		g.addColorStop(1, rgba(ROSE_CORE, 1));
		ctx.fillStyle = g;
		this.wedge(ctx, cx, cy, r, sa, ea);
		ctx.fill();
		// the inner glow of the mock-up's mouth layer
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = rgba(mixHex(MOUTH_GLOW, MOUTH_BUFFED, this.buff), 0.28 + 0.14 * this.buff);
		this.wedge(ctx, cx, cy, r * 0.85, sa, ea);
		ctx.fill();
		ctx.globalCompositeOperation = 'source-over';
		// pink rim, then the doppler ring: brightest where she is heading
		ctx.strokeStyle = rgba(mixHex(ROSE_INNER, GOLD_ACCENT, this.buff), 0.6 + 0.1 * this.buff);
		ctx.lineWidth = Math.max(1, (5 + 2 * this.buff) * k);
		ctx.lineJoin = 'round';
		this.wedge(ctx, cx, cy, r, sa, ea);
		ctx.stroke();
		const segments = 24;
		ctx.lineWidth = Math.max(0.8, (2.5 + 0.5 * this.buff) * k);
		ctx.lineCap = 'butt';
		for (let i = 0; i < segments; i++) {
			const a1 = sa + ((ea - sa) / segments) * i;
			const a2 = sa + ((ea - sa) / segments) * (i + 1);
			const doppler = 0.5 + 0.5 * Math.cos((a1 + a2) / 2 - this.angle);
			const color =
				(255 << 16) | (Math.round(80 + doppler * 120) << 8) | Math.round(140 + doppler * 60);
			ctx.strokeStyle = rgba(color, (0.5 + doppler * 0.5) * (0.9 + 0.1 * this.buff));
			ctx.beginPath();
			ctx.arc(cx, cy, r, a1, a2, false);
			ctx.stroke();
		}
	}

	/** The bow sits on top of the head, towards the back: it never flips under her. */
	private drawBow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
		const k = r / 24;
		const t = this.time;
		const anchor = -Math.PI / 2 - this.bowSide * 0.55;
		const bx = cx + Math.cos(anchor) * r * 0.78;
		const by = cy + Math.sin(anchor) * r * 0.78;
		const wiggle = Math.sin(t * 5) * 0.1;
		const pulse = 1 + Math.sin(t * 4) * 0.05;
		const scale = BOW_SIZE * (1 + 0.15 * this.buff) * pulse;
		const fill = mixHex(RIBBON_BASE, GOLD_ACCENT, this.buff);
		const glowC = mixHex(RIBBON_GLOW, GOLD_BRIGHT, this.buff);
		for (const side of [-1, 1]) {
			const pa = anchor + side * (0.75 + wiggle);
			const len = r * 0.9 * scale;
			const wid = r * 0.55 * scale;
			const tipX = bx + Math.cos(pa) * len;
			const tipY = by + Math.sin(pa) * len;
			const perp = pa + Math.PI / 2;
			const mx = bx + Math.cos(pa) * len * 0.5;
			const my = by + Math.sin(pa) * len * 0.5;
			const c1x = mx + Math.cos(perp) * wid * side;
			const c1y = my + Math.sin(perp) * wid * side;
			const c2x = mx - Math.cos(perp) * wid * side * 0.3;
			const c2y = my - Math.sin(perp) * wid * side * 0.3;
			const petal = () => {
				ctx.beginPath();
				ctx.moveTo(bx, by);
				ctx.quadraticCurveTo(c1x, c1y, tipX, tipY);
				ctx.quadraticCurveTo(c2x, c2y, bx, by);
				ctx.closePath();
			};
			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = rgba(glowC, 0.35);
			ctx.lineWidth = Math.max(1, 6 * k);
			petal();
			ctx.stroke();
			ctx.globalCompositeOperation = 'source-over';
			ctx.fillStyle = rgba(fill, 0.95);
			petal();
			ctx.fill();
			ctx.strokeStyle = rgba(WHITE, 0.7);
			ctx.lineWidth = Math.max(0.6, 1.5 * k);
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(bx, by);
			ctx.quadraticCurveTo(c1x * 0.95 + bx * 0.05, c1y * 0.95 + by * 0.05, tipX, tipY);
			ctx.stroke();
		}
		ctx.fillStyle = rgba(fill, 1);
		ctx.beginPath();
		ctx.arc(bx, by, r * 0.25 * scale, 0, TAU);
		ctx.fill();
		ctx.fillStyle = rgba(WHITE, 0.85);
		ctx.beginPath();
		ctx.arc(bx, by, r * 0.13 * scale, 0, TAU);
		ctx.fill();
		if (this.buff > 0.05) {
			// overdrive: three little stars circle the bow
			for (let i = 0; i < 3; i++) {
				const a = anchor + (i / 3) * TAU + t * 3;
				this.star(
					ctx,
					bx + Math.cos(a) * r * 0.6,
					by + Math.sin(a) * r * 0.6,
					r * 0.14,
					GOLD_BRIGHT,
					this.buff
				);
			}
		}
	}

	private star(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
		color: number,
		alpha: number
	): void {
		ctx.globalCompositeOperation = 'lighter';
		ctx.strokeStyle = rgba(color, alpha);
		ctx.lineWidth = Math.max(0.6, size * 0.3);
		ctx.lineCap = 'round';
		ctx.beginPath();
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * TAU;
			ctx.moveTo(x, y);
			ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size);
		}
		ctx.stroke();
		ctx.fillStyle = rgba(WHITE, alpha);
		ctx.beginPath();
		ctx.arc(x, y, size * 0.3, 0, TAU);
		ctx.fill();
		ctx.globalCompositeOperation = 'source-over';
	}

	private heart(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		size: number,
		alpha: number
	): void {
		const s = size * 0.8;
		ctx.fillStyle = rgba(HEART_GLOW, alpha * 0.85);
		ctx.beginPath();
		ctx.moveTo(cx, cy + s * 0.3);
		ctx.bezierCurveTo(cx, cy - s * 0.3, cx - s, cy - s * 0.3, cx - s, cy + s * 0.1);
		ctx.bezierCurveTo(cx - s, cy + s * 0.6, cx, cy + s, cx, cy + s);
		ctx.bezierCurveTo(cx, cy + s, cx + s, cy + s * 0.6, cx + s, cy + s * 0.1);
		ctx.bezierCurveTo(cx + s, cy - s * 0.3, cx, cy - s * 0.3, cx, cy + s * 0.3);
		ctx.fill();
		ctx.fillStyle = rgba(WHITE, alpha * 0.7);
		ctx.beginPath();
		ctx.arc(cx - s * 0.3, cy - s * 0.1, s * 0.2, 0, TAU);
		ctx.fill();
	}

	private drawParts(ctx: CanvasRenderingContext2D, layout: GridLayout): void {
		const S = layout.tileSize;
		for (const p of this.parts) {
			const a = Math.max(0, p.life / p.max);
			const x = layout.offsetX + p.x * S;
			const y = layout.offsetY + p.y * S;
			const size = p.s * S;
			if (p.kind === 'star') {
				this.star(ctx, x, y, size * 1.5, GOLD_BRIGHT, a);
			} else if (p.kind === 'heart') {
				this.heart(ctx, x, y, size * a + size * 0.3, a);
			} else {
				const outer = p.kind === 'ribbon' ? RIBBON_BASE : SPARKLE_BASE;
				const inner = p.kind === 'ribbon' ? RIBBON_GLOW : SPARKLE_GLOW;
				ctx.globalCompositeOperation = 'lighter';
				ctx.fillStyle = rgba(outer, a * 0.35);
				ctx.beginPath();
				ctx.arc(x, y, size * 1.6 * a, 0, TAU);
				ctx.fill();
				ctx.fillStyle = rgba(inner, a * 0.9);
				ctx.beginPath();
				ctx.arc(x, y, size * 0.5 * a, 0, TAU);
				ctx.fill();
				ctx.globalCompositeOperation = 'source-over';
			}
		}
	}

	private drawRings(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		cx: number,
		cy: number,
		r: number
	): void {
		const S = layout.tileSize;
		ctx.globalCompositeOperation = 'lighter';
		for (const g of this.rings) {
			const a = g.life / g.max;
			const p = 1 - a;
			const x = layout.offsetX + g.x * S;
			const y = layout.offsetY + g.y * S;
			const k = r / 24;
			if (g.kind === 'dot') {
				const R = g.r * S * (1 - p);
				if (R > 0.5) {
					ctx.strokeStyle = rgba(RIBBON_GLOW, a * 0.9);
					ctx.lineWidth = Math.max(0.6, 1.5 * k * a);
					ctx.beginPath();
					ctx.arc(x, y, R, 0, TAU);
					ctx.stroke();
				}
			} else if (g.kind === 'pill') {
				const R = g.r * S * p;
				ctx.strokeStyle = rgba(GOLD_BRIGHT, a * 0.9);
				ctx.lineWidth = Math.max(0.8, 3 * k * a);
				ctx.beginPath();
				ctx.arc(cx, cy, R, 0, TAU);
				ctx.stroke();
				ctx.strokeStyle = rgba(RIBBON_GLOW, a * 0.4);
				ctx.lineWidth = Math.max(1, 5 * k * a);
				ctx.beginPath();
				ctx.arc(cx, cy, R * 0.85, 0, TAU);
				ctx.stroke();
			} else {
				const entry = g.kind === 'wormhole-in';
				const R = g.r * S * (entry ? p : 1);
				ctx.strokeStyle = rgba(entry ? GOLD_BRIGHT : RIBBON_GLOW, a * 0.8);
				ctx.lineWidth = Math.max(0.8, 4 * k * a);
				ctx.beginPath();
				ctx.arc(x, y, R, 0, TAU);
				ctx.stroke();
				const twist = entry ? p * Math.PI * 1.8 : a * Math.PI * 1.8;
				for (let s = 0; s < 10; s++) {
					const base = (s / 10) * TAU + g.rot;
					const ia = base + twist;
					const oa = base - twist * 0.5;
					ctx.strokeStyle = rgba(s % 3 === 0 ? GOLD_BRIGHT : RIBBON_GLOW, a * 0.7);
					ctx.lineWidth = Math.max(0.5, (s % 3 === 0 ? 1.8 : 0.8) * k * a);
					ctx.beginPath();
					ctx.moveTo(x + Math.cos(ia) * R * 0.15 * a, y + Math.sin(ia) * R * 0.15 * a);
					ctx.lineTo(x + Math.cos(oa) * R * 0.95, y + Math.sin(oa) * R * 0.95);
					ctx.stroke();
				}
			}
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawFlash(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
		const f = this.flash;
		if (!f) {
			return;
		}
		const a = f.t / f.max;
		const k = r / 24;
		ctx.globalCompositeOperation = 'lighter';
		if (f.kind === 'ghost') {
			ctx.strokeStyle = rgba(WHITE, a * 0.7);
			ctx.lineWidth = Math.max(1, 3.5 * k * a);
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, TAU);
			ctx.stroke();
			ctx.strokeStyle = rgba(GOLD_ACCENT, a * 0.35);
			ctx.lineWidth = Math.max(1, 6 * k * a);
			ctx.beginPath();
			ctx.arc(cx, cy, r * 1.15, 0, TAU);
			ctx.stroke();
		} else if (f.kind === 'pill') {
			ctx.strokeStyle = rgba(GOLD_BRIGHT, a * 0.9);
			ctx.lineWidth = Math.max(1, 2.5 * k * a);
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, TAU);
			ctx.stroke();
		} else {
			ctx.fillStyle = rgba(WHITE, a * 0.3);
			ctx.beginPath();
			ctx.arc(cx, cy, r * 0.25, 0, TAU);
			ctx.fill();
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private emitDeath(dt: number): void {
		const t = this.dyingTime;
		const p = this.last;
		if (!p || t < 0.3 || t >= 1.8) {
			return;
		}
		const shrink = Math.min(1, (t - 0.3) / 1.5);
		this.deathEmit += dt;
		const interval = 0.06 - shrink * 0.04;
		while (this.deathEmit > interval) {
			this.deathEmit -= interval;
			const n = 2 + Math.floor(shrink * 3);
			for (let i = 0; i < n; i++) {
				const a = Math.random() * TAU;
				const v = 2 + Math.random() * 4.5;
				const roll = Math.random();
				this.part({
					kind: roll < 0.3 ? 'heart' : roll < 0.65 ? 'star' : 'sparkle',
					x: p.x + Math.cos(a) * 0.12,
					y: p.y + Math.sin(a) * 0.12,
					vx: Math.cos(a) * v,
					vy: Math.sin(a) * v,
					life: 0.5 + Math.random() * 0.7,
					s: 0.04 + Math.random() * 0.07,
					rot: Math.random() * TAU,
					spin: (Math.random() - 0.5) * 10
				});
			}
		}
	}

	/** Shudder, shrink into a shower of hearts and stars, pop, flash. */
	private drawDeath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number): void {
		const t = this.dyingTime;
		if (t >= DEATH_TIME) {
			return;
		}
		const shrink = Math.min(1, Math.max(0, (t - 0.3) / 1.5));
		const r = t < 0.3 ? r0 * (1 + Math.sin(t * 50) * 0.12) : Math.max(0, r0 * (1 - shrink * 0.88));
		const k = r0 / 24;
		const alpha = t < 1.8 ? 1 : Math.max(0, 1 - (t - 1.8) / 0.15);
		if (r > 0.3 && alpha > 0) {
			ctx.fillStyle = rgba(ROSE_CORE, alpha);
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, TAU);
			ctx.fill();
			if (t < 0.3) {
				const flicker = 0.5 + 0.5 * Math.sin(t * 50);
				ctx.strokeStyle = rgba(flicker > 0.7 ? WHITE : RIBBON_GLOW, (0.5 + flicker * 0.5) * alpha);
				ctx.lineWidth = Math.max(1, (2 + flicker * 3) * k);
			} else {
				ctx.strokeStyle = rgba(
					shrink > 0.7 ? GOLD_BRIGHT : RIBBON_GLOW,
					(0.5 + shrink * 0.5) * alpha
				);
				ctx.lineWidth = Math.max(1, (1.5 + shrink * 1.5) * k);
			}
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, TAU);
			ctx.stroke();
		}
		ctx.globalCompositeOperation = 'lighter';
		if (t >= 1.5 && t < 1.8) {
			const p = (t - 1.5) / 0.3;
			ctx.fillStyle = rgba(WHITE, (1 - p) * 0.9);
			ctx.beginPath();
			ctx.arc(cx, cy, r0 * 0.2 * (1 + p * 3), 0, TAU);
			ctx.fill();
		}
		if (t >= 1.8) {
			const f = Math.max(0, 1 - (t - 1.8) / 0.15);
			ctx.fillStyle = rgba(WHITE, f * 0.6);
			ctx.beginPath();
			ctx.arc(cx, cy, r0 * (2 - f) * 1.2, 0, TAU);
			ctx.fill();
		}
		ctx.globalCompositeOperation = 'source-over';
	}
}
