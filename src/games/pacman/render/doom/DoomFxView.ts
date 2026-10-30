import type {
	DoomFxEvent,
	DoomBfgShot,
	DoomBfgTracer,
	DoomBarrel
} from '../../logic/doom/DoomWeaponService';
import type { GridLayout } from '../maze/GridView';
import { glowTexture } from './DoomSprites';
import { rgba } from '../common/color';

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	tint: number;
	drag: number;
	kind: 'spark' | 'smoke' | 'debris';
	active: boolean;
}

interface Ring {
	x: number;
	y: number;
	life: number;
	max: number;
	radius: number;
	tint: number;
	width: number;
}

interface Flash {
	x: number;
	y: number;
	life: number;
	max: number;
	radius: number;
	tint: number;
}

interface Decal {
	x: number;
	y: number;
	life: number;
	max: number;
	radius: number;
	seed: number;
}

interface Slash {
	x: number;
	y: number;
	life: number;
	max: number;
	angle: number;
}

const POOL = 420;
const TAU = Math.PI * 2;
const PLASMA_CORE = 0xffffff;
const PLASMA_HOT = 0xffee88;
const PLASMA = 0xff8800;
const BFG_HALO = 0x40ff50;

const PICKUP_TINT: Record<string, number> = {
	bfg: 0x40ff50,
	barrel: 0xb8ff30,
	medkit: 0xff3a2a,
	berserk: 0xff7a1a
};

/**
 * Weapon and impact effects of the hell level, in tile coordinates: the plasma orb fired by
 * Pac-Man and its lightning, barrel blasts with shockwave, debris, smoke and scorch marks,
 * berserk bites, pickups and hits.
 */
export class DoomFxView {
	private readonly particles: Particle[] = [];
	private readonly rings: Ring[] = [];
	private readonly flashes: Flash[] = [];
	private readonly decals: Decal[] = [];
	private readonly slashes: Slash[] = [];
	private shakeValue = 0;
	private hurtValue = 0;
	private lastTime = -1;
	private time = 0;

	constructor() {
		for (let i = 0; i < POOL; i += 1) {
			this.particles.push({
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				life: 0,
				max: 1,
				size: 1,
				tint: 0,
				drag: 0.9,
				kind: 'spark',
				active: false
			});
		}
	}

	/** Extra camera shake from blasts, 0..1. */
	get shake(): number {
		return this.shakeValue;
	}

	/** Red screen-edge pulse after the player is hit, 0..1. */
	get hurt(): number {
		return this.hurtValue;
	}

	reset(): void {
		for (const p of this.particles) {
			p.active = false;
		}
		this.rings.length = 0;
		this.flashes.length = 0;
		this.decals.length = 0;
		this.slashes.length = 0;
		this.shakeValue = 0;
		this.hurtValue = 0;
	}

