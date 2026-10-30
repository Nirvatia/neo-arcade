// Ms. Pac-Man, the owner's "Stardust Heart" mock-up (MS_PACMAN.html, PIXI) ported 1:1 to
// Canvas2D: the same palette, shapes, blend modes (additive everywhere but the body),
// timings and effects. The mock-up was drawn at r = 24 px; here r is 0.42 of a tile and every
// mock-up pixel (sizes, line widths, speeds) scales with it.
//
// The sprite (body, mouth glow, bow) is drawn in its own frame, rotated to the heading as
// in the mock-up, where the bow sits at heading + 0.85π. In a maze the frame is also
// mirrored by the last horizontal heading, like the arcade sprite: moving right or left the
// bow is on top behind the head, moving up or down it stays behind the head on the same
// side, never near the mouth.
import type { PlayerService } from '../../logic/actors/PlayerService';
import type { PacmanAudioCue } from '../../core/Events';
import type { GridLayout } from '../maze/GridView';
import { rgba } from '../common/color';
import type { PlayerDrawOptions } from './PlayerView';

const ROSE_CORE = 0x661133;
const ROSE_EDGE = 0xaa2255;
const ROSE_INNER = 0xff66aa;
const ROSE_BUFFED = 0xffbbdd;
const RIBBON_BASE = 0xff3388;
const RIBBON_GLOW = 0xffaacc;
const GOLD_ACCENT = 0xffcc44;
const GOLD_BRIGHT = 0xffee88;
const SPARKLE_BASE = 0xff88aa;
const SPARKLE_GLOW = 0xffddee;
const HEART_GLOW = 0xff5599;
const MOUTH_GLOW = 0x991144;
const MOUTH_BUFFED = 0xcc4488;
const FLARE_WHITE = 0xffffff;
const GHOST_STREAK = 0xff88cc;

const TAU = Math.PI * 2;
/** Body radius in tiles. */
const R = 0.42;
/** One mock-up pixel (drawn at r = 24) in tiles. */
const PX = R / 24;
const MOUTH_SPEED = 8;
const MAX_MOUTH = Math.PI / 3;
const IDLE_MOUTH = Math.PI / 12;
const BOW_SIZE = 1.15;
const BOW_ANGLE = Math.PI * 0.85;
const GHOST_STREAK_TIME = 0.45;
const MAX_PARTS = 300;
const MAX_SPARKLES = 40;

type PartKind = 'sparkle' | 'ribbon' | 'star' | 'heart';
type RingKind = 'dot' | 'pill' | 'wormhole-in' | 'wormhole-out';

/** Positions, speeds and sizes in tiles. */
interface Part {
	kind: PartKind;
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	rot: number;
	spin: number;
}

interface Sparkle {
	x: number;
	y: number;
	life: number;
	max: number;
	size: number;
	angle: number;
	twinkle: number;
}

interface Ring {
	kind: RingKind;
	x: number;
	y: number;
	radius: number;
	maxRadius: number;
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
	/** Mirror of the sprite frame: -1 after heading right (bow on top), +1 after heading left. */
	private mirror = -1;
	private buffed = false;
	private moving = false;
	/** Smoothed speed in tiles per second: a frame without a logic step is not a stop. */
	private speed = 0;
	private last: { x: number; y: number } | null = null;
	private trailHead: { x: number; y: number } | null = null;
	private trail: Array<{ x: number; y: number; life: number; max: number }> = [];
	private parts: Part[] = [];
	private sparkles: Sparkle[] = [];
	private rings: Ring[] = [];
	private flash: { kind: 'dot' | 'pill' | 'ghost'; t: number; max: number } | null = null;
	private streak: { x: number; y: number; t: number } | null = null;
	private terminalFlash = 0;
	private dyingTime = -1;
	private deathEmit = 0;
	private teleported = false;

