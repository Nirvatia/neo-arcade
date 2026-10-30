import type { PlayerService } from '../../logic/actors/PlayerService';
import type { PacmanAudioCue } from '../../core/Events';
import type { GridLayout } from '../maze/GridView';
import { rgba } from '../common/color';

export type PlayerLook = 'normal' | 'energized' | 'berserk';

/** Per-frame state decided by the game. */
export interface PlayerDrawOptions {
	/** energized: power pellet / overdrive; berserk: the hell level's berserk pickup. */
	readonly look: PlayerLook;
	/** BFG charge 0..1: the body swells and the throat glows white. */
	readonly charge: number;
	/** The death sequence is running. */
	readonly dying: boolean;
}

interface Palette {
	skin0: number;
	skin1: number;
	skin2: number;
	rim: number;
	mouth0: number;
	mouth1: number;
	tongue: number;
	glow: number;
	trail: number;
	trail2: number;
}

const LOOKS: Record<PlayerLook, Palette> = {
	normal: {
		skin0: 0xfff0a0,
		skin1: 0xffcc2a,
		skin2: 0xe8901a,
		rim: 0x8a3a06,
		mouth0: 0x6a1a0e,
		mouth1: 0x220604,
		tongue: 0xff6a6a,
		glow: 0xffc040,
		trail: 0xffd060,
		trail2: 0xff8a20
	},
	energized: {
		skin0: 0xffffff,
		skin1: 0xfff4c0,
		skin2: 0xffd060,
		rim: 0x40e0ff,
		mouth0: 0x1a3a6a,
		mouth1: 0x06101e,
		tongue: 0x9ae8ff,
		glow: 0x60e8ff,
		trail: 0xc8f8ff,
		trail2: 0x40c8ff
	},
	berserk: {
		skin0: 0xff7a5a,
		skin1: 0xc8201a,
		skin2: 0x5a0808,
		rim: 0x1a0202,
		mouth0: 0xb0200a,
		mouth1: 0x3a0200,
		tongue: 0xff2a2a,
		glow: 0xff2a10,
		trail: 0xff5a2a,
		trail2: 0x6a1008
	}
};

const TAU = Math.PI * 2;
/** Trail length in tiles at full speed; it starts this far behind the body. */
const TRAIL_LENGTH = 1.7;
const TRAIL_GAP = 0.1;
const MORPH_TIME = 0.6;