	spawn(event: DoomFxEvent): void {
		const { x, y } = event;
		switch (event.kind) {
			case 'bfg-fire': {
				const dx = event.dx ?? 1;
				const dy = event.dy ?? 0;
				const mx = x + dx * 0.45;
				const my = y + dy * 0.45;
				this.flash(mx, my, 1.3, PLASMA_HOT, 0.25);
				this.cone(mx, my, Math.atan2(dy, dx), 0.8, 22, 4, 11, PLASMA_HOT);
				this.shakeValue = Math.max(this.shakeValue, 0.25);
				break;
			}
			case 'bfg-impact':
				this.flash(x, y, 2.6, PLASMA_CORE, 0.35);
				this.flash(x, y, 1.8, BFG_HALO, 0.5);
				this.ring(x, y, 3.2, PLASMA_HOT, 0.45, 0.22);
				this.ring(x, y, 2.0, PLASMA, 0.7, 0.35);
				this.radial(x, y, 46, 3, 12, PLASMA_HOT, 'spark', 0.3, 0.9);
				this.decal(x, y, 0.75);
				this.shakeValue = Math.max(this.shakeValue, 0.45);
				break;
			case 'barrel-blast':
				this.flash(x, y, 2.4, 0xffd27a, 0.3);
				this.flash(x, y, 1.6, 0xff5a1a, 0.6);
				this.ring(x, y, 2.9, 0xfff0d0, 0.4, 0.3);
				this.radial(x, y, 26, 4, 10, 0x3a2418, 'debris', 0.5, 1.1);
				this.radial(x, y, 30, 2, 8, 0xffa040, 'spark', 0.3, 0.8);
				this.radial(x, y, 9, 0.4, 1.4, 0x2a2420, 'smoke', 1.2, 2.2);
				this.decal(x, y, 1.1);
				this.shakeValue = Math.max(this.shakeValue, 0.6);
				break;
			case 'barrel-fizzle':
				this.radial(x, y, 5, 0.3, 1, 0x3a3532, 'smoke', 0.8, 1.4);
				this.radial(x, y, 8, 1, 3, 0xffa040, 'spark', 0.2, 0.5);
				break;
			case 'barrel-place':
				this.ring(x, y, 0.8, 0xc8b090, 0.3, 0.12);
				this.radial(x, y, 6, 0.6, 1.6, 0x5a4a3a, 'smoke', 0.4, 0.7);
				break;
			case 'bite':
				this.flash(x, y, 1.4, 0xffffff, 0.2);
				for (let i = 0; i < 3; i += 1) {
					this.slashes.push({
						x,
						y,
						life: 0.32,
						max: 0.32,
						angle: -0.9 + i * 0.6 + (Math.random() - 0.5) * 0.3
					});
				}
				this.radial(x, y, 20, 3, 9, 0xff3a2a, 'spark', 0.25, 0.6);
				this.shakeValue = Math.max(this.shakeValue, 0.35);
				break;
			case 'pickup': {
				const tint = PICKUP_TINT[event.detail ?? ''] ?? 0xffffff;
				this.ring(x, y, 1.3, tint, 0.45, 0.1);
				this.flash(x, y, 1.0, tint, 0.3);
				for (let i = 0; i < 16; i += 1) {
					this.emit(
						x + (Math.random() - 0.5) * 0.6,
						y + (Math.random() - 0.5) * 0.3,
						(Math.random() - 0.5) * 0.6,
						-1.5 - Math.random() * 2,
						0.5 + Math.random() * 0.4,
						0.06 + Math.random() * 0.05,
						tint,
						0.96,
						'spark'
					);
				}
				break;
			}
			case 'boss-hit':
				this.flash(x, y, 1.6, 0xffffff, 0.18);
				this.radial(x, y, 18, 2, 7, 0xc060ff, 'spark', 0.3, 0.7);
				break;
			case 'player-hit':
				this.ring(x, y, 1.2, 0xff2a1a, 0.35, 0.12);
				this.radial(x, y, 14, 2, 6, 0xff4a2a, 'spark', 0.2, 0.5);
				this.hurtValue = 1;
				this.shakeValue = Math.max(this.shakeValue, 0.4);
				break;
		}
	}

