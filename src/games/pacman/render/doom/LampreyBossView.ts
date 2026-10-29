import type { DoomDirection } from '../../logic/doom/DoomGraph';
import type { DoomShape, DoomStateName } from '../../logic/doom/DoomBossModel';
import type { GridLayout } from '../maze/GridView';

/** Everything the view needs about one body (the boss or its phase-3 echo). */
export interface BossSnapshot {
	/** Tile-center coordinates. */
	readonly x: number;
	readonly y: number;
	readonly phase: number;
	readonly state: DoomStateName;
	readonly shape: DoomShape;
	readonly dir: DoomDirection;
	/** Telegraph progress 0..1. */
	readonly progress: number;
	readonly alpha: number;
	/** 0..1 while the boss materialises at the start of the fight. */
	readonly intro: number;
	/** Angle toward the player: the eyes track it. */
	readonly look: number;
	/** 0..1 white flash after taking a hit. */
	readonly hit: number;
	/** The phase-3 decoy: same body, cold violet and translucent. */
	readonly echo: boolean;
}

const TAU = Math.PI * 2;
const MAX_EYES = 8;

function dirAngle(dir: DoomDirection): number {
	if (dir === 'UP') return -Math.PI / 2;
	if (dir === 'DOWN') return Math.PI / 2;
	if (dir === 'LEFT') return Math.PI;
	return 0;
}

function glow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	rgb: string,
	a: number
): void {
	if (a <= 0 || r <= 0) {
		return;
	}
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${Math.min(1, a)})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * The lamprey: a fleshy disk with a round maw, hooked tentacles and eyes.
 * Phase 1: armoured in bone plates, maw shut, four tentacles, eyes asleep.
 * Phase 2: plates fall away, eyes open and track the player, the maw opens on rings of
 *          rotating teeth, six tentacles, veins pulse.
 * Phase 3: raw flesh, fire in the throat, eyes everywhere and blinking out of sync, eight
 *          tentacles thrashing.
 * Wind-up: tentacles coil, the maw dilates, eyes snap open. Dash: tentacles stream back.
 */
export class LampreyBossView {
	private readonly blinkSeeds: number[] = [];
	private readonly tentacleSeeds: number[] = [];

	constructor() {
		for (let i = 0; i < MAX_EYES; i += 1) {
			this.blinkSeeds.push(Math.random() * 5);
		}
		for (let i = 0; i < 8; i += 1) {
			this.tentacleSeeds.push(Math.random() * 10);
		}
	}

