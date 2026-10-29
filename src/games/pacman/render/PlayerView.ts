import type { PlayerService } from '../logic/PlayerService';
import type { PacmanAudioCue, PacmanProfile } from '../core/Events';
import type { GridLayout } from './GridView';

/** Per-frame modifiers decided by the game (power-ups, weapons, death). */
export interface PlayerDrawOptions {
	/** Power pellet / berserk: hotter body, corona, brighter trail. */
	readonly supernova: boolean;
	/** BFG charge 0..1: the body heats to white and draws plasma into the mouth. */
	readonly charge: number;
	/** The death sequence is running: convulse, collapse, pop. */
	readonly dying: boolean;
}

interface TrailPoint {
	x: number;
	y: number;
	life: number;
	max: number;
}

interface Spark {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	temp: number;
	active: boolean;
}

type RingKind = 'micro' | 'mega' | 'entry' | 'exit';

interface Ring {
	x: number;
	y: number;
	life: number;
	max: number;
	radius: number;
	kind: RingKind;
	rot: number;
}

// "Solar flare" palette of the prototype
const CHROMOSPHERE = '#110500';
const PHOTOSPHERE = 0xff4400;
const CORONA_OUTER = '#ff8800';
const CORONA_INNER = 0xffcc44;
const SOLAR_FLARE = 0xffee88;
const PROMINENCE = 0xff2200;
const SUPERHOT = '#ffffff';
const PLASMA_GHOST = '#ff9944';

const TAU = Math.PI * 2;
const SPARKS = 180;
/** The prototype was tuned for a 28 px radius; speeds are scaled from that. */
const PROTO_R = 28;

function lerpColor(a: number, b: number, t: number): string {
	const ar = (a >> 16) & 255;
	const ag = (a >> 8) & 255;
	const ab = a & 255;
	const r = Math.round(ar + (((b >> 16) & 255) - ar) * t);
	const g = Math.round(ag + (((b >> 8) & 255) - ag) * t);
	const bl = Math.round(ab + ((b & 255) - ab) * t);
	return `rgb(${r},${g},${bl})`;
}

function rgba(hex: number, a: number): string {
	return `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${a})`;
}

function directionAngle(facing: string | null): number {
	if (facing === 'UP') {
		return -Math.PI / 2;
	}
	if (facing === 'DOWN') {
		return Math.PI / 2;
	}
	if (facing === 'LEFT') {
		return Math.PI;
	}
	return 0;
}

/**
 * Plasma Pac-Man, ported from the SOLAR FLARE prototype to Canvas2D and used on every
 * level. Positions of the trail and the sparks are kept in tile units, so they follow
 * the maze when the layout changes.
 */
export class PlayerView {
	private readonly trail: TrailPoint[] = [];
	private readonly sparks: Spark[] = [];
	private readonly rings: Ring[] = [];
	private time = 0;
	private lastTime = -1;
	private last: { x: number; y: number } | null = null;
	private lastTrail: { x: number; y: number } | null = null;
	private angle = 0;
	private moving = false;
	private flash = 0;
	private flashMax = 1;
	private flashKind: 'micro' | 'mega' | 'plasma' | null = null;
	private absorb = 0;
	private collapse = -1;
	private chargeEmit = 0;
	private pendingTeleport = false;

	constructor() {
		for (let i = 0; i < SPARKS; i += 1) {
			this.sparks.push({
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				life: 0,
				max: 1,
				size: 1,
				temp: 0.5,
				active: false
			});
		}
	}