	update(dt: number, shots: readonly DoomBfgShot[], barrels: readonly DoomBarrel[]): void {
		this.time += dt;
		for (const p of this.particles) {
			if (!p.active) {
				continue;
			}
			p.life -= dt;
			if (p.life <= 0) {
				p.active = false;
				continue;
			}
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			const drag = Math.pow(p.drag, dt * 60);
			p.vx *= drag;
			p.vy *= drag;
		}
		for (const list of [this.rings, this.flashes, this.decals, this.slashes] as Array<
			Array<{ life: number }>
		>) {
			for (let i = list.length - 1; i >= 0; i -= 1) {
				list[i].life -= dt;
				if (list[i].life <= 0) {
					list.splice(i, 1);
				}
			}
		}
		this.shakeValue = Math.max(0, this.shakeValue - dt * 2.5);
		this.hurtValue = Math.max(0, this.hurtValue - dt * 2.2);
		// plasma sheds sparks along its path
		for (const shot of shots) {
			const speed = Math.hypot(shot.vx, shot.vy) || 1;
			for (let i = 0; i < 2; i += 1) {
				const a = Math.random() * TAU;
				this.emit(
					shot.x,
					shot.y,
					(-shot.vx / speed) * 1.5 + Math.cos(a) * 1.2,
					(-shot.vy / speed) * 1.5 + Math.sin(a) * 1.2,
					0.25 + Math.random() * 0.25,
					0.05 + Math.random() * 0.06,
					i ? PLASMA_HOT : PLASMA,
					0.9,
					'spark'
				);
			}
		}
		// burning fuses
		for (const barrel of barrels) {
			if (Math.random() < 0.6) {
				const fx = barrel.x + 0.5;
				const fy = barrel.y + 0.15;
				this.emit(
					fx,
					fy,
					(Math.random() - 0.5) * 1.2,
					-0.6 - Math.random() * 1.4,
					0.2 + Math.random() * 0.25,
					0.04 + Math.random() * 0.04,
					Math.random() < 0.5 ? 0xffd27a : 0xff6a1a,
					0.92,
					'spark'
				);
			}
		}
	}

	/** Scorch marks on the floor, drawn under everything else. */
	drawGround(ctx: CanvasRenderingContext2D, layout: GridLayout): void {
		const S = layout.tileSize;
		ctx.save();
		for (const d of this.decals) {
			const a = Math.min(1, d.life / 1.5) * 0.7;
			const cx = layout.offsetX + d.x * S;
			const cy = layout.offsetY + d.y * S;
			const r = d.radius * S;
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
			g.addColorStop(0, `rgba(8,4,2,${a})`);
			g.addColorStop(0.6, `rgba(20,8,4,${a * 0.6})`);
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			for (let i = 0; i <= 12; i += 1) {
				const ang = (i / 12) * TAU;
				const rr = r * (0.75 + 0.25 * Math.sin(d.seed + i * 2.3));
				const px = cx + Math.cos(ang) * rr;
				const py = cy + Math.sin(ang) * rr;
				if (i === 0) {
					ctx.moveTo(px, py);
				} else {
					ctx.lineTo(px, py);
				}
			}
			ctx.fill();
		}
		ctx.restore();
	}

	/** Projectiles, lightning and every burst, drawn over the actors. */
	draw(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		shots: readonly DoomBfgShot[],
		tracers: readonly DoomBfgTracer[]
	): void {
		const S = layout.tileSize;
		const X = (x: number) => layout.offsetX + x * S;
		const Y = (y: number) => layout.offsetY + y * S;
		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.globalCompositeOperation = 'lighter';

		for (const tracer of tracers) {
			this.drawLightning(ctx, X(tracer.x), Y(tracer.y), tracer, S);
		}

		for (const shot of shots) {
			const speed = Math.hypot(shot.vx, shot.vy) || 1;
			const ux = shot.vx / speed;
			const uy = shot.vy / speed;
			const x = X(shot.x);
			const y = Y(shot.y);
			const tail = 1.6 * S;
			const grad = ctx.createLinearGradient(x, y, x - ux * tail, y - uy * tail);
			grad.addColorStop(0, rgba(PLASMA_HOT, 0.9));
			grad.addColorStop(0.4, rgba(PLASMA, 0.45));
			grad.addColorStop(1, rgba(PLASMA, 0));
			ctx.strokeStyle = grad;
			ctx.lineWidth = S * 0.42;
			ctx.globalAlpha = 1;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x - ux * tail, y - uy * tail);
			ctx.stroke();
			const wobble = 1 + 0.12 * Math.sin(this.time * 40 + shot.x * 3);
			const halo = S * 1.9 * wobble;
			ctx.drawImage(glowTexture(BFG_HALO), x - halo / 2, y - halo / 2, halo, halo);
			const corona = S * 1.1 * wobble;
			ctx.drawImage(glowTexture(PLASMA), x - corona / 2, y - corona / 2, corona, corona);
			ctx.fillStyle = rgba(PLASMA_HOT, 1);
			ctx.beginPath();
			ctx.arc(x, y, S * 0.24 * wobble, 0, TAU);
			ctx.fill();
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.arc(x, y, S * 0.13, 0, TAU);
			ctx.fill();
		}