	draw(ctx: CanvasRenderingContext2D, snap: BossSnapshot, layout: GridLayout, time: number): void {
		if (snap.alpha <= 0.01) {
			return;
		}
		const S = layout.tileSize;
		const phase = Math.min(3, Math.max(1, Math.floor(snap.phase)));
		const intro = Math.min(1, Math.max(0, snap.intro));
		const R = S * 0.5 * (0.3 + 0.7 * intro);
		let x = layout.offsetX + snap.x * S;
		let y = layout.offsetY + snap.y * S;
		const tele = snap.state === 'TELEGRAPH' ? snap.progress : 0;
		const stunned = snap.state === 'STUNNED';
		const transition = snap.state === 'TRANSITION';
		const rush = snap.state === 'ACTIVE' && snap.shape === 'wedge' ? 1 : 0;
		const shiver = (transition ? 0.06 : 0) + (stunned ? 0.03 : 0) + tele * 0.025;
		if (shiver > 0) {
			x += (Math.random() - 0.5) * R * shiver;
			y += (Math.random() - 0.5) * R * shiver;
		}
		const facing = dirAngle(snap.dir);
		const raw = phase >= 3;
		const t = time * (stunned ? 0.35 : 1);

		ctx.save();
		ctx.globalAlpha = snap.alpha * (snap.echo ? 0.75 : 1) * (0.3 + 0.7 * intro);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';

		// darkened floor and a blood halo so it reads on the dark maze
		const pull = ctx.createRadialGradient(x, y, R * 0.3, x, y, R * 1.6);
		pull.addColorStop(0, 'rgba(0,0,0,0.55)');
		pull.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = pull;
		ctx.fillRect(x - R * 1.6, y - R * 1.6, R * 3.2, R * 3.2);
		ctx.globalCompositeOperation = 'lighter';
		glow(
			ctx,
			x,
			y,
			R * 1.1,
			snap.echo ? '150,90,255' : '255,26,10',
			0.18 + 0.1 * phase + tele * 0.25
		);
		ctx.globalCompositeOperation = 'source-over';

		const breathe = 1 + Math.sin(t * (1.8 + phase * 0.7)) * 0.035;
		const body = R * 0.62 * breathe * (1 + tele * 0.05 * Math.sin(time * 30));

		// tentacles under the body: they coil during the wind-up, stream back on a dash
		const count = [4, 6, 8][phase - 1];
		for (let i = 0; i < count; i += 1) {
			const a = facing + Math.PI / count + (i / count) * TAU + Math.sin(t * 0.7 + i) * 0.1;
			const back = rush ? Math.sin(facing + Math.PI - a) * 0.9 : 0;
			this.tentacle(
				ctx,
				x + Math.cos(a) * body * 0.8,
				y + Math.sin(a) * body * 0.8,
				a + back,
				R * (0.4 + (phase === 3 ? 0.04 : 0)),
				R * 0.075,
				t * (1 + phase * 0.25) * (stunned ? 0.3 : 1),
				this.tentacleSeeds[i],
				tele * 0.6,
				raw,
				snap.echo
			);
		}

		// the fleshy disk
		const pts: Array<[number, number]> = [];
		for (let i = 0; i < 26; i += 1) {
			const a = (i / 26) * TAU;
			const d = body * (1 + 0.07 * Math.sin(a * 4 + t * 1.3) + 0.04 * Math.sin(a * 7 - t * 2));
			pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
		}
		const outline = (): void => {
			ctx.beginPath();
			pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
			ctx.closePath();
		};
		outline();
		const flesh = ctx.createRadialGradient(
			x - body * 0.3,
			y - body * 0.35,
			body * 0.05,
			x,
			y,
			body * 1.05
		);
		if (snap.echo) {
			flesh.addColorStop(0, '#b8a0ff');
			flesh.addColorStop(0.5, '#4a2a8a');
			flesh.addColorStop(1, '#120a2a');
		} else {
			flesh.addColorStop(0, raw ? '#ff7a6a' : '#a8504a');
			flesh.addColorStop(0.5, raw ? '#b0141a' : '#5a1a1a');
			flesh.addColorStop(1, raw ? '#3a0206' : '#1e0606');
		}
		ctx.fillStyle = flesh;
		ctx.fill();
		ctx.strokeStyle = 'rgba(0,0,0,.65)';
		ctx.lineWidth = Math.max(1, R * 0.03);
		ctx.stroke();

		ctx.save();
		outline();
		ctx.clip();
		if (phase >= 2) {
			const pump = 0.5 + 0.5 * Math.sin(t * (4 + phase * 2));
			ctx.strokeStyle = raw
				? `rgba(255,90,40,${0.5 + 0.4 * pump})`
				: `rgba(60,0,10,${0.5 + 0.4 * pump})`;
			ctx.lineWidth = Math.max(1, R * 0.025);
			for (let i = 0; i < 7; i += 1) {
				const a = i * 0.9 + 0.4;
				ctx.beginPath();
				ctx.moveTo(x + Math.cos(a) * body * 0.3, y + Math.sin(a) * body * 0.3);
				ctx.quadraticCurveTo(
					x + Math.cos(a + 0.35) * body * 0.7,
					y + Math.sin(a + 0.35) * body * 0.7,
					x + Math.cos(a + 0.1) * body,
					y + Math.sin(a + 0.1) * body
				);
				ctx.stroke();
			}
		}
		// bone plates: whole in phase 1, two left in phase 2, gone in phase 3
		const plates = phase === 1 ? [0, 1, 2, 3, 4] : phase === 2 ? [1, 3] : [];
		for (const i of plates) {
			const a0 = facing + 0.6 + (i / 5) * TAU;
			const a1 = a0 + TAU / 5 - 0.12;
			const mid = (a0 + a1) / 2;
			const bone = ctx.createLinearGradient(
				x,
				y,
				x + Math.cos(mid) * body,
				y + Math.sin(mid) * body
			);
			bone.addColorStop(0, '#6a6058');
			bone.addColorStop(0.5, '#d8ccb8');
			bone.addColorStop(1, '#8a7a68');
			ctx.fillStyle = bone;
			ctx.beginPath();
			ctx.moveTo(x + Math.cos(a0) * body * 0.42, y + Math.sin(a0) * body * 0.42);
			ctx.arc(x, y, body * 1.02, a0, a1);
			ctx.lineTo(x + Math.cos(a1) * body * 0.42, y + Math.sin(a1) * body * 0.42);
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = 'rgba(40,20,10,.7)';
			ctx.lineWidth = Math.max(1, R * 0.02);
			ctx.stroke();
			if (phase === 2) {
				ctx.strokeStyle = 'rgba(60,10,0,.9)';
				ctx.beginPath();
				ctx.moveTo(x + Math.cos(a0 + 0.3) * body * 0.5, y + Math.sin(a0 + 0.3) * body * 0.5);
				ctx.lineTo(x + Math.cos(a0 + 0.5) * body * 0.8, y + Math.sin(a0 + 0.5) * body * 0.8);
				ctx.stroke();
			}
		}
		if (snap.hit > 0) {
			ctx.fillStyle = `rgba(255,255,255,${0.75 * snap.hit})`;
			ctx.fillRect(x - body * 1.2, y - body * 1.2, body * 2.4, body * 2.4);
		}
		ctx.restore();

		// eyes: asleep in phase 1 unless it winds up, then opening, tracking and blinking
		const eyes = phase === 1 ? 2 : phase === 2 ? 4 : 7;
		for (let i = 0; i < eyes; i += 1) {
			const spread =
				phase === 1 ? (i ? 0.55 : -0.55) : (i - (eyes - 1) / 2) * (phase === 3 ? 0.55 : 0.6);
			const a = facing + spread + (phase === 3 && i % 2 ? Math.PI : 0);
			const ex = x + Math.cos(a) * body * 0.7;
			const ey = y + Math.sin(a) * body * 0.7;
			const cycle = (time + this.blinkSeeds[i]) % 4.5;
			let open = phase === 1 ? (tele > 0.2 ? 0.7 : 0) : cycle < 0.12 ? 0 : 1;
			if (stunned || transition) {
				open = 0;
			}
			this.eye(
				ctx,
				ex,
				ey,
				R * (phase === 3 ? 0.06 : 0.075),
				snap.look,
				open,
				tele > 0.5,
				snap.echo
			);
		}

		this.maw(
			ctx,
			x,
			y,
			body,
			R,
			t,
			phase,
			tele,
			snap.echo,
			snap.state === 'ACTIVE' && snap.shape === 'cast'
		);
		ctx.restore();
	}

