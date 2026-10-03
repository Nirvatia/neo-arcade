import type { SnakeMotion, SnakeMotionPoint } from '../../components/index.js';

export interface SnakePathSample {
	x: number;
	y: number;
	angle: number;
}

const EPS = 1e-6;
const STRAIGHT_DOT = 0.998;
const TURN_TANGENT = 0.5;

export function sampleSnakeMotion(
	motion: SnakeMotion,
	u: number
): SnakePathSample {
	if (motion.points.length === 0) {
		return { x: 0, y: 0, angle: 0 };
	}

	const localRaw = u - motion.baseU;
	const maxLocal = motion.points.length - 1;

	const local = Math.max(0, Math.min(localRaw, maxLocal));
	const i = Math.floor(local);
	const t = local - i;

	const p1 = motion.points[i];

	if (p1 === undefined) {
		return { x: 0, y: 0, angle: 0 };
	}

	if (i >= motion.points.length - 1) {
		const p0 = motion.points[i - 1];

		if (p0 === undefined) {
			return { x: p1.x, y: p1.y, angle: 0 };
		}

		return {
			x: p1.x,
			y: p1.y,
			angle: Math.atan2(p1.y - p0.y, p1.x - p0.x)
		};
	}

	const p2 = motion.points[i + 1]!;

	const p0: SnakeMotionPoint =
		motion.points[i - 1] ??
		({
			x: p1.x - (p2.x - p1.x),
			y: p1.y - (p2.y - p1.y)
		} as SnakeMotionPoint);

	const p3: SnakeMotionPoint =
		motion.points[i + 2] ??
		({
			x: p2.x + (p2.x - p1.x),
			y: p2.y + (p2.y - p1.y)
		} as SnakeMotionPoint);

	const segX = p2.x - p1.x;
	const segY = p2.y - p1.y;
	const segLen = Math.hypot(segX, segY);

	if (segLen < EPS) {
		return { x: p1.x, y: p1.y, angle: 0 };
	}

	const fallbackAngle = Math.atan2(segY, segX);

	if (isStraight(p0, p1, p2, p3)) {
		return {
			x: p1.x + segX * t,
			y: p1.y + segY * t,
			angle: fallbackAngle
		};
	}

	const m1 = tangent(p0, p1, p2, segLen);
	const m2 = tangent(p1, p2, p3, segLen);

	return hermiteSample(p1, p2, m1, m2, t, fallbackAngle);
}

function sameDir(
	ax: number,
	ay: number,
	bx: number,
	by: number
): boolean {
	const la = Math.hypot(ax, ay);
	const lb = Math.hypot(bx, by);

	if (la < EPS || lb < EPS) {
		return true;
	}

	const dot = (ax * bx + ay * by) / (la * lb);

	return dot > STRAIGHT_DOT;
}

function isStraight(
	p0: SnakeMotionPoint,
	p1: SnakeMotionPoint,
	p2: SnakeMotionPoint,
	p3: SnakeMotionPoint
): boolean {
	const v01x = p1.x - p0.x;
	const v01y = p1.y - p0.y;

	const v12x = p2.x - p1.x;
	const v12y = p2.y - p1.y;

	const v23x = p3.x - p2.x;
	const v23y = p3.y - p2.y;

	return (
		sameDir(v01x, v01y, v12x, v12y) &&
		sameDir(v12x, v12y, v23x, v23y)
	);
}

function tangent(
	p0: SnakeMotionPoint,
	p1: SnakeMotionPoint,
	p2: SnakeMotionPoint,
	cellLen: number
): SnakeMotionPoint {
	const inX = p1.x - p0.x;
	const inY = p1.y - p0.y;

	const outX = p2.x - p1.x;
	const outY = p2.y - p1.y;

	const inLen = Math.hypot(inX, inY);
	const outLen = Math.hypot(outX, outY);

	if (inLen < EPS || outLen < EPS) {
		return { x: outX, y: outY };
	}

	const inNx = inX / inLen;
	const inNy = inY / inLen;

	const outNx = outX / outLen;
	const outNy = outY / outLen;

	const dot = inNx * outNx + inNy * outNy;

	if (dot > STRAIGHT_DOT) {
		return { x: outX, y: outY };
	}

	let dirX = inNx + outNx;
	let dirY = inNy + outNy;

	const dirLen = Math.hypot(dirX, dirY);

	if (dirLen < EPS) {
		return { x: outX, y: outY };
	}

	dirX = dirX / dirLen;
	dirY = dirY / dirLen;

	const mag = cellLen * TURN_TANGENT;

	return {
		x: dirX * mag,
		y: dirY * mag
	};
}

function hermiteSample(
	p1: SnakeMotionPoint,
	p2: SnakeMotionPoint,
	m1: SnakeMotionPoint,
	m2: SnakeMotionPoint,
	t: number,
	fallbackAngle: number
): SnakePathSample {
	const t2 = t * t;
	const t3 = t2 * t;

	const h00 = 2 * t3 - 3 * t2 + 1;
	const h10 = t3 - 2 * t2 + t;
	const h01 = -2 * t3 + 3 * t2;
	const h11 = t3 - t2;

	const x =
		p1.x * h00 +
		m1.x * h10 +
		p2.x * h01 +
		m2.x * h11;

	const y =
		p1.y * h00 +
		m1.y * h10 +
		p2.y * h01 +
		m2.y * h11;

	const dx =
		p1.x * (6 * t2 - 6 * t) +
		m1.x * (3 * t2 - 4 * t + 1) +
		p2.x * (-6 * t2 + 6 * t) +
		m2.x * (3 * t2 - 2 * t);

	const dy =
		p1.y * (6 * t2 - 6 * t) +
		m1.y * (3 * t2 - 4 * t + 1) +
		p2.y * (-6 * t2 + 6 * t) +
		m2.y * (3 * t2 - 2 * t);

	let angle = fallbackAngle;

	if (Math.hypot(dx, dy) > 1e-5) {
		angle = Math.atan2(dy, dx);
	}

	return { x, y, angle };
}