	trigger(cue: PacmanAudioCue): void {
		const p = this.last;
		if (cue === 'dot') {
			this.flash = { kind: 'dot', t: 0.1, max: 0.1 };
			if (p) {
				const ahead = 30 * PX;
				const x = p.x + Math.cos(this.angle) * ahead;
				const y = p.y + Math.sin(this.angle) * ahead;
				this.ring('dot', x, y, 9 * PX, 0.22);
			}
		} else if (cue === 'energizer' || cue === 'fruit-collect' || cue === 'egg-collect') {
			this.flash = { kind: 'pill', t: 0.45, max: 0.45 };
			if (p) {
				this.ring('pill', p.x, p.y, R * 3.5, 0.55);
			}
		} else if (cue === 'ghost-eaten') {
			this.flash = { kind: 'ghost', t: 0.4, max: 0.4 };
			if (p) {
				// the ghost's light streaks into her from where it was, ahead of the mouth
				const from = 120 * PX;
				this.streak = {
					x: p.x + Math.cos(this.angle) * from,
					y: p.y + Math.sin(this.angle) * from,
					t: GHOST_STREAK_TIME
				};
				this.terminalFlash = 0;
				this.starburst(p);
			}
		} else if (cue === 'teleport') {
			this.teleported = true;
		}
	}

	reset(): void {
		this.trail = [];
		this.trailHead = null;
		this.parts = [];
		this.sparkles = [];
		this.rings = [];
		this.flash = null;
		this.streak = null;
		this.terminalFlash = 0;
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
		const r = R * S;
		ctx.save();
		if (this.dyingTime >= 0) {
			this.drawDeath(ctx, cx, cy, r);
			this.drawParts(ctx, layout, r);
			this.drawRings(ctx, layout, r);
			this.drawSparkles(ctx, layout, r);
			ctx.restore();
			return;
		}
		this.drawTrail(ctx, layout, r);
		ctx.globalAlpha = player.isInvulnerable ? 0.55 + 0.45 * Math.sin(this.time * 20) : 1;
		this.drawAura(ctx, cx, cy, r);
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(this.angle);
		ctx.scale(1, this.mirror);
		const mouth = this.mouth();
		this.drawBody(ctx, r, mouth);
		this.drawMouthGlow(ctx, r, mouth);
		this.drawBow(ctx, r);
		ctx.restore();
		ctx.globalAlpha = 1;
		this.drawParts(ctx, layout, r);
		this.drawSparkles(ctx, layout, r);
		this.drawRings(ctx, layout, r);
		this.drawGhostStreak(ctx, layout, cx, cy, r);
		this.drawFlash(ctx, cx, cy, r);
		ctx.restore();
	}

	private ring(kind: RingKind, x: number, y: number, maxRadius: number, life: number): void {
		const grows = kind === 'pill' || kind === 'wormhole-in';
		this.rings.push({
			kind,
			x,
			y,
			radius: grows ? 0 : maxRadius,
			maxRadius,
			life,
			max: life,
			rot: Math.random() * Math.PI
		});
		if (this.rings.length > 12) {
			this.rings.shift();
		}
	}

	private part(p: Omit<Part, 'max'> & { max?: number }): void {
		if (this.parts.length < MAX_PARTS) {
			this.parts.push({ ...p, max: p.max ?? p.life });
		}
	}

	private starburst(p: { x: number; y: number }): void {
		for (let i = 0; i < 24; i++) {
			const a = (i / 24) * TAU;
			const v = (80 + Math.random() * 120) * PX;
			this.part({
				kind: 'star',
				x: p.x,
				y: p.y,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: 0.5 + Math.random() * 0.4,
				max: 0.9,
				size: (2 + Math.random() * 2.5) * PX,
				rot: Math.random() * TAU,
				spin: (Math.random() - 0.5) * 8
			});
		}
	}

	private emitSparkle(p: { x: number; y: number }): void {
		if (Math.random() >= (this.buffed ? 0.8 : 0.3) || this.sparkles.length >= MAX_SPARKLES) {
			return;
		}
		const a = Math.random() * TAU;
		const d = R * (0.5 + Math.random() * 0.8);
		const life = 0.4 + Math.random() * 0.5;
		this.sparkles.push({
			x: p.x + Math.cos(a) * d,
			y: p.y + Math.sin(a) * d,
			life,
			max: life,
			size: (1.5 + Math.random() * 2) * PX,
			angle: Math.random() * TAU,
			twinkle: Math.random() * TAU
		});
	}

	private emitRibbon(p: { x: number; y: number }): void {
		if (Math.random() >= (this.buffed ? 0.5 : 0.15)) {
			return;
		}
		const a = this.angle + Math.PI + (Math.random() - 0.5) * 0.8;
		const v = (40 + Math.random() * 60) * PX;
		this.part({
			kind: 'ribbon',
			x: p.x - Math.cos(this.angle) * R * 0.7,
			y: p.y - Math.sin(this.angle) * R * 0.7,
			vx: Math.cos(a) * v,
			vy: Math.sin(a) * v,
			life: 0.4 + Math.random() * 0.5,
			max: 0.9,
			size: (1 + Math.random() * 2) * PX,
			rot: 0,
			spin: 0
		});
	}