	private maw(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		body: number,
		R: number,
		t: number,
		phase: number,
		tele: number,
		echo: boolean,
		casting: boolean
	): void {
		const mawR = body * [0.3, 0.42, 0.52][phase - 1] * (1 + tele * 0.25 + (casting ? 0.15 : 0));
		if (phase === 1 && tele < 0.2) {
			// shut sphincter
			ctx.strokeStyle = 'rgba(30,0,0,.8)';
			ctx.lineWidth = Math.max(1, R * 0.025);
			for (let i = 0; i < 8; i += 1) {
				const a = (i / 8) * TAU + t * 0.2;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.quadraticCurveTo(
					x + Math.cos(a + 0.4) * mawR * 0.6,
					y + Math.sin(a + 0.4) * mawR * 0.6,
					x + Math.cos(a) * mawR,
					y + Math.sin(a) * mawR
				);
				ctx.stroke();
			}
			return;
		}
		const hot = phase === 3 || casting;
		const throat = ctx.createRadialGradient(x, y, 0, x, y, mawR);
		throat.addColorStop(0, echo ? '#d8c8ff' : hot ? '#ffe08a' : '#3a0000');
		throat.addColorStop(0.35, echo ? '#5a3aaa' : hot ? '#ff5a10' : '#1a0000');
		throat.addColorStop(1, '#0a0000');
		ctx.fillStyle = throat;
		ctx.beginPath();
		ctx.arc(x, y, mawR, 0, TAU);
		ctx.fill();
		const rings = phase === 3 ? 3 : 2;
		for (let k = 0; k < rings; k += 1) {
			const rr = mawR * (1 - k * 0.28);
			const n = 10 - k * 2;
			const spin = t * (k % 2 ? -0.9 : 0.7) * (1 + phase * 0.3);
			for (let i = 0; i < n; i += 1) {
				const a = spin + (i / n) * TAU;
				const len = rr * 0.38;
				ctx.fillStyle = '#efe4d2';
				ctx.beginPath();
				ctx.moveTo(x + Math.cos(a - 0.18) * rr, y + Math.sin(a - 0.18) * rr);
				ctx.quadraticCurveTo(
					x + Math.cos(a + 0.05) * (rr - len * 0.6),
					y + Math.sin(a + 0.05) * (rr - len * 0.6),
					x + Math.cos(a + 0.22) * (rr - len),
					y + Math.sin(a + 0.22) * (rr - len)
				);
				ctx.lineTo(x + Math.cos(a + 0.18) * rr, y + Math.sin(a + 0.18) * rr);
				ctx.closePath();
				ctx.fill();
			}
		}
		if (hot && !echo) {
			ctx.globalCompositeOperation = 'lighter';
			glow(ctx, x, y, mawR * 0.9, '255,160,48', 0.7 + 0.3 * Math.sin(t * 9));
			ctx.globalCompositeOperation = 'source-over';
		}
	}

