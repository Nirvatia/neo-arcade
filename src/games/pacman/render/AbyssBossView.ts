import type { DoomDirection } from '../logic/doom/DoomGraph';
import type { DoomShape, DoomStateName } from '../logic/doom/DoomBossModel';
import type { GridLayout } from './GridView';

/** Everything the view needs about one abyss body (the boss or its echo). */
export interface AbyssBossSnapshot {
	/** Tile-center coordinates. */
	readonly x: number;
	readonly y: number;
	readonly phase: number;
	readonly state: DoomStateName;
	readonly shape: DoomShape;
	readonly dir: DoomDirection;
	/** Telegraph progress 0..1. */
	readonly progress: number;
	readonly scale: number;
	readonly alpha: number;
	readonly chaos: number;
	/** 0..1 while the boss materialises at the start of the fight. */
	readonly intro: number;
	/** The phase-3 decoy: same silhouette, subtly colder and without the inner vortex. */
	readonly echo: boolean;
}

interface Vertex {
	phase: number;
	freq: number;
	bias: number;
}

interface Mote {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
}

interface Point {
	x: number;
	y: number;
}

const VERTEX_COUNT = [7, 9, 12] as const;
const SHARD_COUNT = [0, 5, 8] as const;
const MAX_MOTES = 90;
const TAU = Math.PI * 2;

function dirAngle(dir: DoomDirection): number {
	if (dir === 'UP') {
		return -Math.PI / 2;
	}
	if (dir === 'DOWN') {
		return Math.PI / 2;
	}
	if (dir === 'LEFT') {
		return Math.PI;
	}
	return 0;
}

function hash(a: number, b: number): number {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
}

/**
 * The abyss boss: an unstable polygon around a void. Every instance rolls its own vertex
 * noise, so no two fights look the same; instability grows with the phase (cracked rim,
 * orbiting shards, glitch slices, chromatic ghosts, leaking void motes).
 */
export class AbyssBossView {
	private readonly vertices: Vertex[][] = [];
	private readonly shardSeeds: number[] = [];
	private readonly motes: Mote[] = [];
	private readonly seed = Math.random() * 1000;
	private lastTime = -1;
	private moteBudget = 0;
	private buffer: HTMLCanvasElement | null = null;

	constructor() {
		for (let phase = 0; phase < VERTEX_COUNT.length; phase += 1) {
			const ring: Vertex[] = [];
			for (let i = 0; i < VERTEX_COUNT[phase]; i += 1) {
				ring.push({
					phase: Math.random() * TAU,
					freq: 0.6 + Math.random() * 1.6,
					bias: (Math.random() - 0.5) * 0.18
				});
			}
			this.vertices.push(ring);
		}
		for (let i = 0; i < 8; i += 1) {
			this.shardSeeds.push(Math.random());
		}
	}

	draw(
		ctx: CanvasRenderingContext2D,
		snap: AbyssBossSnapshot,
		layout: GridLayout,
		time: number
	): void {
		const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
		this.lastTime = time;
		const S = layout.tileSize;
		const cx = layout.offsetX + snap.x * S;
		const cy = layout.offsetY + snap.y * S;
		const phase = Math.min(3, Math.max(1, Math.floor(snap.phase)));
		const intro = Math.min(1, Math.max(0, snap.intro));
		const R = S * 0.6 * snap.scale * (0.35 + 0.65 * intro);
		const instability = this.instability(snap, phase);

		this.updateMotes(dt, snap, phase, S);
		if (snap.alpha <= 0.01) {
			this.drawMotes(ctx, layout);
			return;
		}

		ctx.save();
		ctx.globalAlpha = snap.alpha * (0.25 + 0.75 * intro);

		// darken the floor around the body so it reads against the dark maze
		const pull = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 2.7);
		pull.addColorStop(0, 'rgba(0,0,0,0.6)');
		pull.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = pull;
		ctx.fillRect(cx - R * 2.7, cy - R * 2.7, R * 5.4, R * 5.4);