	private update(dt: number, player: PlayerService, options: PlayerDrawOptions): void {
		const pos = player.position;
		this.buffed = options.look === 'energized';
		if (this.flash) {
			this.flash.t -= dt;
			if (this.flash.t <= 0) this.flash = null;
		}
		const drag = Math.pow(0.94, dt * 60);
		for (const p of this.parts) {
			p.life -= dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= drag;
			p.vy *= drag;
			p.rot += p.spin * dt;
		}
		this.parts = this.parts.filter((p) => p.life > 0);
		for (const s of this.sparkles) {
			s.life -= dt;
			s.twinkle += dt * 8;
		}
		this.sparkles = this.sparkles.filter((s) => s.life > 0);
		for (const g of this.rings) {
			g.life -= dt;
			const progress = 1 - g.life / g.max;
			if (g.kind === 'dot') {
				g.radius = g.maxRadius * (1 - progress);
			} else if (g.kind === 'pill' || g.kind === 'wormhole-in') {
				g.radius = g.maxRadius * progress;
			}
		}
		this.rings = this.rings.filter((g) => g.life > 0);

		if (options.dying) {
			if (this.dyingTime < 0) {
				this.dyingTime = 0;
				this.deathEmit = 0;
			}
			this.dyingTime += dt;
			this.emitDeath(dt);
			return;
		}
		if (this.dyingTime >= 0) {
			this.reset();
		}

		if (this.streak) {
			this.streak.t -= dt;
			if (this.streak.t <= 0.1 && this.terminalFlash === 0) {
				this.terminalFlash = 0.15;
			}
			if (this.streak.t <= 0) this.streak = null;
		}
		if (this.terminalFlash > 0) {
			this.terminalFlash = Math.max(-1, this.terminalFlash - dt);
		}

		const moved = this.last ? Math.hypot(pos.x - this.last.x, pos.y - this.last.y) : 0;
		if (this.teleported || moved > 1.5) {
			// a wormhole closes behind her and opens where she comes out
			if (this.last) {
				this.ring('wormhole-out', this.last.x, this.last.y, R * 1.7, 0.3);
			}
			this.ring('wormhole-in', pos.x, pos.y, R * 1.7, 0.4);
			this.trail = [];
			this.trailHead = { x: pos.x, y: pos.y };
			this.teleported = false;
		} else if (dt > 0) {
			this.speed += (moved / dt - this.speed) * Math.min(1, dt * 10);
		}
		this.moving = this.speed > 0.5;
		this.last = { x: pos.x, y: pos.y };

		this.angle = facingAngle(player.facing, this.angle);
		const cos = Math.cos(this.angle);
		if (Math.abs(cos) > 0.5) {
			this.mirror = cos > 0 ? -1 : 1;
		}

		for (const t of this.trail) {
			t.life -= dt;
		}
		this.trail = this.trail.filter((t) => t.life > 0);
		const head = this.trailHead;
		if (!head || Math.hypot(head.x - pos.x, head.y - pos.y) > 4 * PX) {
			const life = this.buffed ? 0.7 : 0.5;
			this.trail.push({ x: pos.x, y: pos.y, life, max: life });
			this.trailHead = { x: pos.x, y: pos.y };
			this.emitSparkle(pos);
			this.emitRibbon(pos);
		}
	}

	private mouth(): number {
		let mouth = this.moving
			? Math.abs(Math.sin(this.time * MOUTH_SPEED * (this.buffed ? 1.35 : 1))) * MAX_MOUTH
			: IDLE_MOUTH;
		mouth = Math.max(0.06, Math.min(mouth, Math.PI * 0.5));
		if (this.buffed) mouth = Math.min(mouth * 1.15, Math.PI * 0.52);
		return mouth;
	}