function mixHex(a: number, b: number, t: number): number {
	const ch = (shift: number): number => {
		const x = (a >> shift) & 255;
		const y = (b >> shift) & 255;
		return Math.round(x + (y - x) * t);
	};
	return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

function ease(t: number): number {
	return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

function lerpAngle(a: number, b: number, t: number): number {
	let d = b - a;
	while (d > Math.PI) d -= TAU;
	while (d < -Math.PI) d += TAU;
	return a + d * t;
}

function facingAngle(facing: string | null, fallback: number): number {
	if (facing === 'UP') return -Math.PI / 2;
	if (facing === 'DOWN') return Math.PI / 2;
	if (facing === 'LEFT') return Math.PI;
	if (facing === 'RIGHT') return 0;
	return fallback;
}

function glow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	color: number,
	a: number
): void {
	if (a <= 0 || r <= 0) {
		return;
	}
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, rgba(color, a));
	g.addColorStop(1, rgba(color, 0));
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * The living Pac-Man: a soft body that stretches on the run, squashes on turns and bites,
 * breathes when idle and swells when it swallows; a comet-like ribbon follows the path a
 * little behind it. Looks: normal, energized (lit from inside like a deep-sea jelly) and
 * berserk (blood, muscle, veins, fangs, steam). Used on every level.
 */
export class PlayerView {
	private time = 0;
	private lastTime = -1;
	private angle = 0;
	private chomp = 0;
	private turnKick = 0;
	private squash = 0;
	private gulp = 0;
	private flash = 0;
	private flashColor = 0xffffff;
	private from: PlayerLook = 'normal';
	private look: PlayerLook = 'normal';
	private morph = 1;
	private speed = 0;
	private dyingTime = -1;
	private last: { x: number; y: number } | null = null;
	private history: Array<{ x: number; y: number; t: number }> = [];
	private motes: Array<{
		x: number;
		y: number;
		vx: number;
		vy: number;
		life: number;
		max: number;
		s: number;
	}> = [];
	private teleported = false;

	trigger(cue: PacmanAudioCue): void {
		if (cue === 'dot') {
			this.gulp = Math.max(this.gulp, 0.7);
		} else if (cue === 'energizer' || cue === 'fruit-collect' || cue === 'egg-collect') {
			this.gulp = 1;
			this.squash = 0.3;
			this.setFlash(0xffffff);
		} else if (cue === 'ghost-eaten') {
			this.gulp = 1;
			this.setFlash(LOOKS[this.look].glow);
		} else if (cue === 'teleport') {
			this.teleported = true;
		}
	}

	/** BFG release: the body recoils and flashes. */
	fireBurst(): void {
		this.squash = 0.45;
		this.setFlash(0xffffff);
	}

	reset(): void {
		this.history = [];
		this.motes = [];
		this.last = null;
		this.dyingTime = -1;
		this.flash = 0;
		this.gulp = 0;
		this.squash = 0;
	}

	draw(
		ctx: CanvasRenderingContext2D,
		player: PlayerService,
		layout: GridLayout,
		time: number,
		options: PlayerDrawOptions = { look: 'normal', charge: 0, dying: false }
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
		const L = this.palette();
		ctx.save();
		if (this.dyingTime >= 0) {
			this.drawDeath(ctx, cx, cy, S, L);
			ctx.restore();
			return;
		}
		this.drawTrail(ctx, layout, L);
		this.drawBody(ctx, cx, cy, S, L, options.charge, player.isInvulnerable);
		ctx.restore();
	}

	private setFlash(color: number): void {
		this.flash = 1;
		this.flashColor = color;
	}

	private update(dt: number, player: PlayerService, options: PlayerDrawOptions): void {
		const pos = player.position;
		if (options.dying) {
			if (this.dyingTime < 0) {
				this.dyingTime = 0;
				this.history = [];
			}
			this.dyingTime += dt;
			return;
		}
		if (this.dyingTime >= 0) {
			this.reset();
		}
		if (options.look !== this.look) {
			this.from = this.look;
			this.look = options.look;
			this.morph = 0;
			this.squash = 0.35;
			this.setFlash(LOOKS[options.look].glow);
		}
		this.morph = Math.min(1, this.morph + dt / MORPH_TIME);
		this.flash = Math.max(0, this.flash - dt * 2.5);
		this.squash = Math.max(0, this.squash - dt * 2);
		this.gulp = Math.max(0, this.gulp - dt * 5);
		this.turnKick = Math.max(0, this.turnKick - dt * 4);

		const moved = this.last ? Math.hypot(pos.x - this.last.x, pos.y - this.last.y) : 0;
		if (this.teleported || moved > 1.5) {
			this.history = [];
			this.teleported = false;
		} else if (dt > 0) {
			// smoothed speed in tiles per second drives the stretch and the trail length
			this.speed += (moved / dt - this.speed) * Math.min(1, dt * 10);
		}
		this.last = { x: pos.x, y: pos.y };

		const target = facingAngle(player.facing, this.angle);
		let turn = target - this.angle;
		while (turn > Math.PI) turn -= TAU;
		while (turn < -Math.PI) turn += TAU;
		if (Math.abs(turn) > 1 && this.turnKick <= 0) {
			this.turnKick = 1;
		}
		this.angle = lerpAngle(this.angle, target, Math.min(1, dt * 45));

		const running = this.speed > 0.5;
		this.chomp += dt * (running ? 11 : 2.5);
		const head = this.history[0];
		if (!head || Math.hypot(head.x - pos.x, head.y - pos.y) > 0.05) {
			this.history.unshift({ x: pos.x, y: pos.y, t: this.time });
		}
		this.history = this.history.filter((h) => this.time - h.t < 0.6).slice(0, 48);
		if (running && Math.random() < dt * 30) {
			const a = this.angle + Math.PI + (Math.random() - 0.5) * 1.2;
			this.motes.push({
				x: pos.x + Math.cos(a) * 0.38,
				y: pos.y + Math.sin(a) * 0.38,
				vx: Math.cos(a) * 0.4,
				vy: Math.sin(a) * 0.4 - 0.1,
				life: 0.6,
				max: 0.6,
				s: 0.03 + Math.random() * 0.04
			});
		}
		for (const m of this.motes) {
			m.x += m.vx * dt;
			m.y += m.vy * dt;
			m.vx *= Math.pow(0.94, dt * 60);
			m.vy *= Math.pow(0.94, dt * 60);
			m.life -= dt;
		}
		this.motes = this.motes.filter((m) => m.life > 0);
	}

	private palette(): Palette {
		const a = LOOKS[this.from];
		const b = LOOKS[this.look];
		const t = ease(this.morph);
		const out = {} as Palette;
		for (const key of Object.keys(a) as Array<keyof Palette>) {
			out[key] = mixHex(a[key], b[key], t);
		}
		return out;
	}

	private weight(look: PlayerLook): number {
		const t = ease(this.morph);
		return (this.from === look ? 1 - t : 0) + (this.look === look ? t : 0);
	}

	/** Comet ribbon along the real path, so it bends neatly round corners. */
	private drawTrail(ctx: CanvasRenderingContext2D, layout: GridLayout, L: Palette): void {
		const S = layout.tileSize;
		const full = Math.min(1, this.speed / 6);
		const maxLen = TRAIL_LENGTH * full * (this.look === 'berserk' ? 1.15 : 1);
		const pts: Array<[number, number, number]> = [];
		let acc = 0;
		let prev = this.last;
		if (!prev || maxLen < 0.2) {
			return;
		}
		pts.push([layout.offsetX + prev.x * S, layout.offsetY + prev.y * S, 0]);
		for (const h of this.history) {
			const seg = Math.hypot(h.x - prev.x, h.y - prev.y);
			if (seg < 1e-4) {
				continue;
			}
			if (acc + seg > maxLen) {
				const f = (maxLen - acc) / seg;
				const x = prev.x + (h.x - prev.x) * f;
				const y = prev.y + (h.y - prev.y) * f;
				pts.push([layout.offsetX + x * S, layout.offsetY + y * S, maxLen]);
				acc = maxLen;
				break;
			}
			acc += seg;
			pts.push([layout.offsetX + h.x * S, layout.offsetY + h.y * S, acc]);
			prev = h;
		}
		const r = S * 0.42;
		const start = 0.42 + TRAIL_GAP;
		if (acc <= start) {
			return;
		}
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		// the outer veil is painted normally so it shows on bright floors too; the inner
		// thread is added as light
		const layers: Array<[number, number, number, GlobalCompositeOperation]> = [
			[L.trail2, 1.05, 0.45, 'source-over'],
			[L.trail, 0.45, 0.85, 'lighter']
		];
		for (const [color, wMul, aMul, op] of layers) {
			ctx.globalCompositeOperation = op;
			for (let i = 1; i < pts.length; i += 1) {
				const d0 = pts[i - 1][2];
				const d1 = pts[i][2];
				if (d1 < start) {
					continue;
				}
				const k = Math.pow(1 - (d1 - start) / Math.max(0.01, acc - start), 0.8);
				if (k <= 0) {
					continue;
				}
				const f = d0 < start ? (start - d0) / (d1 - d0) : 0;
				const x0 = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f;
				const y0 = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f;
				ctx.strokeStyle = rgba(color, aMul * k * full);
				ctx.lineWidth = Math.max(0.6, r * wMul * k);
				ctx.beginPath();
				ctx.moveTo(x0, y0);
				ctx.lineTo(pts[i][0], pts[i][1]);
				ctx.stroke();
			}
		}
		for (const m of this.motes) {
			const k = m.life / m.max;
			glow(
				ctx,
				layout.offsetX + m.x * S,
				layout.offsetY + m.y * S,
				S * m.s * 1.2,
				L.trail,
				k * 0.5
			);
		}
		ctx.restore();
	}

	/** Soft wedge with rounded mouth corners (unit circle scaled to rx, ry). */
	private bodyPath(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		rx: number,
		ry: number,
		angle: number,
		mouth: number
	): void {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(angle);
		ctx.scale(rx, ry);
		const c = 0.13;
		ctx.beginPath();
		ctx.moveTo(Math.cos(mouth) * c * 1.4, Math.sin(mouth) * c * 0.2);
		ctx.lineTo(Math.cos(mouth) * 0.93, Math.sin(mouth) * 0.93);
		ctx.quadraticCurveTo(
			Math.cos(mouth),
			Math.sin(mouth),
			Math.cos(mouth + 0.08),
			Math.sin(mouth + 0.08)
		);
		ctx.arc(0, 0, 1, mouth + 0.08, TAU - mouth - 0.08);
		ctx.quadraticCurveTo(
			Math.cos(-mouth),
			Math.sin(-mouth),
			Math.cos(-mouth) * 0.93,
			Math.sin(-mouth) * 0.93
		);
		ctx.lineTo(Math.cos(-mouth) * c * 1.4, -Math.sin(mouth) * c * 0.2);
		ctx.quadraticCurveTo(-c, 0, Math.cos(mouth) * c * 1.4, Math.sin(mouth) * c * 0.2);
		ctx.closePath();
		ctx.restore();
	}

	private drawBody(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		S: number,
		L: Palette,
		charge: number,
		invulnerable: boolean
	): void {
		const t = this.time;
		const r = S * 0.42;
		const wE = this.weight('energized');
		const wB = this.weight('berserk');
		const running = this.speed > 0.5;
		const open = Math.pow(Math.abs(Math.sin(this.chomp)), 0.8);
		const mouth = Math.min(1.05, 0.08 + open * (0.62 + wB * 0.08) + charge * 0.35);
		const breathe = Math.sin(t * (2.2 + wB * 2.5)) * (0.015 + wB * 0.03);
		const run = running ? 0.05 : 0;
		const squash = this.turnKick * 0.12 + this.squash * 0.2;
		const swell = this.gulp * 0.06 + wB * 0.06 + charge * 0.08 * (1 + 0.3 * Math.sin(t * 40));
		const rx = r * (1 + run - squash + swell + breathe - (1 - open) * 0.02);
		const ry = r * (1 - run * 0.6 + squash * 0.8 + swell + breathe + (1 - open) * 0.03);
		const a = this.angle;
		const blink = invulnerable && Math.floor(t * 12) % 2 === 0;
		ctx.globalAlpha = blink ? 0.5 : 1;

		const shadow = ctx.createRadialGradient(cx, cy + r * 0.3, r * 0.3, cx, cy + r * 0.3, r * 1.15);
		shadow.addColorStop(0, 'rgba(0,0,0,.5)');
		shadow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = shadow;
		ctx.fillRect(cx - r * 1.2, cy - r * 0.9, r * 2.4, r * 2.4);
		ctx.globalCompositeOperation = 'lighter';
		glow(ctx, cx, cy, r * 1.25, L.glow, 0.12 + wE * 0.3 + wB * 0.2 + charge * 0.3);
		ctx.globalCompositeOperation = 'source-over';

		// skin with subsurface warmth
		this.bodyPath(ctx, cx, cy, rx, ry, a, mouth);
		const skin = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.38, r * 0.05, cx, cy, r * 1.05);
		skin.addColorStop(0, rgba(L.skin0, 1));
		skin.addColorStop(0.5, rgba(L.skin1, 1));
		skin.addColorStop(1, rgba(L.skin2, 1));
		ctx.fillStyle = skin;
		ctx.fill();

		ctx.save();
		this.bodyPath(ctx, cx, cy, rx, ry, a, mouth);
		ctx.clip();
		if (wE > 0.01) {
			// lit from inside: a soft heart of light and drifting sparks
			ctx.globalCompositeOperation = 'lighter';
			glow(
				ctx,
				cx - Math.cos(a) * r * 0.15,
				cy - Math.sin(a) * r * 0.15,
				r * 0.75,
				0xffffff,
				0.55 * wE
			);
			for (let i = 0; i < 6; i += 1) {
				const ang = i * 1.7 + t * 0.8;
				const d = r * (0.35 + 0.3 * Math.sin(t * 1.3 + i));
				glow(
					ctx,
					cx + Math.cos(ang) * d,
					cy + Math.sin(ang) * d,
					r * 0.12,
					0x60e8ff,
					(0.5 + 0.5 * Math.sin(t * 5 + i)) * wE
				);
			}
			ctx.globalCompositeOperation = 'source-over';
		}
		if (wB > 0.01) {
			// muscle bands and swelling veins
			ctx.globalAlpha = wB * (blink ? 0.5 : 1);
			ctx.strokeStyle = 'rgba(40,0,0,.55)';
			ctx.lineWidth = Math.max(1, r * 0.07);
			for (const off of [0.45, 0.72]) {
				ctx.beginPath();
				ctx.ellipse(cx, cy, rx * off, ry * off, a, Math.PI * 0.55, Math.PI * 1.45);
				ctx.stroke();
			}
			ctx.strokeStyle = 'rgba(255,120,100,.25)';
			ctx.lineWidth = Math.max(1, r * 0.03);
			for (const off of [0.42, 0.69]) {
				ctx.beginPath();
				ctx.ellipse(
					cx - r * 0.03,
					cy - r * 0.03,
					rx * off,
					ry * off,
					a,
					Math.PI * 0.6,
					Math.PI * 1.2
				);
				ctx.stroke();
			}
			const pump = 0.6 + 0.4 * Math.sin(t * 7);
			ctx.strokeStyle = `rgba(110,0,10,${0.8 * pump})`;
			ctx.lineWidth = Math.max(1, r * 0.05);
			ctx.lineCap = 'round';
			const veins: Array<[number, number, number]> = [
				[2.3, 0.6, 0.3],
				[3.5, 0.55, -0.25],
				[4.1, 0.5, 0.2]
			];
			for (const [b0, len, wob] of veins) {
				ctx.beginPath();
				for (let i = 0; i <= 6; i += 1) {
					const u = i / 6;
					const ang = a + b0 + Math.sin(u * 5 + b0) * wob * 0.3;
					const d = r * (0.95 - u * len);
					const px = cx + Math.cos(ang) * d;
					const py = cy + Math.sin(ang) * d;
					if (i === 0) {
						ctx.moveTo(px, py);
					} else {
						ctx.lineTo(px, py);
					}
				}
				ctx.stroke();
			}
			ctx.globalAlpha = blink ? 0.5 : 1;
		}
		ctx.restore();

		// throat and tongue, deep in the wedge
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(a);
		ctx.beginPath();
		ctx.moveTo(-r * 0.06, 0);
		ctx.arc(-r * 0.06, 0, rx * 0.9, -mouth * 0.92, mouth * 0.92);
		ctx.closePath();
		const throat = ctx.createRadialGradient(-r * 0.06, 0, 0, -r * 0.06, 0, rx * 0.9);
		throat.addColorStop(0, rgba(charge > 0 ? 0xffffff : L.mouth1, 1));
		throat.addColorStop(
			charge > 0 ? 0.3 + 0.5 * (1 - charge) : 0,
			rgba(charge > 0 ? 0xfff0c0 : L.mouth1, 1)
		);
		throat.addColorStop(1, rgba(L.mouth0, 1));
		ctx.fillStyle = throat;
		ctx.fill();
		if (open > 0.25 && charge <= 0) {
			ctx.fillStyle = rgba(L.tongue, Math.min(1, (open - 0.25) * 2));
			ctx.beginPath();
			ctx.ellipse(r * 0.18, 0, r * 0.2 * open, r * 0.11 * open, 0, 0, TAU);
			ctx.fill();
		}
		if (wB > 0.01) {
			// fangs on both jaws, pointing into the mouth
			for (const side of [1, -1]) {
				for (const u of [0.55, 0.82]) {
					const ex = Math.cos(mouth) * rx * u;
					const ey = side * Math.sin(mouth) * rx * u;
					const len = r * 0.2 * wB;
					ctx.fillStyle = '#fff4e6';
					ctx.beginPath();
					ctx.moveTo(ex - r * 0.06, ey);
					ctx.lineTo(ex + r * 0.06, ey);
					ctx.lineTo(ex + r * 0.01, ey - side * len);
					ctx.closePath();
					ctx.fill();
				}
			}
		}
		ctx.restore();

		// soft gloss: reads as skin, not metal
		ctx.save();
		this.bodyPath(ctx, cx, cy, rx, ry, a, mouth);
		ctx.clip();
		const hl = ctx.createRadialGradient(
			cx - r * 0.38,
			cy - r * 0.45,
			0,
			cx - r * 0.38,
			cy - r * 0.45,
			r * 0.45
		);
		hl.addColorStop(0, `rgba(255,255,255,${0.55 - wB * 0.3})`);
		hl.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = hl;
		ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
		ctx.restore();

		this.bodyPath(ctx, cx, cy, rx, ry, a, mouth);
		ctx.lineWidth = Math.max(1, r * 0.05);
		ctx.strokeStyle = rgba(L.rim, 0.75 + wE * 0.25);
		if (wE > 0.5) {
			ctx.globalCompositeOperation = 'lighter';
		}
		ctx.stroke();
		ctx.globalCompositeOperation = 'source-over';

		if (wB > 0.01) {
			// steam off the top
			for (let k = 0; k < 4; k += 1) {
				const u = (t * 1.2 + k / 4) % 1;
				const px = cx + Math.sin(k * 2.1 + t) * r * 0.3;
				const py = cy - r * (0.7 + u * 0.55);
				ctx.fillStyle = `rgba(200,180,170,${0.25 * (1 - u) * wB})`;
				ctx.beginPath();
				ctx.arc(px, py, r * (0.1 + u * 0.18), 0, TAU);
				ctx.fill();
			}
		}
		if (charge > 0) {
			// plasma drawn into the mouth from the front
			ctx.globalCompositeOperation = 'lighter';
			for (let k = 0; k < 8; k += 1) {
				const u = (t * 2.2 + k / 8) % 1;
				const ang = a + (k - 3.5) * 0.18;
				const d = r * 1.25 * (1 - u);
				glow(
					ctx,
					cx + Math.cos(ang) * d,
					cy + Math.sin(ang) * d,
					r * 0.14,
					0xffffff,
					0.8 * u * charge
				);
			}
			ctx.globalCompositeOperation = 'source-over';
		}
		if (this.flash > 0) {
			ctx.globalCompositeOperation = 'lighter';
			glow(ctx, cx, cy, r * (0.9 + (1 - this.flash) * 0.35), this.flashColor, 0.8 * this.flash);
			ctx.globalCompositeOperation = 'source-over';
		}
		ctx.globalAlpha = 1;
	}

	/** Classic death, made alive: a shiver, then the mouth opens until nothing is left, a pop. */
	private drawDeath(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		S: number,
		L: Palette
	): void {
		const t = this.dyingTime;
		const r = S * 0.42;
		if (t < 0.35) {
			const jitter = Math.sin(t * 90) * r * 0.04;
			const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.38, r * 0.05, cx, cy, r);
			g.addColorStop(0, rgba(L.skin0, 1));
			g.addColorStop(1, rgba(L.skin2, 1));
			this.bodyPath(ctx, cx + jitter, cy, r * (1 + 0.06 * Math.sin(t * 60)), r, -Math.PI / 2, 0.15);
			ctx.fillStyle = g;
			ctx.fill();
			ctx.strokeStyle = rgba(L.rim, 0.9);
			ctx.lineWidth = Math.max(1, r * 0.06);
			ctx.stroke();
			return;
		}
		const u = Math.min(1, (t - 0.35) / 1.1);
		if (u < 1) {
			// slow start, then the body folds away like the arcade death
			const mouth = 0.15 + Math.pow(u, 1.6) * (Math.PI - 0.15);
			const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.38, r * 0.05, cx, cy, r);
			g.addColorStop(0, rgba(L.skin0, 1));
			g.addColorStop(1, rgba(L.skin2, 1));
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.arc(cx, cy, r * (1 - u * 0.15), -Math.PI / 2 + mouth, -Math.PI / 2 + TAU - mouth);
			ctx.closePath();
			ctx.fill();
			// dark rim: the death wave whitens the screen behind it
			ctx.strokeStyle = rgba(L.rim, 0.9);
			ctx.lineWidth = Math.max(1, r * 0.06);
			ctx.stroke();
			return;
		}
		const p = Math.min(1, (t - 1.45) / 0.35);
		if (p < 1) {
			ctx.globalCompositeOperation = 'lighter';
			for (let i = 0; i < 8; i += 1) {
				const ang = (i / 8) * TAU;
				const d = r * (0.2 + p * 0.9);
				glow(
					ctx,
					cx + Math.cos(ang) * d,
					cy + Math.sin(ang) * d,
					r * 0.18 * (1 - p),
					L.glow,
					1 - p
				);
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	}
}