	private eye(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		s: number,
		look: number,
		open: number,
		hot: boolean,
		echo: boolean
	): void {
		if (open <= 0.05) {
			ctx.strokeStyle = 'rgba(20,0,0,.8)';
			ctx.lineWidth = Math.max(1, s * 0.3);
			ctx.beginPath();
			ctx.moveTo(x - s, y);
			ctx.quadraticCurveTo(x, y + s * 0.4, x + s, y);
			ctx.stroke();
			return;
		}
		ctx.fillStyle = '#1a0202';
		ctx.beginPath();
		ctx.ellipse(x, y, s * 1.15, s * 0.85 * open + s * 0.15, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = echo ? '#c8b8ff' : hot ? '#ffe86a' : '#ffd23a';
		ctx.beginPath();
		ctx.ellipse(x, y, s, s * 0.75 * open, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = '#120000';
		ctx.beginPath();
		ctx.ellipse(
			x + Math.cos(look) * s * 0.35,
			y + Math.sin(look) * s * 0.25 * open,
			s * 0.18,
			s * 0.6 * open,
			0,
			0,
			TAU
		);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,255,255,.7)';
		ctx.beginPath();
		ctx.arc(x - s * 0.35, y - s * 0.25 * open, s * 0.16, 0, TAU);
		ctx.fill();
	}

	/** A writhing, tapered tentacle with suckers and a bone hook. */
	private tentacle(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		a: number,
		len: number,
		w: number,
		t: number,
		seed: number,
		coil: number,
		raw: boolean,
		echo: boolean
	): void {
		const n = 9;
		const pts: Array<[number, number]> = [[x, y]];
		for (let i = 1; i <= n; i += 1) {
			const u = i / n;
			const wave =
				Math.sin(t * 4 + seed + u * 5) * 0.45 * u + Math.sin(t * 2.3 + seed * 2) * 0.2 * u;
			const ang = a + wave + coil * u * 1.6;
			const prev = pts[i - 1];
			const step = (len / n) * (1 - coil * 0.4);
			pts.push([prev[0] + Math.cos(ang) * step, prev[1] + Math.sin(ang) * step]);
		}
		const left: Array<[number, number]> = [];
		const right: Array<[number, number]> = [];
		for (let i = 0; i <= n; i += 1) {
			const p = pts[i];
			const q = pts[Math.min(n, i + 1)];
			const o = pts[Math.max(0, i - 1)];
			const dx = q[0] - o[0];
			const dy = q[1] - o[1];
			const l = Math.hypot(dx, dy) || 1;
			const ww = w * (1 - (i / n) * 0.85);
			left.push([p[0] - (dy / l) * ww, p[1] + (dx / l) * ww]);
			right.push([p[0] + (dy / l) * ww, p[1] - (dx / l) * ww]);
		}
		ctx.beginPath();
		left.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
		right.reverse().forEach(([px, py]) => ctx.lineTo(px, py));
		ctx.closePath();
		ctx.fillStyle = echo ? '#3a2470' : raw ? '#8a1414' : '#4a1616';
		ctx.fill();
		ctx.strokeStyle = 'rgba(0,0,0,.6)';
		ctx.lineWidth = Math.max(0.6, w * 0.25);
		ctx.stroke();
		ctx.fillStyle = raw ? 'rgba(255,150,130,.6)' : 'rgba(220,140,120,.45)';
		for (let i = 2; i < n; i += 2) {
			ctx.beginPath();
			ctx.arc(pts[i][0], pts[i][1], Math.max(0.5, w * 0.35 * (1 - i / n)), 0, TAU);
			ctx.fill();
		}
		const tip = pts[n];
		const pre = pts[n - 1];
		const ta = Math.atan2(tip[1] - pre[1], tip[0] - pre[0]);
		ctx.strokeStyle = '#e8dcc8';
		ctx.lineWidth = Math.max(0.8, w * 0.5);
		ctx.beginPath();
		ctx.moveTo(tip[0], tip[1]);
		ctx.quadraticCurveTo(
			tip[0] + Math.cos(ta) * w * 2,
			tip[1] + Math.sin(ta) * w * 2,
			tip[0] + Math.cos(ta + 1.8) * w * 1.6,
			tip[1] + Math.sin(ta + 1.8) * w * 1.6
		);
		ctx.stroke();
	}
}
