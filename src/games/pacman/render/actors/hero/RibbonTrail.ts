// A trail as one tapered ribbon along the path the actor really took. Points are kept by
// distance, not by time, so the trail has the same length at any frame rate; it is filled
// as a single polygon per layer, so nothing doubles up at the joints. Layers can stream off
// the path's centre and wave, so a few thin layers read as strands of one flowing trail.

export type RGB = readonly [number, number, number];

const rgba = (c: RGB, a: number): string =>
	`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

interface TrailPoint {
	x: number;
	y: number;
}

/** One pass of the ribbon: width (in body radii) at the head, colour stops head → tail. */
export interface RibbonLayer {
	readonly width: number;
	readonly stops: ReadonlyArray<readonly [number, RGB, number]>;
	/** Side offset from the path, body radii (+ is left of the heading). */
	readonly offset?: number;
	/** A wave travelling down the strand: amplitude in body radii, growing to the tail. */
	readonly wave?: number;
	/** The wave's phase offset, radians. */
	readonly phase?: number;
}

export class RibbonTrail {
	private points: TrailPoint[] = [];

	reset(): void {
		this.points = [];
	}

	/** The newest point first; a jump longer than `jump` (a teleport) restarts the trail. */
	push(x: number, y: number, step: number, maxLength: number, jump: number): void {
		const head = this.points[0];
		if (head && Math.hypot(head.x - x, head.y - y) > jump) {
			this.points = [];
		}
		// the head follows the actor; once it is a step away from the last fixed point, it
		// stays behind as a point of the path and a new head starts
		const fixed = this.points[1];
		if (this.points.length === 0) {
			this.points.push({ x, y });
		} else if (!fixed || Math.hypot(fixed.x - x, fixed.y - y) >= step) {
			this.points.unshift({ x, y });
		} else {
			this.points[0].x = x;
			this.points[0].y = y;
		}
		let len = 0;
		for (let i = 1; i < this.points.length; i++) {
			len += Math.hypot(
				this.points[i].x - this.points[i - 1].x,
				this.points[i].y - this.points[i - 1].y
			);
			if (len > maxLength) {
				this.points.length = i + 1;
				break;
			}
		}
	}

	/** Shrinks the trail towards the head (standing still, it draws in). */
	shrink(amount: number): void {
		while (this.points.length > 1 && amount > 0) {
			const n = this.points.length;
			const a = this.points[n - 2];
			const b = this.points[n - 1];
			const len = Math.hypot(b.x - a.x, b.y - a.y);
			if (len <= amount) {
				this.points.pop();
				amount -= len;
			} else {
				const k = amount / len;
				b.x += (a.x - b.x) * k;
				b.y += (a.y - b.y) * k;
				amount = 0;
			}
		}
	}

	get length(): number {
		let len = 0;
		for (let i = 1; i < this.points.length; i++) {
			len += Math.hypot(
				this.points[i].x - this.points[i - 1].x,
				this.points[i].y - this.points[i - 1].y
			);
		}
		return len;
	}

	/** The point `d` px back along the trail, or null past its end. */
	at(d: number): TrailPoint | null {
		let rest = d;
		for (let i = 1; i < this.points.length; i++) {
			const a = this.points[i - 1];
			const b = this.points[i];
			const len = Math.hypot(b.x - a.x, b.y - a.y);
			if (rest <= len && len > 0) {
				const k = rest / len;
				return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
			}
			rest -= len;
		}
		return null;
	}

	/** Fills each layer as one ribbon, `r` the body radius, `alpha` overall. */
	draw(
		ctx: CanvasRenderingContext2D,
		r: number,
		layers: readonly RibbonLayer[],
		alpha = 1,
		time = 0
	): void {
		const pts = this.points;
		const n = pts.length;
		if (n < 2 || alpha <= 0) return;
		const total = this.length;
		if (total < r * 0.3) return;
		for (const layer of layers) {
			const left: TrailPoint[] = [];
			const right: TrailPoint[] = [];
			let acc = 0;
			for (let i = 0; i < n; i++) {
				if (i > 0) acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
				const a = pts[Math.max(0, i - 1)];
				const b = pts[Math.min(n - 1, i + 1)];
				let dx = b.x - a.x;
				let dy = b.y - a.y;
				const len = Math.hypot(dx, dy) || 1;
				dx /= len;
				dy /= len;
				const k = acc / total;
				// full width near the body, tapering smoothly to a point
				const w = layer.width * r * Math.pow(1 - k, 0.75);
				const side =
					((layer.offset ?? 0) * (1 - k * 0.5) +
						(layer.wave ?? 0) * k * Math.sin(acc / r - time * 7 + (layer.phase ?? 0))) *
					r;
				const cx = pts[i].x - dy * side;
				const cy = pts[i].y + dx * side;
				left.push({ x: cx - dy * w, y: cy + dx * w });
				right.push({ x: cx + dy * w, y: cy - dx * w });
			}
			const tail = pts[n - 1];
			const g = ctx.createLinearGradient(pts[0].x, pts[0].y, tail.x, tail.y);
			for (const [o, c, a] of layer.stops) g.addColorStop(o, rgba(c, a * alpha));
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(left[0].x, left[0].y);
			for (let i = 1; i < n; i++) {
				const p = left[i - 1];
				const q = left[i];
				ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
			}
			ctx.lineTo((left[n - 1].x + right[n - 1].x) / 2, (left[n - 1].y + right[n - 1].y) / 2);
			for (let i = n - 1; i > 0; i--) {
				const p = right[i];
				const q = right[i - 1];
				ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
			}
			ctx.lineTo(right[0].x, right[0].y);
			ctx.closePath();
			ctx.fill();
		}
	}
}
