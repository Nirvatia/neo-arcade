import type { PacmanFx } from '../../core/Events';
import type { GhostKind } from '../../logic/actors/GhostModel';
import type { GridLayout } from '../maze/GridView';
import { glowTexture } from '../common/textures';
import { rgba } from '../common/color';

/** The season's look for its effects: the accent colour and its drift particles. */
export interface FxStyle {
	/** 0xRRGGBB: rings, glows, the pop-up outline (the season's energizer glow). */
	readonly accent: number;
	/** The season's own particle (petal, leaf, snowflake, drop), by index. */
	readonly particle: (i: number) => HTMLCanvasElement;
}

const GHOST_TINT: Record<GhostKind, number> = {
	BLINKY: 0xff4d4d,
	PINKY: 0xff9de2,
	INKY: 0x59f0ff,
	CLYDE: 0xffb14d
};
const GOLD = 0xffd84a;
const WHITE = 0xffffff;

interface Ring {
	x: number;
	y: number;
	tint: number;
	/** Final radius in tiles. */
	radius: number;
	age: number;
	life: number;
	delay: number;
}
interface Spark {
	x: number;
	y: number;
	vx: number;
	vy: number;
	tint: number;
	age: number;
	life: number;
	/** A season particle texture, or null for a streak of light. */
	texture: HTMLCanvasElement | null;
	spin: number;
}
interface Popup {
	x: number;
	y: number;
	text: string;
	tint: number;
	age: number;
	life: number;
}
interface Flash {
	x: number;
	y: number;
	age: number;
	life: number;
}
interface Streak {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	tint: number;
	age: number;
	life: number;
}

/**
 * Gameplay feedback on the season levels, one style for every season: score pop-ups, a
 * flash and a burst where a ghost is eaten, a shockwave from an energizer, the season's
 * particles thrown up by a pickup, a whoosh for a near miss, and the screen shake and edge
 * pulse that go with them. Fed by `fx:event`; positions are tile-centre coordinates.
 */
export class LevelFx {
	private rings: Ring[] = [];
	private sparks: Spark[] = [];
	private popups: Popup[] = [];
	private flashes: Flash[] = [];
	private streaks: Streak[] = [];
	private shakeValue = 0;
	private pulseValue = 0;
	private pulseTint = WHITE;
	private seed = 0;

	/** 0..1, eased out by the caller into a camera offset. */
	get shake(): number {
		return this.shakeValue;
	}

	spawn(fx: PacmanFx, style: FxStyle): void {
		switch (fx.kind) {
			case 'ghost-eaten': {
				const tint = GHOST_TINT[fx.ghost];
				this.flashes.push({ x: fx.x, y: fx.y, age: 0, life: 0.18 });
				this.ring(fx.x, fx.y, tint, 1.6, 0.4);
				this.ring(fx.x, fx.y, style.accent, 1.1, 0.35, 0.06);
				this.burst(fx.x, fx.y, tint, 12, 5.5, null);
				this.popup(fx.x, fx.y, String(fx.points), style.accent);
				this.kick(0.55);
				break;
			}
			case 'energizer':
				this.ring(fx.x, fx.y, style.accent, 3.2, 0.5);
				this.ring(fx.x, fx.y, WHITE, 2.2, 0.4, 0.08);
				this.burst(fx.x, fx.y, style.accent, 6, 3, style.particle);
				this.pulse(style.accent, 0.5);
				this.kick(0.3);
				break;
			case 'fruit':
				this.ring(fx.x, fx.y, style.accent, 1.3, 0.35);
				this.burst(fx.x, fx.y, style.accent, 10, 3.5, style.particle);
				this.popup(fx.x, fx.y, String(fx.points), style.accent);
				break;
			case 'egg':
				this.ring(fx.x, fx.y, GOLD, 2.4, 0.5);
				this.burst(fx.x, fx.y, GOLD, 16, 4.5, null);
				this.popup(fx.x, fx.y, String(fx.points), GOLD);
				this.pulse(GOLD, 0.6);
				this.kick(0.35);
				break;
			case 'extra-life':
				this.ring(fx.x, fx.y, GOLD, 1.8, 0.5);
				this.popup(fx.x, fx.y, '1UP', GOLD);
				this.pulse(GOLD, 0.4);
				break;
			case 'near-miss':
				this.streaks.push({
					x0: fx.gx,
					y0: fx.gy,
					x1: fx.x,
					y1: fx.y,
					tint: GHOST_TINT[fx.ghost],
					age: 0,
					life: 0.4
				});
				this.burst(fx.x, fx.y, WHITE, 4, 2.5, null);
				this.kick(0.18);
				break;
		}
	}