		for (const f of this.flashes) {
			const k = f.life / f.max;
			const r = f.radius * S * (1.1 - 0.3 * k);
			ctx.globalAlpha = k;
			ctx.drawImage(glowTexture(f.tint), X(f.x) - r, Y(f.y) - r, r * 2, r * 2);
		}

		for (const ring of this.rings) {
			const k = ring.life / ring.max;
			const r = ring.radius * S * Math.sqrt(1 - k);
			ctx.globalAlpha = k;
			ctx.strokeStyle = rgba(ring.tint, 1);
			ctx.lineWidth = Math.max(1, ring.width * S * k);
			ctx.beginPath();
			ctx.arc(X(ring.x), Y(ring.y), Math.max(0.5, r), 0, TAU);
			ctx.stroke();
		}

		for (const slash of this.slashes) {
			const k = slash.life / slash.max;
			const r = S * (0.7 + 0.3 * (1 - k));
			ctx.globalAlpha = k;
			for (const [color, width] of [
				[rgba(0xff2a1a, 0.8), 0.22],
				[rgba(0xffffff, 1), 0.07]
			] as const) {
				ctx.strokeStyle = color;
				ctx.lineWidth = S * width * k;
				ctx.beginPath();
				ctx.arc(X(slash.x), Y(slash.y), r, slash.angle, slash.angle + 1.6);
				ctx.stroke();
			}
		}