	/** Gameplay events that make the plasma react. */
	trigger(cue: PacmanAudioCue): void {
		if (cue === 'dot') {
			this.setFlash('micro', 0.12);
			const at = this.last ?? { x: 0, y: 0 };
			this.ring(
				'micro',
				at.x + Math.cos(this.angle) * 0.45,
				at.y + Math.sin(this.angle) * 0.45,
				0.15,
				6 / PROTO_R
			);
		} else if (cue === 'energizer' || cue === 'fruit-collect' || cue === 'egg-collect') {
			this.megaFlare();
		} else if (cue === 'ghost-eaten') {
			this.setFlash('plasma', 0.3);
			this.absorb = 0.3;
			this.burst(15, 100, 300, 0.3, 0.8, 1, 4, 0.8);
		} else if (cue === 'teleport') {
			this.pendingTeleport = true;
		} else if (cue === 'death') {
			this.collapse = 0;
		}
	}

	/** BFG release: muzzle burst in the facing direction. */
	fireBurst(): void {
		this.megaFlare();
		const ox = Math.cos(this.angle) * 0.45;
		const oy = Math.sin(this.angle) * 0.45;
		for (let i = 0; i < 24; i += 1) {
			const a = this.angle + (Math.random() - 0.5) * 0.9;
			const v = (180 + Math.random() * 320) / (PROTO_R / 0.42);
			this.spawn({
				x: ox,
				y: oy,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: 0.3 + Math.random() * 0.4,
				size: 1 + Math.random() * 2.5,
				temp: 0.9
			});
		}
	}

	reset(): void {
		this.trail.length = 0;
		this.rings.length = 0;
		for (const s of this.sparks) {
			s.active = false;
		}
		this.collapse = -1;
		this.flash = 0;
		this.absorb = 0;
		this.last = null;
		this.lastTrail = null;
	}

	draw(
		ctx: CanvasRenderingContext2D,
		player: PlayerService,
		layout: GridLayout,
		profile: PacmanProfile,
		time: number,
		options: PlayerDrawOptions = { supernova: false, charge: 0, dying: false }
	): void {
		const S = layout.tileSize;
		if (!Number.isFinite(S) || S <= 0) {
			return;
		}
		const pos = player.position;
		if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
			return;
		}
		const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
		this.lastTime = time;
		this.time += dt;
		if (!options.dying && this.collapse >= 0) {
			this.reset();
		}
		if (options.dying && this.collapse < 0) {
			this.collapse = 0;
		}

		// motion and facing
		const moved = this.last ? Math.hypot(pos.x - this.last.x, pos.y - this.last.y) : 0;
		if (this.pendingTeleport && this.last) {
			this.coronal(this.last, false);
			this.coronal(pos, true);
			this.trail.length = 0;
			this.lastTrail = null;
		}
		this.pendingTeleport = false;
		this.moving = moved > 1e-4 && moved < 2;
		if (player.facing) {
			this.angle = directionAngle(player.facing);
		}
		this.last = { x: pos.x, y: pos.y };

		const r = S * 0.42;
		const k = r / PROTO_R;
		const supernova = options.supernova || options.charge > 0;
		this.update(dt, pos, supernova, options);