		// crimson halo, brighter while winding up an attack
		const telegraph = snap.state === 'TELEGRAPH' ? snap.progress : 0;
		const pulse = 0.5 + 0.5 * Math.sin(time * (3 + telegraph * 14));
		ctx.globalCompositeOperation = 'lighter';
		const halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 2.1);
		const haloAlpha = (0.22 + 0.18 * pulse + 0.35 * telegraph) * (snap.echo ? 0.6 : 1);
		halo.addColorStop(
			0,
			snap.echo ? `rgba(120,60,255,${haloAlpha})` : `rgba(255,40,24,${haloAlpha})`
		);
		halo.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = halo;
		ctx.fillRect(cx - R * 2.1, cy - R * 2.1, R * 4.2, R * 4.2);
		ctx.globalCompositeOperation = 'source-over';

		const jitter = phase >= 3 || snap.state === 'TRANSITION' ? R * 0.05 * instability : 0;
		const bx = cx + (jitter ? (Math.random() - 0.5) * jitter : 0);
		const by = cy + (jitter ? (Math.random() - 0.5) * jitter : 0);
		const points = this.outline(snap, phase, R, instability, time);

		if (phase >= 3 || snap.state === 'TRANSITION') {
			this.drawGhosts(ctx, points, bx, by, R, time, instability);
		}
		this.drawShards(ctx, snap, phase, bx, by, R, time, instability);

		const glitchChance =
			snap.state === 'TRANSITION' ? 0.8 : phase === 3 ? 0.32 : phase === 2 ? 0.1 : 0;
		const bucket = Math.floor(time * 12);
		if (glitchChance > 0 && hash(bucket, this.seed) < glitchChance) {
			this.drawGlitched(ctx, snap, points, bx, by, R, time, phase, instability, bucket);
		} else {
			this.drawBody(ctx, snap, points, bx, by, R, time, phase, instability);
		}
		ctx.restore();
		this.drawMotes(ctx, layout);
	}

	private instability(snap: AbyssBossSnapshot, phase: number): number {
		let value = [0.12, 0.42, 0.78][phase - 1] + snap.chaos * 0.15;
		if (snap.state === 'TRANSITION') {
			value += 0.6;
		} else if (snap.state === 'STUNNED') {
			value += 0.35;
		} else if (snap.state === 'TELEGRAPH') {
			value += 0.25 * snap.progress;
		}
		return Math.min(1.3, value);
	}

	private outline(
		snap: AbyssBossSnapshot,
		phase: number,
		R: number,
		instability: number,
		time: number
	): Point[] {
		const ring = this.vertices[phase - 1];
		const n = ring.length;
		const speed = 0.8 + instability * 2.2;
		const amp = 0.05 + instability * 0.2;
		const spin = time * (0.15 + 0.1 * phase) * (snap.echo ? -1 : 1);
		const facing = dirAngle(snap.dir);
		const points: Point[] = [];
		for (let i = 0; i < n; i += 1) {
			const v = ring[i];
			const angle = (i / n) * TAU + spin;
			const noise =
				Math.sin(time * v.freq * speed + v.phase) * 0.6 +
				Math.sin(time * v.freq * speed * 2.3 + v.phase * 1.7) * 0.4;
			let r = R * (1 + v.bias + noise * amp);
			const p = snap.progress;
			if (snap.shape === 'wedge') {
				const d = Math.cos(angle - facing);
				r *= d > 0.55 ? 1 + 0.7 * p * d : 1 - 0.18 * p;
			} else if (snap.shape === 'cross') {
				const spike = Math.pow(Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))), 6);
				r *= 1 + 0.65 * p * spike;
			} else if (snap.shape === 'shrink') {
				r *= 1 - 0.55 * p;
			} else if (snap.shape === 'lobes') {
				r *= 1 + 0.32 * p * Math.cos(angle * 3 + time * 2);
			} else if (snap.shape === 'stunned') {
				r *= 0.82 + 0.1 * Math.sin(time * 31 + i * 2.1);
			}
			points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
		}
		if (snap.shape === 'wedge' && snap.progress > 0) {
			// a sharp spearhead in the dash direction
			const tip = R * (1.25 + 0.75 * snap.progress);
			let best = 0;
			let bestDot = -2;
			for (let i = 0; i < n; i += 1) {
				const dot = Math.cos(Math.atan2(points[i].y, points[i].x) - facing);
				if (dot > bestDot) {
					bestDot = dot;
					best = i;
				}
			}
			points.splice(best + 1, 0, { x: Math.cos(facing) * tip, y: Math.sin(facing) * tip });
		}
		return points;
	}

	private path(
		ctx: CanvasRenderingContext2D,
		points: readonly Point[],
		ox: number,
		oy: number,
		k = 1
	): void {
		ctx.beginPath();
		for (let i = 0; i < points.length; i += 1) {
			const x = ox + points[i].x * k;
			const y = oy + points[i].y * k;
			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		}
		ctx.closePath();
	}

	private drawBody(
		ctx: CanvasRenderingContext2D,
		snap: AbyssBossSnapshot,
		points: readonly Point[],
		x: number,
		y: number,
		R: number,
		time: number,
		phase: number,
		instability: number
	): void {
		// body: crimson shell fading into black
		const shell = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * 1.15);
		shell.addColorStop(0, '#000000');
		shell.addColorStop(0.55, snap.echo ? '#07031a' : '#12020a');
		shell.addColorStop(1, snap.echo ? '#241050' : '#4a0814');
		ctx.fillStyle = shell;
		this.path(ctx, points, x, y);
		ctx.fill();

		// the void: a counter-rotating inner polygon of pure black with a vortex
		const inner: Point[] = points.map((p, i) => {
			const a = -time * 0.35 + (i / points.length) * 0.4;
			const c = Math.cos(a);
			const s = Math.sin(a);
			return { x: (p.x * c - p.y * s) * 0.6, y: (p.x * s + p.y * c) * 0.6 };
		});
		ctx.fillStyle = '#000000';
		this.path(ctx, inner, x, y);
		ctx.fill();
		if (!snap.echo) {
			ctx.save();
			this.path(ctx, inner, x, y);
			ctx.clip();
			ctx.globalCompositeOperation = 'lighter';
			ctx.lineWidth = Math.max(0.6, R * 0.035);
			for (let arm = 0; arm < 3; arm += 1) {
				ctx.strokeStyle = `rgba(255,60,90,${0.18 + 0.1 * instability})`;
				ctx.beginPath();
				for (let i = 0; i <= 18; i += 1) {
					const u = i / 18;
					const a = -time * (1.4 + instability) + arm * (TAU / 3) + u * 4.2;
					const r = R * 0.55 * (1 - u);
					const px = x + Math.cos(a) * r;
					const py = y + Math.sin(a) * r;
					if (i === 0) {
						ctx.moveTo(px, py);
					} else {
						ctx.lineTo(px, py);
					}
				}
				ctx.stroke();
			}
			ctx.restore();
		}
		ctx.strokeStyle = snap.echo ? 'rgba(90,60,200,0.5)' : 'rgba(120,0,60,0.55)';
		ctx.lineWidth = Math.max(0.6, R * 0.04);
		this.path(ctx, inner, x, y);
		ctx.stroke();

		this.drawRim(ctx, snap, points, x, y, R, time, phase, instability);
	}

	/** Hot rim; from phase 2 on it is cracked and the cracks wander. */
	private drawRim(
		ctx: CanvasRenderingContext2D,
		snap: AbyssBossSnapshot,
		points: readonly Point[],
		x: number,
		y: number,
		R: number,
		time: number,
		phase: number,
		instability: number
	): void {
		const n = points.length;
		const breakChance = phase === 1 ? 0 : phase === 2 ? 0.22 : 0.4;
		const bucket = Math.floor(time * (4 + phase * 3));
		const telegraph = snap.state === 'TELEGRAPH' ? snap.progress : 0;
		const stunned = snap.state === 'STUNNED';
		const flash = stunned || snap.state === 'TRANSITION' ? 0.5 + 0.5 * Math.sin(time * 40) : 0;
		const core = snap.echo ? '#9a7aff' : flash > 0.5 ? '#ffffff' : '#ff6a3a';
		const glow = snap.echo
			? 'rgba(110,80,255,0.45)'
			: `rgba(255,${50 + telegraph * 120},30,${0.45 + 0.4 * telegraph})`;
		const passes: Array<[string, number, GlobalCompositeOperation]> = [
			[glow, R * (0.24 + 0.12 * telegraph), 'lighter'],
			[core, R * 0.075, 'source-over'],
			['rgba(255,230,210,0.85)', R * 0.025, 'source-over']
		];
		ctx.lineJoin = 'miter';
		ctx.lineCap = 'round';
		for (const [color, width, op] of passes) {
			ctx.globalCompositeOperation = op;
			ctx.strokeStyle = color;
			ctx.lineWidth = Math.max(0.5, width);
			ctx.beginPath();
			for (let i = 0; i < n; i += 1) {
				if (
					breakChance > 0 &&
					hash(i * 7 + bucket, this.seed) < breakChance * (0.6 + instability * 0.4)
				) {
					continue;
				}
				const a = points[i];
				const b = points[(i + 1) % n];
				ctx.moveTo(x + a.x, y + a.y);
				ctx.lineTo(x + b.x, y + b.y);
			}
			ctx.stroke();
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	/** Phase 2+: the body breaks up in horizontal slices that slide sideways. */
	private drawGlitched(
		ctx: CanvasRenderingContext2D,
		snap: AbyssBossSnapshot,
		points: readonly Point[],
		x: number,
		y: number,
		R: number,
		time: number,
		phase: number,
		instability: number,
		bucket: number
	): void {
		const k = Math.max(1, ctx.getTransform().a);
		const half = R * 2.2;
		const size = Math.ceil(half * 2 * k);
		if (!this.buffer || this.buffer.width < size) {
			this.buffer = document.createElement('canvas');
			this.buffer.width = size;
			this.buffer.height = size;
		}
		const g = this.buffer.getContext('2d');
		if (!g) {
			this.drawBody(ctx, snap, points, x, y, R, time, phase, instability);
			return;
		}
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, this.buffer.width, this.buffer.height);
		g.setTransform(k, 0, 0, k, 0, 0);
		this.drawBody(g, snap, points, half, half, R, time, phase, instability);
		const slices = 5 + phase * 2;
		const sliceH = (half * 2) / slices;
		for (let i = 0; i < slices; i += 1) {
			const shift = (hash(i, bucket + this.seed) - 0.5) * R * 0.5 * instability;
			ctx.drawImage(
				this.buffer,
				0,
				i * sliceH * k,
				half * 2 * k,
				sliceH * k,
				x - half + shift,
				y - half + i * sliceH,
				half * 2,
				sliceH
			);
		}
	}

	/** Phase 3: chromatic ghosts of the silhouette lag behind and around the body. */
	private drawGhosts(
		ctx: CanvasRenderingContext2D,
		points: readonly Point[],
		x: number,
		y: number,
		R: number,
		time: number,
		instability: number
	): void {
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineWidth = Math.max(0.6, R * 0.06);
		const offsets: Array<[number, string]> = [
			[1, 'rgba(255,40,70,0.38)'],
			[-1, 'rgba(60,200,255,0.28)']
		];
		for (const [sign, color] of offsets) {
			const dx = sign * R * (0.12 + 0.1 * Math.sin(time * 7.3 + sign)) * instability;
			const dy = sign * R * 0.05 * Math.sin(time * 5.1);
			ctx.strokeStyle = color;
			this.path(ctx, points, x + dx, y + dy, 1.06);
			ctx.stroke();
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawShards(
		ctx: CanvasRenderingContext2D,
		snap: AbyssBossSnapshot,
		phase: number,
		x: number,
		y: number,
		R: number,
		time: number,
		instability: number
	): void {
		const count = SHARD_COUNT[phase - 1];
		for (let i = 0; i < count; i += 1) {
			const s = this.shardSeeds[i];
			const orbit = R * (1.4 + 0.25 * Math.sin(time * (1 + s) + i) + (phase === 3 ? 0.2 * s : 0));
			const a = time * (0.6 + s * 0.9) * (i % 2 ? 1 : -1) + (i / count) * TAU;
			const px = x + Math.cos(a) * orbit;
			const py = y + Math.sin(a) * orbit * 0.92;
			const size = R * (0.13 + 0.08 * s);
			const rot = time * (2 + s * 3) + i;
			ctx.save();
			ctx.translate(px, py);
			ctx.rotate(rot);
			ctx.beginPath();
			ctx.moveTo(size, 0);
			ctx.lineTo(-size * 0.6, size * 0.55);
			ctx.lineTo(-size * 0.35, -size * 0.7);
			ctx.closePath();
			ctx.fillStyle = snap.echo ? '#0a0820' : '#120408';
			ctx.fill();
			ctx.strokeStyle = snap.echo
				? 'rgba(140,110,255,0.8)'
				: `rgba(255,${80 + 60 * instability},50,0.85)`;
			ctx.lineWidth = Math.max(0.5, R * 0.03);
			ctx.stroke();
			ctx.restore();
		}
	}

	private updateMotes(dt: number, snap: AbyssBossSnapshot, phase: number, S: number): void {
		const rate = snap.alpha < 0.05 ? 0 : phase === 1 ? 3 : phase === 2 ? 14 : 30;
		this.moteBudget += rate * dt;
		const R = 0.6 * snap.scale;
		while (this.moteBudget >= 1 && this.motes.length < MAX_MOTES) {
			this.moteBudget -= 1;
			const a = Math.random() * TAU;
			const speed = 0.4 + Math.random() * 0.9;
			this.motes.push({
				x: snap.x + Math.cos(a) * R,
				y: snap.y + Math.sin(a) * R,
				vx: Math.cos(a) * speed,
				vy: Math.sin(a) * speed - 0.25,
				life: 0,
				max: 0.6 + Math.random() * 0.9,
				size: (0.03 + Math.random() * 0.05) * (S > 0 ? 1 : 0)
			});
		}
		if (this.moteBudget > 1) {
			this.moteBudget = 1;
		}
		for (let i = this.motes.length - 1; i >= 0; i -= 1) {
			const m = this.motes[i];
			m.life += dt;
			if (m.life >= m.max) {
				this.motes.splice(i, 1);
				continue;
			}
			m.x += m.vx * dt;
			m.y += m.vy * dt;
			m.vx *= 0.96;
			m.vy *= 0.96;
		}
	}

	private drawMotes(ctx: CanvasRenderingContext2D, layout: GridLayout): void {
		if (this.motes.length === 0) {
			return;
		}
		const S = layout.tileSize;
		ctx.save();
		for (const m of this.motes) {
			const k = 1 - m.life / m.max;
			const px = layout.offsetX + m.x * S;
			const py = layout.offsetY + m.y * S;
			const r = Math.max(0.6, m.size * S * (0.5 + k));
			ctx.globalAlpha = k * 0.9;
			ctx.fillStyle = '#050003';
			ctx.beginPath();
			ctx.arc(px, py, r, 0, TAU);
			ctx.fill();
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = k * 0.35;
			ctx.fillStyle = '#ff3a2a';
			ctx.beginPath();
			ctx.arc(px, py, r * 1.8, 0, TAU);
			ctx.fill();
			ctx.globalCompositeOperation = 'source-over';
		}
		ctx.restore();
	}
}