		for (const p of this.particles) {
			if (!p.active) {
				continue;
			}
			const k = p.life / p.max;
			const x = X(p.x);
			const y = Y(p.y);
			if (p.kind === 'smoke') {
				ctx.globalCompositeOperation = 'source-over';
				const r = p.size * S * (1.6 - k);
				ctx.globalAlpha = k * 0.45;
				ctx.fillStyle = rgba(p.tint, 1);
				ctx.beginPath();
				ctx.arc(x, y, r, 0, TAU);
				ctx.fill();
				ctx.globalCompositeOperation = 'lighter';
			} else if (p.kind === 'debris') {
				ctx.globalCompositeOperation = 'source-over';
				ctx.globalAlpha = Math.min(1, k * 1.5);
				ctx.fillStyle = rgba(p.tint, 1);
				const s = p.size * S;
				ctx.fillRect(x - s / 2, y - s / 2, s, s * 0.7);
				ctx.fillStyle = rgba(0xff8a3a, k * 0.8);
				ctx.fillRect(x - s / 4, y - s / 4, s / 2, s / 3);
				ctx.globalCompositeOperation = 'lighter';
			} else {
				const r = Math.max(0.4, p.size * S * (0.4 + 0.6 * k));
				ctx.globalAlpha = k;
				ctx.drawImage(glowTexture(p.tint), x - r * 2, y - r * 2, r * 4, r * 4);
				ctx.fillStyle = 'rgba(255,255,240,0.9)';
				ctx.beginPath();
				ctx.arc(x, y, r * 0.45, 0, TAU);
				ctx.fill();
			}
		}
		ctx.restore();
	}

	/** Red pulse around the screen edges after taking damage. */
	drawHurt(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		if (this.hurtValue <= 0) {
			return;
		}
		ctx.save();
		const g = ctx.createRadialGradient(
			width / 2,
			height / 2,
			Math.min(width, height) * 0.35,
			width / 2,
			height / 2,
			Math.max(width, height) * 0.75
		);
		g.addColorStop(0, 'rgba(255,0,0,0)');
		g.addColorStop(1, `rgba(200,0,0,${0.45 * this.hurtValue})`);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, width, height);
		ctx.restore();
	}

	/** Plasma lightning along a BFG tracer: re-jagged every frame, white core. */
	private drawLightning(
		ctx: CanvasRenderingContext2D,
		x0: number,
		y0: number,
		tracer: DoomBfgTracer,
		S: number
	): void {
		const k = Math.min(1, tracer.timer / 0.1);
		const len = tracer.length * S;
		const steps = Math.max(3, Math.ceil(tracer.length * 2));
		const nx = -tracer.dy;
		const ny = tracer.dx;
		const points: Array<[number, number]> = [];
		for (let i = 0; i <= steps; i += 1) {
			const u = i / steps;
			const j = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * S * 0.5;
			points.push([x0 + tracer.dx * len * u + nx * j, y0 + tracer.dy * len * u + ny * j]);
		}
		for (const [color, width] of [
			[rgba(PLASMA, 0.45 * k), 0.5],
			[rgba(PLASMA_HOT, 0.8 * k), 0.18],
			[rgba(0xffffff, k), 0.06]
		] as const) {
			ctx.globalAlpha = 1;
			ctx.strokeStyle = color;
			ctx.lineWidth = Math.max(1, S * width);
			ctx.beginPath();
			points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
			ctx.stroke();
		}
	}

	private emit(
		x: number,
		y: number,
		vx: number,
		vy: number,
		life: number,
		size: number,
		tint: number,
		drag: number,
		kind: Particle['kind']
	): void {
		for (const p of this.particles) {
			if (!p.active) {
				p.x = x;
				p.y = y;
				p.vx = vx;
				p.vy = vy;
				p.life = life;
				p.max = life;
				p.size = size;
				p.tint = tint;
				p.drag = drag;
				p.kind = kind;
				p.active = true;
				return;
			}
		}
	}

	/** Radial burst; speeds in tiles per second, sizes in tiles. */
	private radial(
		x: number,
		y: number,
		n: number,
		vmin: number,
		vmax: number,
		tint: number,
		kind: Particle['kind'],
		lmin: number,
		lmax: number
	): void {
		for (let i = 0; i < n; i += 1) {
			const a = Math.random() * TAU;
			const v = vmin + Math.random() * (vmax - vmin);
			const size =
				kind === 'smoke'
					? 0.25 + Math.random() * 0.25
					: kind === 'debris'
						? 0.06 + Math.random() * 0.08
						: 0.05 + Math.random() * 0.07;
			this.emit(
				x,
				y,
				Math.cos(a) * v,
				Math.sin(a) * v,
				lmin + Math.random() * (lmax - lmin),
				size,
				tint,
				kind === 'smoke' ? 0.95 : 0.9,
				kind
			);
		}
	}

	private cone(
		x: number,
		y: number,
		angle: number,
		spread: number,
		n: number,
		vmin: number,
		vmax: number,
		tint: number
	): void {
		for (let i = 0; i < n; i += 1) {
			const a = angle + (Math.random() - 0.5) * spread;
			const v = vmin + Math.random() * (vmax - vmin);
			this.emit(
				x,
				y,
				Math.cos(a) * v,
				Math.sin(a) * v,
				0.2 + Math.random() * 0.3,
				0.05 + Math.random() * 0.06,
				tint,
				0.88,
				'spark'
			);
		}
	}

	private flash(x: number, y: number, radius: number, tint: number, life: number): void {
		this.flashes.push({ x, y, radius, tint, life, max: life });
	}

	private ring(
		x: number,
		y: number,
		radius: number,
		tint: number,
		life: number,
		width: number
	): void {
		this.rings.push({ x, y, radius, tint, life, max: life, width });
	}

	private decal(x: number, y: number, radius: number): void {
		this.decals.push({ x, y, radius, life: 8, max: 8, seed: Math.random() * 100 });
	}
}