		const cx = layout.offsetX + pos.x * S;
		const cy = layout.offsetY + pos.y * S;
		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		if (this.collapse >= 0) {
			this.drawCollapse(ctx, cx, cy, r, k, S, layout);
			ctx.restore();
			return;
		}
		this.drawTrail(ctx, layout, S, r, supernova);
		// contact shadow keeps the body readable on any floor
		const shadow = ctx.createRadialGradient(cx, cy + r * 0.2, r * 0.6, cx, cy + r * 0.2, r * 1.6);
		shadow.addColorStop(0, 'rgba(0,0,0,0.45)');
		shadow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = shadow;
		ctx.fillRect(cx - r * 1.6, cy - r * 1.4, r * 3.2, r * 3.2);
		if (supernova) {
			this.drawCorona(ctx, cx, cy, r, k, options.charge);
		}
		const blink = player.isInvulnerable && Math.floor(this.time * 12) % 2 === 0;
		ctx.globalAlpha = blink ? 0.45 : 1;
		const mouth = this.mouthAngle(supernova, options.charge);
		this.drawBody(ctx, cx, cy, r, k, mouth, supernova);
		this.drawMouthGlow(ctx, cx, cy, r, k, mouth, supernova);
		if (options.charge > 0) {
			this.drawCharge(ctx, cx, cy, r, options.charge);
		}
		if (profile === 'ms-pacman') {
			this.drawBow(ctx, cx, cy, r);
		}
		ctx.globalAlpha = 1;
		this.drawSparks(ctx, layout, S);
		this.drawRings(ctx, layout, S, r, k);
		this.drawFlash(ctx, cx, cy, r, k);
		ctx.restore();
	}

	private update(
		dt: number,
		pos: { x: number; y: number },
		supernova: boolean,
		options: PlayerDrawOptions
	): void {
		for (let i = this.trail.length - 1; i >= 0; i -= 1) {
			this.trail[i].life -= dt;
			if (this.trail[i].life <= 0) {
				this.trail.splice(i, 1);
			}
		}
		for (const s of this.sparks) {
			if (!s.active) {
				continue;
			}
			s.life -= dt;
			if (s.life <= 0) {
				s.active = false;
				continue;
			}
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			const drag = Math.pow(0.92, dt * 60);
			s.vx *= drag;
			s.vy *= drag;
			s.temp *= Math.pow(0.995, dt * 60);
		}
		for (let i = this.rings.length - 1; i >= 0; i -= 1) {
			const ring = this.rings[i];
			ring.life -= dt;
			if (ring.life <= 0) {
				this.rings.splice(i, 1);
			}
		}
		this.flash = Math.max(0, this.flash - dt);
		this.absorb = Math.max(0, this.absorb - dt);
		if (this.collapse >= 0) {
			this.collapse += dt;
			const shrink = Math.min(1, Math.max(0, (this.collapse - 0.3) / 1.5));
			if (this.collapse >= 0.3 && this.collapse < 1.8) {
				const count = Math.round((2 + shrink * 5) * dt * 30);
				for (let i = 0; i < count; i += 1) {
					const jet = Math.random() < 0.45;
					const a = jet
						? this.angle + (Math.random() - 0.5) * 0.7 + (Math.random() < 0.5 ? 0 : Math.PI)
						: Math.random() * TAU;
					const v = ((jet ? 200 + Math.random() * 300 : 70 + Math.random() * 150) * 0.42) / PROTO_R;
					this.spawn({
						x: 0,
						y: 0,
						vx: Math.cos(a) * v,
						vy: Math.sin(a) * v,
						life: 0.45 + Math.random() * 0.8,
						size: 0.5 + Math.random() * 3,
						temp: 0.7 + Math.random() * 0.3,
						absolute: pos
					});
				}
			}
			return;
		}
		// trail points every ~0.06 tiles of travel
		const lt = this.lastTrail;
		if (!lt || Math.hypot(pos.x - lt.x, pos.y - lt.y) > 4 / (PROTO_R / 0.42)) {
			const life = supernova ? 0.7 : 0.45;
			this.trail.push({ x: pos.x, y: pos.y, life, max: life });
			this.lastTrail = { x: pos.x, y: pos.y };
			if (Math.random() < (supernova ? 0.15 : 0.06)) {
				const a = Math.random() * TAU;
				const d = 0.42 * (0.95 + Math.random() * 0.15);
				const v = ((40 + Math.random() * 100) * 0.42) / PROTO_R;
				this.spawn({
					x: Math.cos(a) * d,
					y: Math.sin(a) * d,
					vx: Math.cos(a) * v,
					vy: Math.sin(a) * v,
					life: 0.15 + Math.random() * 0.25,
					size: 0.3 + Math.random() * 0.8,
					temp: 0.7 + Math.random() * 0.3,
					absolute: pos
				});
			}
		}
		// BFG charge: plasma is sucked into the mouth
		if (options.charge > 0) {
			this.chargeEmit += dt * (20 + options.charge * 40);
			while (this.chargeEmit >= 1) {
				this.chargeEmit -= 1;
				const a = Math.random() * TAU;
				const d = 0.42 * (1.8 + Math.random() * 0.8);
				const mx = Math.cos(this.angle) * 0.25;
				const my = Math.sin(this.angle) * 0.25;
				const life = 0.25 + Math.random() * 0.15;
				const sx = Math.cos(a) * d;
				const sy = Math.sin(a) * d;
				this.spawn({
					x: sx,
					y: sy,
					vx: (mx - sx) / life,
					vy: (my - sy) / life,
					life,
					size: 0.8 + Math.random() * 1.6,
					temp: 0.85,
					absolute: pos
				});
			}
		}
	}

	private spawn(o: {
		x: number;
		y: number;
		vx: number;
		vy: number;
		life: number;
		size: number;
		temp: number;
		absolute?: { x: number; y: number };
	}): void {
		for (const s of this.sparks) {
			if (!s.active) {
				const base = o.absolute ?? this.last ?? { x: 0, y: 0 };
				s.x = base.x + o.x;
				s.y = base.y + o.y;
				s.vx = o.vx;
				s.vy = o.vy;
				s.life = o.life;
				s.max = o.life;
				s.size = o.size;
				s.temp = o.temp;
				s.active = true;
				return;
			}
		}
	}

	private burst(
		n: number,
		vmin: number,
		vmax: number,
		lmin: number,
		lmax: number,
		smin: number,
		smax: number,
		temp: number
	): void {
		for (let i = 0; i < n; i += 1) {
			const a = Math.random() * TAU;
			const v = ((vmin + Math.random() * (vmax - vmin)) * 0.42) / PROTO_R;
			this.spawn({
				x: Math.cos(a) * 0.21,
				y: Math.sin(a) * 0.21,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: lmin + Math.random() * (lmax - lmin),
				size: smin + Math.random() * (smax - smin),
				temp: temp + Math.random() * (1 - temp)
			});
		}
	}

	private megaFlare(): void {
		this.setFlash('mega', 0.5);
		const at = this.last ?? { x: 0, y: 0 };
		this.ring('mega', at.x, at.y, 0.5, 3.5);
		this.burst(20, 50, 300, 0.4, 1.0, 0.8, 3.3, 0.6);
	}

	private setFlash(kind: 'micro' | 'mega' | 'plasma', seconds: number): void {
		this.flashKind = kind;
		this.flash = seconds;
		this.flashMax = seconds;
	}

	/** Ring burst at tile coordinates (x, y); `radius` is in body radii. */
	private ring(kind: RingKind, x: number, y: number, life: number, radius: number): void {
		this.rings.push({ x, y, life, max: life, radius, kind, rot: Math.random() * Math.PI });
	}

	/** Coronal ejection: the exit burst where the player left, the entry where they arrive. */
	private coronal(at: { x: number; y: number }, entry: boolean): void {
		this.ring(entry ? 'entry' : 'exit', at.x, at.y, entry ? 0.35 : 0.25, 1.6);
		for (let i = 0; i < (entry ? 12 : 8); i += 1) {
			const a = Math.random() * TAU;
			const v = ((80 + Math.random() * 180) * 0.42) / PROTO_R;
			this.spawn({
				x: Math.cos(a) * 0.15,
				y: Math.sin(a) * 0.15,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: 0.2 + Math.random() * 0.3,
				size: 0.5 + Math.random() * 1.5,
				temp: 0.7 + Math.random() * 0.3,
				absolute: at
			});
		}
	}

	private mouthAngle(supernova: boolean, charge: number): number {
		let mouth: number;
		if (charge > 0) {
			mouth = Math.PI * (0.18 + 0.27 * charge);
		} else if (this.moving) {
			const speed = supernova ? 1.45 : 1;
			mouth = Math.abs(Math.sin(this.time * 1000 * 0.01 * speed)) * (Math.PI / 2.8);
		} else {
			mouth = Math.PI / 14;
		}
		mouth = Math.max(0.06, Math.min(mouth, Math.PI * 0.45));
		if (supernova && charge <= 0) {
			mouth = Math.min(mouth * 1.2, Math.PI * 0.48);
		}
		return mouth;
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
		k: number,
		mouth: number,
		supernova: boolean
	): void {
		const sa = this.angle + mouth;
		const ea = this.angle + TAU - mouth;
		const alpha = ctx.globalAlpha;
		for (let i = 5; i >= 0; i -= 1) {
			const frac = i / 5;
			const gr = r * (1 - frac * 0.12);
			const color = lerpColor(
				frac < 0.5 ? PHOTOSPHERE : PROMINENCE,
				frac < 0.5 ? CORONA_INNER : SOLAR_FLARE,
				frac
			);
			ctx.globalAlpha = alpha * (0.8 + (1 - frac) * 0.2);
			ctx.fillStyle = color;
			this.wedge(ctx, cx, cy, gr, sa, ea);
			ctx.fill();
		}
		ctx.globalAlpha = alpha * (supernova ? 0.55 : 0.5);
		ctx.strokeStyle = supernova ? rgba(SOLAR_FLARE, 1) : CORONA_OUTER;
		ctx.lineWidth = (supernova ? 8 : 6) * k;
		this.wedge(ctx, cx, cy, r, sa, ea);
		ctx.stroke();
		// temperature rim: hottest at the back, cooler toward the mouth
		const segments = 32;
		ctx.lineCap = 'butt';
		ctx.lineWidth = (supernova ? 3 : 2.5) * k;
		for (let i = 0; i < segments; i += 1) {
			const a1 = sa + ((ea - sa) / segments) * i;
			const a2 = sa + ((ea - sa) / segments) * (i + 1);
			const temp = 0.5 + 0.5 * Math.cos((a1 + a2) / 2 - this.angle);
			ctx.globalAlpha = alpha * (0.4 + temp * 0.6) * (supernova ? 1 : 0.9);
			ctx.strokeStyle = `rgb(${Math.round(180 + temp * 75)},${Math.round(40 + temp * 100)},${Math.round(10 + temp * 30)})`;
			ctx.beginPath();
			ctx.arc(cx, cy, r, a1, a2, false);
			ctx.stroke();
		}
		ctx.lineCap = 'round';
		ctx.globalAlpha = alpha;
	}

	private drawMouthGlow(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		r: number,
		k: number,
		mouth: number,
		supernova: boolean
	): void {
		const mouthSize = mouth * 2;
		if (mouthSize < 0.05) {
			return;
		}
		const sa = this.angle + mouth;
		const ea = this.angle + TAU - mouth;
		let a = Math.min(1, mouthSize / 0.55) * (supernova ? 0.45 : 0.3);
		if (!this.moving && !supernova) {
			a *= 0.75 + 0.25 * Math.sin(this.time * 3);
		}
		const alpha = ctx.globalAlpha;
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = alpha * a;
		ctx.fillStyle = supernova ? SUPERHOT : rgba(CORONA_INNER, 1);
		this.wedge(ctx, cx, cy, r * 0.8, sa, ea);
		ctx.fill();
		const span = Math.PI * 0.6;
		const mid = sa + (ea - sa) / 2;
		ctx.globalAlpha = alpha * Math.min(1, a * 1.7);
		ctx.strokeStyle = supernova ? SUPERHOT : rgba(SOLAR_FLARE, 1);
		ctx.lineWidth = (supernova ? 1.4 : 1) * k;
		ctx.beginPath();
		ctx.arc(cx, cy, r * 0.5, mid - span / 2, mid + span / 2, false);
		ctx.stroke();
		if (mouthSize > 0.2) {
			ctx.globalAlpha = alpha * Math.min(1, a * 1.3);
			ctx.fillStyle = SUPERHOT;
			ctx.beginPath();
			ctx.arc(cx, cy, r * 0.06, 0, TAU);
			ctx.fill();
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = alpha;
	}

	private drawCorona(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		r: number,
		k: number,
		charge: number
	): void {
		const cr = r * (1.2 + charge * 0.25 * Math.sin(this.time * 30));
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.4);
		glow.addColorStop(0, `rgba(255,136,0,${0.28 + charge * 0.3})`);
		glow.addColorStop(1, 'rgba(255,136,0,0)');
		ctx.fillStyle = glow;
		ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
		const passes: Array<[string, number, number, number]> = [
			[CORONA_OUTER, cr + 6 * k, 10 * k, 0.12],
			[CORONA_OUTER, cr, 2.5 * k, 0.35],
			[rgba(SOLAR_FLARE, 1), cr - 2 * k, 1 * k, 0.2]
		];
		for (const [color, radius, width, a] of passes) {
			ctx.globalAlpha = a;
			ctx.strokeStyle = color;
			ctx.lineWidth = Math.max(0.5, width);
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, TAU);
			ctx.stroke();
		}
		ctx.restore();
	}

	/** Body heating to white while the BFG charges. */
	private drawCharge(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		r: number,
		charge: number
	): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * (1 + charge * 0.6));
		g.addColorStop(0, `rgba(255,255,255,${0.75 * charge})`);
		g.addColorStop(0.5, `rgba(255,238,136,${0.45 * charge})`);
		g.addColorStop(1, 'rgba(255,120,0,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(cx, cy, r * (1 + charge * 0.6), 0, TAU);
		ctx.fill();
		ctx.restore();
	}

	private drawTrail(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		S: number,
		r: number,
		supernova: boolean
	): void {
		if (this.trail.length < 2) {
			return;
		}
		const base = r * (supernova ? 0.6 : 0.4);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 1; i < this.trail.length; i += 1) {
			const p1 = this.trail[i - 1];
			const p2 = this.trail[i];
			const ratio = p2.life / p2.max;
			if (ratio <= 0.01 || Math.hypot(p2.x - p1.x, p2.y - p1.y) > 1) {
				continue;
			}
			const x1 = layout.offsetX + p1.x * S;
			const y1 = layout.offsetY + p1.y * S;
			const x2 = layout.offsetX + p2.x * S;
			const y2 = layout.offsetY + p2.y * S;
			const w = base * ratio;
			ctx.globalAlpha = ratio * (supernova ? 0.22 : 0.13);
			ctx.strokeStyle = rgba(PROMINENCE, 1);
			ctx.lineWidth = w * 3.5;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
			ctx.globalAlpha = ratio * (supernova ? 0.65 : 0.5);
			ctx.strokeStyle = supernova ? SUPERHOT : rgba(CORONA_INNER, 1);
			ctx.lineWidth = w * (supernova ? 1.1 : 0.6);
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}
		ctx.restore();
	}

	private drawSparks(ctx: CanvasRenderingContext2D, layout: GridLayout, S: number): void {
		const k = (S * 0.42) / PROTO_R;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (const s of this.sparks) {
			if (!s.active) {
				continue;
			}
			const a = Math.max(0, s.life / s.max);
			if (a <= 0.01) {
				continue;
			}
			const x = layout.offsetX + s.x * S;
			const y = layout.offsetY + s.y * S;
			ctx.globalAlpha = a * 0.18;
			ctx.fillStyle = rgba(PHOTOSPHERE, 1);
			ctx.beginPath();
			ctx.arc(x, y, Math.max(0.3, s.size * 2 * a * k), 0, TAU);
			ctx.fill();
			ctx.globalAlpha = a * 0.75;
			ctx.fillStyle = lerpColor(0xff2200, 0xffffff, s.temp);
			ctx.beginPath();
			ctx.arc(x, y, Math.max(0.3, s.size * 0.4 * a * k + 0.3), 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	private drawRings(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		S: number,
		r: number,
		k: number
	): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (const ring of this.rings) {
			const a = Math.max(0, ring.life / ring.max);
			const progress = 1 - a;
			const x = layout.offsetX + ring.x * S;
			const y = layout.offsetY + ring.y * S;
			const max = ring.radius * r;
			if (ring.kind === 'micro') {
				const rr = max * a;
				ctx.globalAlpha = a * 0.8;
				ctx.strokeStyle = rgba(SOLAR_FLARE, 1);
				ctx.lineWidth = Math.max(0.4, 1.5 * a * k);
				ctx.beginPath();
				ctx.arc(x, y, Math.max(0.3, rr), 0, TAU);
				ctx.stroke();
			} else if (ring.kind === 'mega') {
				const rr = max * progress;
				const passes: Array<[string, number, number, number]> = [
					[SUPERHOT, rr, 3, 0.7],
					[CORONA_OUTER, rr * 0.75, 5, 0.3],
					[SUPERHOT, rr * 0.2, 1.5, 0.55]
				];
				for (const [color, radius, width, al] of passes) {
					ctx.globalAlpha = a * al;
					ctx.strokeStyle = color;
					ctx.lineWidth = Math.max(0.4, width * a * k);
					ctx.beginPath();
					ctx.arc(x, y, Math.max(0.3, radius), 0, TAU);
					ctx.stroke();
				}
			} else {
				const entry = ring.kind === 'entry';
				const rr = entry ? max * progress : max;
				ctx.globalAlpha = a * 0.7;
				ctx.strokeStyle = entry ? rgba(SOLAR_FLARE, 1) : rgba(CORONA_INNER, 1);
				ctx.lineWidth = Math.max(0.4, 4 * a * k);
				ctx.beginPath();
				ctx.arc(x, y, Math.max(0.3, rr), 0, TAU);
				ctx.stroke();
				const twist = entry ? progress * Math.PI * 1.5 : (1 - progress) * Math.PI * 1.5;
				for (let s = 0; s < 12; s += 1) {
					const base = (s / 12) * TAU + ring.rot;
					const ia = base + twist;
					const oa = base - twist * 0.5;
					const id = rr * 0.15 * a;
					const od = rr * (0.8 + a * 0.2);
					ctx.globalAlpha = a * 0.5;
					ctx.strokeStyle = s % 3 === 0 ? SUPERHOT : rgba(CORONA_INNER, 1);
					ctx.lineWidth = Math.max(0.3, (s % 3 === 0 ? 1.8 : 0.8) * a * k);
					ctx.beginPath();
					ctx.moveTo(x + Math.cos(ia) * id, y + Math.sin(ia) * id);
					ctx.lineTo(x + Math.cos(oa) * od, y + Math.sin(oa) * od);
					ctx.stroke();
				}
			}
		}
		ctx.restore();
	}

	private drawFlash(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		r: number,
		k: number
	): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		if (this.absorb > 0) {
			const a = this.absorb / 0.3;
			const fr = r * (0.5 + a * 2);
			const layers: Array<[string, number, number]> = [
				[PLASMA_GHOST, 1.8, 0.2],
				[rgba(CORONA_INNER, 1), 1.2, 0.45],
				[SUPERHOT, 1, 0.8]
			];
			for (const [color, m, al] of layers) {
				ctx.globalAlpha = a * al;
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(cx, cy, fr * m, 0, TAU);
				ctx.fill();
			}
		}
		if (this.flash > 0 && this.flashKind) {
			const a = this.flash / this.flashMax;
			if (this.flashKind === 'micro') {
				ctx.globalAlpha = a * 0.2;
				ctx.fillStyle = SUPERHOT;
				ctx.beginPath();
				ctx.arc(cx, cy, r * 0.25, 0, TAU);
				ctx.fill();
			} else {
				const plasma = this.flashKind === 'plasma';
				ctx.globalAlpha = a * (plasma ? 0.7 : 0.85);
				ctx.strokeStyle = SUPERHOT;
				ctx.lineWidth = Math.max(0.5, (plasma ? 4 : 3) * a * k);
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, TAU);
				ctx.stroke();
				ctx.globalAlpha = a * (plasma ? 0.25 : 0.35);
				ctx.strokeStyle = plasma ? PLASMA_GHOST : rgba(SOLAR_FLARE, 1);
				ctx.lineWidth = Math.max(0.5, (plasma ? 8 : 6) * a * k);
				ctx.beginPath();
				ctx.arc(cx, cy, r + (plasma ? 12 : 8) * k, 0, TAU);
				ctx.stroke();
			}
		}
		ctx.restore();
	}

	/** Death: convulse, shrink into a dark core with a hot rim, pop, flash. */
	private drawCollapse(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		r0: number,
		k: number,
		S: number,
		layout: GridLayout
	): void {
		const t = this.collapse;
		const shrink = Math.min(1, Math.max(0, (t - 0.3) / 1.5));
		const r =
			t < 0.3 ? r0 * (1 + Math.sin(t * 45 * 4) * 0.1) : Math.max(0, r0 * (1 - shrink * 0.85));
		const alpha = t < 1.8 ? 1 : Math.max(0, 1 - (t - 1.8) / 0.2);
		if (alpha > 0 && r > 0.3) {
			ctx.globalAlpha = alpha;
			ctx.fillStyle = CHROMOSPHERE;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, TAU);
			ctx.fill();
			ctx.globalCompositeOperation = 'lighter';
			if (t < 0.3) {
				const f = 0.5 + 0.5 * Math.sin(t * 45 * 4);
				ctx.strokeStyle = f > 0.7 ? SUPERHOT : rgba(CORONA_INNER, 1);
				ctx.lineWidth = (2 + f * 3.5) * k;
				ctx.globalAlpha = (0.5 + f * 0.5) * alpha;
			} else {
				ctx.strokeStyle = shrink > 0.7 ? SUPERHOT : rgba(SOLAR_FLARE, 1);
				ctx.lineWidth = (1.5 + shrink * 2) * k;
				ctx.globalAlpha = (0.5 + shrink * 0.5) * alpha;
			}
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, TAU);
			ctx.stroke();
			if (t >= 0.3) {
				ctx.strokeStyle = CORONA_OUTER;
				ctx.lineWidth = 1.2 * k;
				ctx.globalAlpha = shrink * alpha * 0.35;
				ctx.beginPath();
				ctx.arc(cx, cy, r * (1.1 + shrink * 2.8), 0, TAU);
				ctx.stroke();
			}
		}
		ctx.globalCompositeOperation = 'lighter';
		if (t >= 1.5 && t < 1.8) {
			const p = (t - 1.5) / 0.3;
			ctx.globalAlpha = (1 - p) * 0.9;
			ctx.fillStyle = SUPERHOT;
			ctx.beginPath();
			ctx.arc(cx, cy, r0 * 0.15 * (1 + p * 4), 0, TAU);
			ctx.fill();
		}
		if (t >= 1.8 && t < 1.95) {
			const a = Math.max(0, 1 - (t - 1.8) / 0.15);
			ctx.globalAlpha = a * 0.55;
			ctx.fillStyle = SUPERHOT;
			ctx.beginPath();
			ctx.arc(cx, cy, r0 * 2.5 * (2 - a), 0, TAU);
			ctx.fill();
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		this.drawSparks(ctx, layout, S);
	}

	private drawBow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
		const size = Math.max(2, radius * 0.42);
		const bowY = y - radius * 0.82;
		ctx.fillStyle = '#ff4d6d';
		ctx.beginPath();
		ctx.moveTo(x, bowY);
		ctx.lineTo(x - size, bowY - size * 0.62);
		ctx.lineTo(x - size * 0.85, bowY + size * 0.5);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x, bowY);
		ctx.lineTo(x + size, bowY - size * 0.62);
		ctx.lineTo(x + size * 0.85, bowY + size * 0.5);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = '#ffd93b';
		ctx.beginPath();
		ctx.arc(x, bowY, Math.max(1, size * 0.22), 0, TAU);
		ctx.fill();
	}
}