	private drawTrail(ctx: CanvasRenderingContext2D, layout: GridLayout, r: number): void {
		if (this.trail.length < 2) {
			return;
		}
		const S = layout.tileSize;
		const px = (x: number) => layout.offsetX + x * S;
		const py = (y: number) => layout.offsetY + y * S;
		const base = r * (this.buffed ? 0.6 : 0.4);
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		for (let i = 1; i < this.trail.length; i++) {
			const a = this.trail[i - 1];
			const b = this.trail[i];
			const ratio = b.life / b.max;
			if (ratio <= 0.01) continue;
			const w = base * ratio;
			ctx.strokeStyle = rgba(RIBBON_BASE, ratio * 0.22);
			ctx.lineWidth = w * 3.5;
			ctx.beginPath();
			ctx.moveTo(px(a.x), py(a.y));
			ctx.lineTo(px(b.x), py(b.y));
			ctx.stroke();
			ctx.strokeStyle = rgba(
				this.buffed ? GOLD_BRIGHT : RIBBON_GLOW,
				ratio * (this.buffed ? 0.75 : 0.55)
			);
			ctx.lineWidth = w * (this.buffed ? 1.1 : 0.65);
			ctx.beginPath();
			ctx.moveTo(px(a.x), py(a.y));
			ctx.lineTo(px(b.x), py(b.y));
			ctx.stroke();
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawAura(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
		const auraR = r * (this.buffed ? 1.6 : 1.3);
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = rgba(ROSE_INNER, this.buffed ? 0.15 : 0.08);
		ctx.beginPath();
		ctx.arc(cx, cy, auraR, 0, TAU);
		ctx.fill();
		ctx.fillStyle = rgba(this.buffed ? GOLD_ACCENT : ROSE_INNER, 0.1);
		ctx.beginPath();
		ctx.arc(cx, cy, auraR * 0.75, 0, TAU);
		ctx.fill();
		ctx.globalCompositeOperation = 'source-over';
	}

	/** A pie slice in the sprite frame: the mouth opens around angle 0. */
	private wedge(ctx: CanvasRenderingContext2D, r: number, mouth: number): void {
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.arc(0, 0, r, mouth, TAU - mouth, false);
		ctx.closePath();
	}

	private drawBody(ctx: CanvasRenderingContext2D, r: number, mouth: number): void {
		const k = r / 24;
		ctx.globalCompositeOperation = 'source-over';
		for (let i = 5; i >= 0; i--) {
			const frac = i / 5;
			ctx.fillStyle = rgba(mixHex(ROSE_EDGE, ROSE_CORE, frac), 0.95);
			this.wedge(ctx, r * (1 - frac * 0.12), mouth);
			ctx.fill();
		}
		ctx.strokeStyle = rgba(this.buffed ? GOLD_ACCENT : ROSE_INNER, this.buffed ? 0.7 : 0.6);
		ctx.lineWidth = (this.buffed ? 7 : 5) * k;
		ctx.lineJoin = 'miter';
		this.wedge(ctx, r, mouth);
		ctx.stroke();

		// the rose ring: brightest at the front
		const sa = mouth;
		const ea = TAU - mouth;
		const segments = 48;
		ctx.lineWidth = (this.buffed ? 3 : 2.5) * k;
		ctx.lineCap = 'butt';
		for (let i = 0; i < segments; i++) {
			const a1 = sa + ((ea - sa) / segments) * i;
			const a2 = sa + ((ea - sa) / segments) * (i + 1);
			const doppler = 0.5 + 0.5 * Math.cos((a1 + a2) / 2);
			const brightness = 0.5 + doppler * 0.5;
			const color =
				(255 << 16) | (Math.round(80 + doppler * 120) << 8) | Math.round(140 + doppler * 60);
			ctx.strokeStyle = rgba(color, brightness * (this.buffed ? 1 : 0.9));
			ctx.beginPath();
			ctx.arc(0, 0, r, a1, a2, false);
			ctx.stroke();
		}
	}

	private drawMouthGlow(ctx: CanvasRenderingContext2D, r: number, mouth: number): void {
		const k = r / 24;
		const mouthSize = mouth * 2;
		if (mouthSize < 0.05) {
			return;
		}
		let alpha = Math.min(1, mouthSize / 0.6) * (this.buffed ? 0.5 : 0.35);
		if (!this.moving && !this.buffed) alpha *= 0.8 + 0.2 * Math.sin(this.time * 3);
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = rgba(this.buffed ? MOUTH_BUFFED : MOUTH_GLOW, alpha);
		this.wedge(ctx, r * 0.85, mouth);
		ctx.fill();

		const ringR = r * 0.48;
		const span = Math.PI * 0.55;
		ctx.strokeStyle = rgba(this.buffed ? GOLD_BRIGHT : RIBBON_GLOW, alpha * 1.8);
		ctx.lineWidth = (this.buffed ? 1.5 : 1.2) * k;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.arc(0, 0, ringR, Math.PI - span / 2, Math.PI + span / 2, false);
		ctx.stroke();

		if (mouthSize > 0.2) {
			ctx.fillStyle = rgba(FLARE_WHITE, alpha * 1.4);
			ctx.beginPath();
			ctx.arc(0, 0, r * 0.05, 0, TAU);
			ctx.fill();
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawBow(ctx: CanvasRenderingContext2D, r: number): void {
		const k = r / 24;
		const t = this.time;
		const bowX = Math.cos(BOW_ANGLE) * r * 0.9;
		const bowY = Math.sin(BOW_ANGLE) * r * 0.9;
		const wiggle = Math.sin(t * 5) * 0.1;
		const scale = BOW_SIZE * (this.buffed ? 1.15 : 1);
		const pulse = 1 + Math.sin(t * 4) * 0.05;
		ctx.globalCompositeOperation = 'lighter';
		for (const side of [-1, 1]) {
			const petalAngle = BOW_ANGLE + side * (0.7 + wiggle);
			const len = r * 0.9 * scale * pulse;
			const wid = r * 0.55 * scale * pulse;
			const tipX = bowX + Math.cos(petalAngle) * len;
			const tipY = bowY + Math.sin(petalAngle) * len;
			const perp = petalAngle + Math.PI / 2;
			const midX = bowX + Math.cos(petalAngle) * len * 0.5;
			const midY = bowY + Math.sin(petalAngle) * len * 0.5;
			const c1x = midX + Math.cos(perp) * wid * side;
			const c1y = midY + Math.sin(perp) * wid * side;
			const c2x = midX - Math.cos(perp) * wid * side * 0.3;
			const c2y = midY - Math.sin(perp) * wid * side * 0.3;
			const petal = () => {
				ctx.beginPath();
				ctx.moveTo(bowX, bowY);
				ctx.quadraticCurveTo(c1x, c1y, tipX, tipY);
				ctx.quadraticCurveTo(c2x, c2y, bowX, bowY);
				ctx.closePath();
			};
			ctx.strokeStyle = rgba(this.buffed ? GOLD_BRIGHT : RIBBON_GLOW, 0.4);
			ctx.lineWidth = 8 * k;
			ctx.lineJoin = 'miter';
			petal();
			ctx.stroke();
			ctx.fillStyle = rgba(this.buffed ? GOLD_ACCENT : RIBBON_BASE, 0.85);
			petal();
			ctx.fill();
			ctx.strokeStyle = rgba(FLARE_WHITE, 0.7);
			ctx.lineWidth = 1.5 * k;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(bowX, bowY);
			ctx.quadraticCurveTo(c1x * 0.95 + bowX * 0.05, c1y * 0.95 + bowY * 0.05, tipX, tipY);
			ctx.stroke();
		}
		ctx.fillStyle = rgba(this.buffed ? GOLD_BRIGHT : RIBBON_BASE, 0.95);
		ctx.beginPath();
		ctx.arc(bowX, bowY, r * 0.25 * scale * pulse, 0, TAU);
		ctx.fill();
		ctx.fillStyle = rgba(FLARE_WHITE, 0.8);
		ctx.beginPath();
		ctx.arc(bowX, bowY, r * 0.15 * scale * pulse, 0, TAU);
		ctx.fill();

		if (this.buffed) {
			for (let i = 0; i < 5; i++) {
				const a = BOW_ANGLE + (i / 5) * TAU + t * 3;
				const d = r * 1.3;
				this.star(ctx, bowX + Math.cos(a) * d, bowY + Math.sin(a) * d, r * 0.12, 1.5 * k, 0.9);
			}
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	/** The bow's four-ray star (additive, drawn by the caller's blend mode). */
	private star(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
		width: number,
		alpha: number
	): void {
		ctx.strokeStyle = rgba(GOLD_BRIGHT, alpha);
		ctx.lineWidth = width;
		ctx.lineCap = 'round';
		ctx.beginPath();
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * TAU;
			ctx.moveTo(x, y);
			ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size);
		}
		ctx.stroke();
		ctx.fillStyle = rgba(FLARE_WHITE, alpha);
		ctx.beginPath();
		ctx.arc(x, y, size * 0.3, 0, TAU);
		ctx.fill();
	}

	private heart(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		size: number,
		alpha: number
	): void {
		const s = size * 0.8;
		ctx.fillStyle = rgba(HEART_GLOW, alpha * 0.8);
		ctx.beginPath();
		ctx.moveTo(cx, cy + s * 0.3);
		ctx.bezierCurveTo(cx, cy - s * 0.3, cx - s, cy - s * 0.3, cx - s, cy + s * 0.1);
		ctx.bezierCurveTo(cx - s, cy + s * 0.6, cx, cy + s, cx, cy + s);
		ctx.bezierCurveTo(cx, cy + s, cx + s, cy + s * 0.6, cx + s, cy + s * 0.1);
		ctx.bezierCurveTo(cx + s, cy - s * 0.3, cx, cy - s * 0.3, cx, cy + s * 0.3);
		ctx.fill();
		ctx.fillStyle = rgba(FLARE_WHITE, alpha * 0.7);
		ctx.beginPath();
		ctx.arc(cx - s * 0.3, cy - s * 0.1, s * 0.2, 0, TAU);
		ctx.fill();
	}

	private dot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
		ctx.beginPath();
		ctx.arc(x, y, Math.max(0, radius), 0, TAU);
		ctx.fill();
	}

	private drawParts(ctx: CanvasRenderingContext2D, layout: GridLayout, r: number): void {
		const S = layout.tileSize;
		const k = r / 24;
		ctx.globalCompositeOperation = 'lighter';
		for (const p of this.parts) {
			if (p.life <= 0.01) continue;
			const a = p.life / p.max;
			const x = layout.offsetX + p.x * S;
			const y = layout.offsetY + p.y * S;
			const size = p.size * S;
			if (p.kind === 'star') {
				ctx.fillStyle = rgba(GOLD_ACCENT, a * 0.3);
				this.dot(ctx, x, y, size * 2.5 * a);
				ctx.strokeStyle = rgba(GOLD_BRIGHT, a);
				ctx.lineWidth = k;
				ctx.lineCap = 'round';
				ctx.beginPath();
				for (let i = 0; i < 4; i++) {
					const ra = p.rot + (i / 4) * TAU;
					ctx.moveTo(x, y);
					ctx.lineTo(x + Math.cos(ra) * size * 1.5, y + Math.sin(ra) * size * 1.5);
				}
				ctx.stroke();
				ctx.fillStyle = rgba(FLARE_WHITE, a);
				this.dot(ctx, x, y, size * 0.4);
			} else if (p.kind === 'heart') {
				this.heart(ctx, x, y, size * a, a);
			} else {
				const ribbon = p.kind === 'ribbon';
				ctx.fillStyle = rgba(ribbon ? RIBBON_BASE : SPARKLE_BASE, a * (ribbon ? 0.4 : 0.3));
				this.dot(ctx, x, y, size * 2 * a);
				ctx.fillStyle = rgba(ribbon ? RIBBON_GLOW : SPARKLE_GLOW, a * 0.9);
				this.dot(ctx, x, y, size * (ribbon ? 0.5 : 0.4) * a);
			}
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawSparkles(ctx: CanvasRenderingContext2D, layout: GridLayout, r: number): void {
		const S = layout.tileSize;
		const k = r / 24;
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		ctx.lineWidth = 0.8 * k;
		for (const s of this.sparkles) {
			const a = s.life / s.max;
			const tw = 0.5 + 0.5 * Math.sin(s.twinkle);
			const x = layout.offsetX + s.x * S;
			const y = layout.offsetY + s.y * S;
			const sz = s.size * S * a * tw;
			for (let i = 0; i < 4; i++) {
				const ra = s.angle + (i / 4) * TAU;
				ctx.strokeStyle = rgba(i % 2 === 0 ? GOLD_BRIGHT : FLARE_WHITE, a * tw);
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + Math.cos(ra) * sz * 1.2, y + Math.sin(ra) * sz * 1.2);
				ctx.stroke();
			}
			ctx.fillStyle = rgba(FLARE_WHITE, a * tw);
			this.dot(ctx, x, y, sz * 0.3);
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawRings(ctx: CanvasRenderingContext2D, layout: GridLayout, r: number): void {
		const S = layout.tileSize;
		const k = r / 24;
		const circle = (x: number, y: number, radius: number) => {
			ctx.beginPath();
			ctx.arc(x, y, Math.max(0, radius), 0, TAU);
			ctx.stroke();
		};
		ctx.globalCompositeOperation = 'lighter';
		for (const g of this.rings) {
			const a = Math.max(0, g.life / g.max);
			const x = layout.offsetX + g.x * S;
			const y = layout.offsetY + g.y * S;
			const radius = g.radius * S;
			if (g.kind === 'dot') {
				if (radius > 0.5 * k) {
					ctx.strokeStyle = rgba(RIBBON_GLOW, a * 0.9);
					ctx.lineWidth = 1.5 * a * k;
					circle(x, y, radius);
					ctx.strokeStyle = rgba(FLARE_WHITE, a * 0.8);
					ctx.lineWidth = 0.8 * a * k;
					circle(x, y, radius * 0.6);
				}
			} else if (g.kind === 'pill') {
				ctx.strokeStyle = rgba(GOLD_BRIGHT, a * 0.9);
				ctx.lineWidth = 3 * a * k;
				circle(x, y, radius);
				ctx.strokeStyle = rgba(RIBBON_GLOW, a * 0.4);
				ctx.lineWidth = 5 * a * k;
				circle(x, y, radius * 0.85);
				ctx.strokeStyle = rgba(FLARE_WHITE, a * 0.7);
				ctx.lineWidth = 1.5 * a * k;
				circle(x, y, radius * 0.3);
			} else {
				const entry = g.kind === 'wormhole-in';
				const progress = 1 - a;
				const ringR = entry ? radius : g.maxRadius * S;
				ctx.strokeStyle = rgba(entry ? GOLD_BRIGHT : RIBBON_GLOW, a * 0.8);
				ctx.lineWidth = 4 * a * k;
				circle(x, y, ringR);
				ctx.strokeStyle = rgba(FLARE_WHITE, a * 0.9);
				ctx.lineWidth = 2.5 * a * k;
				circle(x, y, ringR * 0.65);
				const baseTwist = Math.PI * 1.8;
				const twist = entry
					? progress * baseTwist * (0.8 + 0.4 * Math.sin(progress * 10))
					: (1 - progress) * baseTwist;
				for (let s = 0; s < 12; s++) {
					const base = (s / 12) * TAU + g.rot;
					const ia = base + twist;
					const oa = base - twist * 0.5;
					const inner = ringR * 0.15 * a;
					const outer = ringR * (0.9 + a * 0.1);
					ctx.strokeStyle = rgba(s % 3 === 0 ? GOLD_BRIGHT : RIBBON_GLOW, a * 0.7);
					ctx.lineWidth = (s % 3 === 0 ? 1.8 : 0.8) * a * k;
					ctx.beginPath();
					ctx.moveTo(x + Math.cos(ia) * inner, y + Math.sin(ia) * inner);
					ctx.lineTo(x + Math.cos(oa) * outer, y + Math.sin(oa) * outer);
					ctx.stroke();
				}
			}
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawGhostStreak(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		cx: number,
		cy: number,
		r: number
	): void {
		const k = r / 24;
		ctx.globalCompositeOperation = 'lighter';
		if (this.streak) {
			const S = layout.tileSize;
			const progress = 1 - this.streak.t / GHOST_STREAK_TIME;
			const sx = layout.offsetX + this.streak.x * S;
			const sy = layout.offsetY + this.streak.y * S;
			const t = Math.min(1, progress * 2.5);
			const ex = sx + (cx - sx) * t;
			const ey = sy + (cy - sy) * t;
			const a = 1 - progress;
			ctx.lineCap = 'round';
			ctx.strokeStyle = rgba(GHOST_STREAK, a * 0.4);
			ctx.lineWidth = 3.5 * a * k;
			ctx.beginPath();
			ctx.moveTo(sx, sy);
			ctx.lineTo(ex, ey);
			ctx.stroke();
			ctx.strokeStyle = rgba(FLARE_WHITE, a * 0.8);
			ctx.lineWidth = 1.2 * a * k;
			ctx.beginPath();
			ctx.moveTo(sx, sy);
			ctx.lineTo(ex, ey);
			ctx.stroke();
		}
		if (this.terminalFlash > 0) {
			const fa = this.terminalFlash / 0.15;
			const flashR = r * (0.5 + fa * 1.5);
			ctx.fillStyle = rgba(FLARE_WHITE, fa * 0.7);
			this.dot(ctx, cx, cy, flashR);
			ctx.fillStyle = rgba(GHOST_STREAK, fa * 0.3);
			this.dot(ctx, cx, cy, flashR * 1.6);
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
		const circle = (radius: number) => {
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, TAU);
			ctx.stroke();
		};
		ctx.globalCompositeOperation = 'lighter';
		if (f.kind === 'ghost') {
			ctx.strokeStyle = rgba(FLARE_WHITE, a * 0.7);
			ctx.lineWidth = 3.5 * a * k;
			circle(r);
			ctx.strokeStyle = rgba(GOLD_ACCENT, a * 0.35);
			ctx.lineWidth = 6 * a * k;
			circle(r + 8 * k);
		} else if (f.kind === 'pill') {
			ctx.strokeStyle = rgba(GOLD_BRIGHT, a * 0.9);
			ctx.lineWidth = 2.5 * a * k;
			circle(r);
		} else {
			ctx.fillStyle = rgba(FLARE_WHITE, a * 0.3);
			this.dot(ctx, cx, cy, r * 0.25);
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
			const n = 3 + Math.floor(shrink * 5);
			for (let i = 0; i < n; i++) {
				const a = Math.random() * TAU;
				const v = (80 + Math.random() * 200) * PX;
				const kind: PartKind =
					Math.random() < 0.3 ? 'heart' : Math.random() < 0.5 ? 'star' : 'sparkle';
				this.part({
					kind,
					x: p.x + Math.cos(a) * R * 0.3,
					y: p.y + Math.sin(a) * R * 0.3,
					vx: Math.cos(a) * v,
					vy: Math.sin(a) * v,
					life: 0.5 + Math.random() * 0.8,
					max: 1.3,
					size: (1 + Math.random() * 3) * PX,
					rot: Math.random() * TAU,
					spin: (Math.random() - 0.5) * 10
				});
			}
		}
	}

	/** Convulse, shrink into a shower of hearts and stars, pop, flash. */
	private drawDeath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number): void {
		const t = this.dyingTime;
		const shrink = Math.min(1, Math.max(0, (t - 0.3) / 1.5));
		const r = t < 0.3 ? r0 * (1 + Math.sin(t * 50) * 0.12) : Math.max(0, r0 * (1 - shrink * 0.88));
		const k = r0 / 24;
		const alpha = t < 1.8 ? 1 : Math.max(0, 1 - (t - 1.8) / 0.2);
		if (r <= 0.3 * k || alpha <= 0) {
			return;
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = rgba(ROSE_CORE, alpha);
		this.dot(ctx, cx, cy, r);
		const ring = (radius: number) => {
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, TAU);
			ctx.stroke();
		};
		if (t < 0.3) {
			const flicker = 0.5 + 0.5 * Math.sin(t * 50);
			ctx.strokeStyle = rgba(
				flicker > 0.7 ? FLARE_WHITE : RIBBON_GLOW,
				(0.5 + flicker * 0.5) * alpha
			);
			ctx.lineWidth = (2 + flicker * 3) * k;
			ring(r);
		} else {
			ctx.strokeStyle = rgba(
				shrink > 0.7 ? GOLD_BRIGHT : ROSE_BUFFED,
				(0.5 + shrink * 0.5) * alpha
			);
			ctx.lineWidth = (1.5 + shrink * 1.5) * k;
			ring(r);
			ctx.strokeStyle = rgba(RIBBON_GLOW, shrink * alpha * 0.4);
			ctx.lineWidth = k;
			ring(r * (1.2 + shrink * 2.5));
		}
		ctx.globalCompositeOperation = 'lighter';
		if (t >= 1.5 && t < 1.8) {
			const p = (t - 1.5) / 0.3;
			ctx.fillStyle = rgba(FLARE_WHITE, (1 - p) * 0.9);
			this.dot(ctx, cx, cy, r0 * 0.2 * (1 + p * 3));
		}
		if (t >= 1.8 && t < 1.95) {
			const f = Math.max(0, 1 - (t - 1.8) / 0.15);
			ctx.fillStyle = rgba(FLARE_WHITE, f * 0.6);
			this.dot(ctx, cx, cy, r0 * 2 * (2 - f));
		}
		ctx.globalCompositeOperation = 'source-over';
	}
}
