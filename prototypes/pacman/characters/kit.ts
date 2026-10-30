// Shared pieces for the character concepts: the actor's state, its frame (rotated to the
// heading, mirrored so the top stays on top), the wedge body, a tapered ribbon trail and a
// few small shapes. Concept art draws in the actor's frame, r = the body radius.

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface ActorState {
	/** Centre, screen px. */
	readonly x: number;
	readonly y: number;
	/** Body radius, screen px. */
	readonly r: number;
	/** Heading, radians (0 = right). */
	readonly angle: number;
	/** 1 after heading right, -1 after heading left: keeps the sprite's top on top. */
	readonly flip: number;
	/** Mouth half-opening, 0..1 (1 = wide open). */
	readonly mouth: number;
	/** Energizer transformation, 0..1 (eases in and out). */
	readonly power: number;
	/** The power is running out: 0..1 blink phase near its end, else 0. */
	readonly ending: number;
	/** Seconds. */
	readonly t: number;
	/** Recent centres, newest first, screen px. */
	readonly trail: readonly Point[];
}

export interface CharacterArt {
	draw(ctx: CanvasRenderingContext2D, s: ActorState): void;
}

export interface Concept {
	readonly id: string;
	readonly name: string;
	readonly note: string;
	readonly pac: CharacterArt;
	readonly ms: CharacterArt;
}

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/** rgb() between two [r,g,b] colours. */
export function mix(a: readonly number[], b: readonly number[], k: number, alpha = 1): string {
	const c = a.map((v, i) => Math.round(lerp(v, b[i], k)));
	return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

/** Runs `draw` in the actor's frame: origin at its centre, +x along the heading, top up. */
export function inFrame(ctx: CanvasRenderingContext2D, s: ActorState, draw: () => void): void {
	ctx.save();
	ctx.translate(s.x, s.y);
	ctx.rotate(s.angle);
	// heading left the frame is turned round: flipping y keeps the head's top up; heading up
	// or down it keeps the mirror of the last horizontal heading, like the arcade sprite
	const left = Math.cos(s.angle) < -0.5;
	const vertical = Math.abs(Math.sin(s.angle)) > 0.5;
	ctx.scale(1, left || (vertical && s.flip < 0) ? -1 : 1);
	draw();
	ctx.restore();
}

/** The mouth's half-angle, radians, from 0..1. */
export const mouthAngle = (mouth: number, max = 0.62): number => 0.04 + clamp01(mouth) * max;

/** A body circle with a wedge mouth cut towards +x. */
export function wedge(ctx: CanvasRenderingContext2D, r: number, half: number): void {
	ctx.beginPath();
	ctx.moveTo(-r * 0.12, 0);
	ctx.arc(0, 0, r, half, Math.PI * 2 - half);
	ctx.closePath();
}

/**
 * A tapered ribbon along the trail (newest first): width w0 at the head down to w1 at the
 * tail, filled with a gradient from the head's colour stops to the tail's.
 */
export function ribbon(
	ctx: CanvasRenderingContext2D,
	pts: readonly Point[],
	w0: number,
	w1: number,
	stops: ReadonlyArray<readonly [number, string]>,
	wave = 0,
	t = 0
): void {
	if (pts.length < 2) return;
	const n = pts.length;
	const left: Point[] = [];
	const right: Point[] = [];
	for (let i = 0; i < n; i++) {
		const a = pts[Math.max(0, i - 1)];
		const b = pts[Math.min(n - 1, i + 1)];
		let dx = b.x - a.x;
		let dy = b.y - a.y;
		const len = Math.hypot(dx, dy) || 1;
		dx /= len;
		dy /= len;
		const k = i / (n - 1);
		const w = lerp(w0, w1, k) + Math.sin(t * 9 - i * 0.9) * wave * k;
		left.push({ x: pts[i].x - dy * w, y: pts[i].y + dx * w });
		right.push({ x: pts[i].x + dy * w, y: pts[i].y - dx * w });
	}
	const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[n - 1].x, pts[n - 1].y);
	for (const [o, c] of stops) g.addColorStop(o, c);
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.moveTo(left[0].x, left[0].y);
	for (let i = 1; i < n; i++) {
		const p = left[i - 1];
		const q = left[i];
		ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
	}
	ctx.lineTo(left[n - 1].x, left[n - 1].y);
	ctx.lineTo(right[n - 1].x, right[n - 1].y);
	for (let i = n - 2; i >= 0; i--) {
		const p = right[i + 1];
		const q = right[i];
		ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
	}
	ctx.lineTo(right[0].x, right[0].y);
	ctx.closePath();
	ctx.fill();
}

/** A point `d` px back along the trail (newest first), with its index fraction. */
export function along(pts: readonly Point[], d: number): Point | null {
	let rest = d;
	for (let i = 1; i < pts.length; i++) {
		const a = pts[i - 1];
		const b = pts[i];
		const len = Math.hypot(b.x - a.x, b.y - a.y);
		if (rest <= len && len > 0) {
			const k = rest / len;
			return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
		}
		rest -= len;
	}
	return null;
}

/** A four-pointed star. */
export function star4(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
	ctx.beginPath();
	ctx.moveTo(x, y - r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.quadraticCurveTo(x, y, x, y + r);
	ctx.quadraticCurveTo(x, y, x - r, y);
	ctx.quadraticCurveTo(x, y, x, y - r);
	ctx.closePath();
}

/** A heart, `r` about its half width, point down. */
export function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
	ctx.beginPath();
	ctx.moveTo(x, y + r * 0.9);
	ctx.bezierCurveTo(x - r * 1.3, y + r * 0.1, x - r * 0.9, y - r * 1.1, x, y - r * 0.4);
	ctx.bezierCurveTo(x + r * 0.9, y - r * 1.1, x + r * 1.3, y + r * 0.1, x, y + r * 0.9);
	ctx.closePath();
}

/**
 * The bow every Ms. Pac-Man wears: two loops and a knot, centred at (x, y), `r` the loop
 * length, tilted by `tilt`. Colours: fill, outline, highlight.
 */
export function bow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	tilt: number,
	fill: string,
	line: string,
	shine: string,
	dots = false
): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(tilt);
	const loop = (side: number) => {
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.bezierCurveTo(side * r * 0.5, -r * 0.95, side * r * 1.25, -r * 0.6, side * r * 1.1, 0);
		ctx.bezierCurveTo(side * r * 1.25, r * 0.6, side * r * 0.5, r * 0.95, 0, 0);
		ctx.closePath();
	};
	ctx.lineJoin = 'round';
	ctx.strokeStyle = line;
	ctx.lineWidth = r * 0.28;
	loop(-1);
	ctx.stroke();
	loop(1);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
	ctx.stroke();
	ctx.fillStyle = fill;
	loop(-1);
	ctx.fill();
	loop(1);
	ctx.fill();
	if (dots) {
		ctx.fillStyle = 'rgba(255,255,255,0.9)';
		for (const [dx, dy] of [
			[-0.7, -0.2],
			[-0.55, 0.35],
			[0.7, -0.2],
			[0.55, 0.35]
		]) {
			ctx.beginPath();
			ctx.arc(dx * r, dy * r, r * 0.11, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.fillStyle = shine;
	ctx.beginPath();
	ctx.ellipse(-r * 0.65, -r * 0.3, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}