	update(dt: number): void {
		if (!(dt > 0)) {
			return;
		}
		const age = <T extends { age: number; life: number; delay?: number }>(list: T[]): T[] =>
			list.filter((item) => {
				item.age += dt;
				return item.age < item.life + (item.delay ?? 0);
			});
		this.rings = age(this.rings);
		this.flashes = age(this.flashes);
		this.popups = age(this.popups);
		this.streaks = age(this.streaks);
		this.sparks = age(this.sparks);
		for (const s of this.sparks) {
			const drag = Math.exp(-dt * 4);
			s.vx *= drag;
			s.vy *= drag;
			s.x += s.vx * dt;
			s.y += s.vy * dt;
		}
		this.shakeValue = Math.max(0, this.shakeValue - dt * 3.5);
		this.pulseValue = Math.max(0, this.pulseValue - dt * 2.2);
	}

	/** Effects that lie on the ground, under the actors: rings and flashes. */
	drawUnder(ctx: CanvasRenderingContext2D, layout: GridLayout): void {
		const S = layout.tileSize;
		const X = (x: number) => layout.offsetX + x * S;
		const Y = (y: number) => layout.offsetY + y * S;
		ctx.save();
		// a dark rim under each ring keeps it readable on the bright seasons too
		for (const r of this.rings) {
			const t = (r.age - r.delay) / r.life;
			if (t < 0) {
				continue;
			}
			const ease = 1 - (1 - t) ** 3;
			const radius = Math.max(0.1, r.radius * S * ease);
			const width = Math.max(1.5, S * 0.22 * (1 - t));
			ctx.beginPath();
			ctx.arc(X(r.x), Y(r.y), radius, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(20,12,6,${0.3 * (1 - t)})`;
			ctx.lineWidth = width + Math.max(1.5, S * 0.06);
			ctx.stroke();
			ctx.strokeStyle = rgba(r.tint, 0.95 * (1 - t));
			ctx.lineWidth = width;
			ctx.stroke();
		}
		ctx.globalCompositeOperation = 'lighter';
		for (const f of this.flashes) {
			const t = f.age / f.life;
			const size = S * (1.2 + t * 0.8);
			ctx.globalAlpha = 1 - t;
			ctx.drawImage(glowTexture(WHITE), X(f.x) - size, Y(f.y) - size, size * 2, size * 2);
		}
		ctx.restore();
	}

	/** Effects over the actors: sparks, particles, streaks and the score pop-ups. */
	drawOver(ctx: CanvasRenderingContext2D, layout: GridLayout): void {
		const S = layout.tileSize;
		const X = (x: number) => layout.offsetX + x * S;
		const Y = (y: number) => layout.offsetY + y * S;
		ctx.save();
		ctx.lineCap = 'round';
		for (const s of this.sparks) {
			const t = s.age / s.life;
			if (s.texture) {
				const size = S * 0.42 * (1 - t * 0.4);
				ctx.save();
				ctx.globalAlpha = 1 - t;
				ctx.translate(X(s.x), Y(s.y));
				ctx.rotate(s.spin * s.age);
				ctx.drawImage(s.texture, -size / 2, -size / 2, size, size);
				ctx.restore();
				continue;
			}
			// a coloured streak with a white core
			ctx.beginPath();
			ctx.moveTo(X(s.x), Y(s.y));
			ctx.lineTo(X(s.x - s.vx * 0.06), Y(s.y - s.vy * 0.06));
			ctx.strokeStyle = rgba(s.tint, 1 - t);
			ctx.lineWidth = Math.max(1.5, S * 0.1 * (1 - t));
			ctx.stroke();
			ctx.strokeStyle = rgba(WHITE, 0.9 * (1 - t));
			ctx.lineWidth = Math.max(0.8, S * 0.04 * (1 - t));
			ctx.stroke();
		}
		for (const k of this.streaks) {
			const t = k.age / k.life;
			ctx.globalCompositeOperation = 'lighter';
			// a whoosh from where the ghost was to Pac-Man, swept forward and fading
			const grad = ctx.createLinearGradient(X(k.x0), Y(k.y0), X(k.x1), Y(k.y1));
			grad.addColorStop(0, rgba(k.tint, 0));
			grad.addColorStop(Math.min(0.99, 0.3 + t * 0.7), rgba(WHITE, 0.8 * (1 - t)));
			grad.addColorStop(1, rgba(WHITE, 0));
			ctx.strokeStyle = grad;
			ctx.lineWidth = Math.max(1, S * 0.12 * (1 - t));
			ctx.beginPath();
			ctx.moveTo(X(k.x0), Y(k.y0));
			ctx.lineTo(X(k.x1), Y(k.y1));
			ctx.stroke();
			ctx.globalCompositeOperation = 'source-over';
		}
		const font = Math.max(10, Math.round(S * 0.62));
		ctx.font = `900 ${font}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.lineJoin = 'round';
		for (const p of this.popups) {
			const t = p.age / p.life;
			// pops in big, settles, rises and fades
			const pop = p.age < 0.12 ? 1.45 - (p.age / 0.12) * 0.45 : 1;
			const rise = (1 - (1 - t) ** 2) * 0.9;
			const alpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.translate(X(p.x), Y(p.y - 0.3 - rise));
			ctx.scale(pop, pop);
			ctx.shadowColor = rgba(p.tint, 0.9);
			ctx.shadowBlur = font * 0.6;
			ctx.lineWidth = Math.max(2, font * 0.18);
			ctx.strokeStyle = 'rgba(20,12,6,.85)';
			ctx.strokeText(p.text, 0, 0);
			ctx.shadowBlur = 0;
			ctx.fillStyle = '#ffffff';
			ctx.fillText(p.text, 0, 0);
			ctx.restore();
		}
		ctx.restore();
	}

	/** The edge pulse in screen space (after the world's vignette). */
	drawScreen(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		if (this.pulseValue <= 0) {
			return;
		}
		const r = Math.hypot(width, height) / 2;
		const g = ctx.createRadialGradient(width / 2, height / 2, r * 0.55, width / 2, height / 2, r);
		g.addColorStop(0, rgba(this.pulseTint, 0));
		g.addColorStop(1, rgba(this.pulseTint, 0.32 * this.pulseValue));
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, width, height);
		ctx.restore();
	}

	reset(): void {
		this.rings = [];
		this.sparks = [];
		this.popups = [];
		this.flashes = [];
		this.streaks = [];
		this.shakeValue = 0;
		this.pulseValue = 0;
	}

	private ring(x: number, y: number, tint: number, radius: number, life: number, delay = 0): void {
		this.rings.push({ x, y, tint, radius, life, delay, age: 0 });
	}

	private burst(
		x: number,
		y: number,
		tint: number,
		count: number,
		speed: number,
		particle: ((i: number) => HTMLCanvasElement) | null
	): void {
		for (let i = 0; i < count; i += 1) {
			this.seed += 1;
			const a = (i / count) * Math.PI * 2 + this.noise() * 0.6;
			const v = speed * (0.6 + this.noise() * 0.6);
			this.sparks.push({
				x,
				y,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				tint,
				age: 0,
				life: particle ? 0.9 : 0.45,
				texture: particle ? particle(this.seed) : null,
				spin: (this.noise() - 0.5) * 8
			});
		}
	}

	private popup(x: number, y: number, text: string, tint: number): void {
		this.popups.push({ x, y, text, tint, age: 0, life: 1.1 });
	}

	private pulse(tint: number, strength: number): void {
		this.pulseTint = tint;
		this.pulseValue = Math.max(this.pulseValue, strength);
	}

	private kick(amount: number): void {
		this.shakeValue = Math.min(1, Math.max(this.shakeValue, amount));
	}

	private noise(): number {
		const v = Math.sin(this.seed * 12.9898 + this.sparks.length * 78.233) * 43758.5453;
		return v - Math.floor(v);
	}
}
