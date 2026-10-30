import type { GhostKind } from '../../logic/actors/GhostModel';
import type { ArcadeDir } from './arcadeSprites';
import { ARCADE_COLORS, GHOST_COLORS, ghostBody, ghostEyes, pacFrame } from './arcadeSprites';
import { ARCADE_FPS } from './ArcadeView';
import { FLOW } from '../../config/flowConfig';

/** Seconds of the intermission after round 2 (the flow's `intermission` phase). */
export const INTERMISSION_DURATION = FLOW.arcade.intermission;

/** Everything sits this far down the board canvas, so the scene fills the screen. */
const OY = 40;

/** The ambush plan Blinky chalks up: a mini maze, Pac-Man, four arrows to an X. */
const PLAN: ReadonlyArray<readonly [number, number, number, number]> = [
	// maze sketch
	[66, 60, 184, 60],
	[184, 60, 184, 120],
	[184, 120, 66, 120],
	[66, 120, 66, 60],
	[90, 60, 90, 84],
	[160, 96, 160, 120],
	[110, 76, 140, 76],
	[110, 108, 140, 108],
	// Pac-Man: a little circle with a mouth
	...circle(125, 92, 6, 10),
	// four dotted arrows from the corners closing in
	[70, 64, 116, 88],
	[180, 64, 134, 88],
	[70, 116, 116, 96],
	[180, 116, 134, 96],
	// the X on him
	[121, 88, 129, 96],
	[129, 88, 121, 96]
].map(([x0, y0, x1, y1]) => [x0, y0 + OY, x1, y1 + OY] as const);
const PLAN_LENGTH = PLAN.reduce((sum, [a, b, c, d]) => sum + Math.hypot(c - a, d - b), 0);

/** A polygon round (cx, cy), open on the right like a mouth. */
function circle(
	cx: number,
	cy: number,
	r: number,
	n: number
): Array<[number, number, number, number]> {
	const out: Array<[number, number, number, number]> = [];
	for (let i = 1; i < n; i += 1) {
		const a0 = 0.5 + (i - 1) * ((Math.PI * 2 - 1) / (n - 1));
		const a1 = 0.5 + i * ((Math.PI * 2 - 1) / (n - 1));
		out.push([
			Math.round(cx + Math.cos(a0) * r),
			Math.round(cy + Math.sin(a0) * r),
			Math.round(cx + Math.cos(a1) * r),
			Math.round(cy + Math.sin(a1) * r)
		]);
	}
	return out;
}

const WATCHERS: ReadonlyArray<readonly [GhostKind, number]> = [
	['PINKY', 74],
	['INKY', 96],
	['CLYDE', 118]
];
/** Blinky's place on the floor, right of the board's middle. */
const BLINKY_REST = 166;
const FLOOR_Y = 156 + OY;

const QUESTION = ['.###.', '#...#', '...#.', '..#..', '..#..', '.....', '..#..'];

const smooth = (a: number, b: number, t: number): number =>
	Math.min(1, Math.max(0, (t - a) / (b - a)));

/**
 * Intermission (a): Blinky chalks an ambush plan on a board while the others watch;
 * Pac-Man walks in, eats the chalk, the plan smudges away, the ghosts look at each other
 * and give chase as Pac-Man runs off. `t` is seconds into the scene; stepped at 30 fps.
 */
export function drawIntermission(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	time: number
): void {
	const t = Math.floor(time * ARCADE_FPS) / ARCADE_FPS;
	const tick = Math.max(0, Math.floor(time * ARCADE_FPS));
	const wiggle = Math.floor(tick / 6) % 2;
	ctx.fillStyle = ARCADE_COLORS.void;
	ctx.fillRect(0, 0, width, height);

	// the board on its legs, and the floor
	ctx.fillStyle = ARCADE_COLORS.boardFrame;
	ctx.fillRect(56, 50 + OY, 138, 80);
	ctx.fillRect(60, 130 + OY, 4, 34);
	ctx.fillRect(186, 130 + OY, 4, 34);
	ctx.fillStyle = ARCADE_COLORS.board;
	ctx.fillRect(59, 53 + OY, 132, 74);
	ctx.fillStyle = ARCADE_COLORS.wallDim;
	ctx.fillRect(0, FLOOR_Y + 8, width, 1);

	// chalk: drawn in 0.5..3.0, wiped out in 4.8..5.8
	const drawn = smooth(0.5, 3.0, t) * (1 - smooth(4.8, 5.8, t));
	const tip = chalkPlan(ctx, drawn * PLAN_LENGTH);

	// Blinky rises to the board, hovers by the chalk tip while drawing, and comes back down
	const first = PLAN[0];
	const last = PLAN[PLAN.length - 1];
	const hover = (x: number, y: number): [number, number] => [
		Math.max(70, Math.min(180, x)),
		y + 10
	];
	const lerp = (a: [number, number], b: [number, number], u: number): [number, number] => [
		a[0] + (b[0] - a[0]) * u,
		a[1] + (b[1] - a[1]) * u
	];
	const rest: [number, number] = [BLINKY_REST, FLOOR_Y];
	let blinky: [number, number] = rest;
	if (t >= 0.2 && t < 0.5) {
		blinky = lerp(rest, hover(first[0], first[1]), smooth(0.2, 0.5, t));
	} else if (t >= 0.5 && t < 3.0) {
		blinky = hover(tip[0], tip[1]);
	} else if (t >= 3.0 && t < 3.4) {
		blinky = lerp(hover(last[2], last[3]), rest, smooth(3.0, 3.4, t));
	}
	// everyone chases Pac-Man off to the right at the end
	const chase = smooth(6.3, 7.5, t) * 260;
	const bx = Math.round(blinky[0] + chase);
	const by = Math.round(blinky[1]);
	const puzzled = t >= 5.0 && t < 6.3;
	const lookAround: ArcadeDir = Math.floor(t * 3) % 2 === 0 ? 'LEFT' : 'RIGHT';
	for (const [kind, x] of WATCHERS) {
		const dir: ArcadeDir = t >= 6.3 ? 'RIGHT' : puzzled ? lookAround : 'UP';
		ghost(ctx, kind, Math.round(x + chase), FLOOR_Y, dir, wiggle);
	}
	const blinkyDir: ArcadeDir =
		t >= 6.3 ? 'RIGHT' : puzzled ? lookAround : t >= 3.4 && t < 5.0 ? 'RIGHT' : 'UP';
	ghost(ctx, 'BLINKY', bx, by, blinkyDir, wiggle);
	// the chalk: at the tip while drawing, then in Blinky's hand until Pac-Man eats it
	if (t < 4.4) {
		ctx.fillStyle = ARCADE_COLORS.chalk;
		const drawing = t >= 0.5 && t < 3.0;
		ctx.fillRect(
			drawing ? Math.round(tip[0]) : bx + 8,
			drawing ? Math.round(tip[1]) : by - 1,
			2,
			1
		);
	}
	if (puzzled) {
		pixels(ctx, QUESTION, bx - 2, by - 18, ARCADE_COLORS.chalk);
	}

	// Pac-Man: walks in from the right (3.0..4.2), eats the chalk (4.2..4.8), runs (6.0..)
	if (t >= 3.0) {
		const walkIn = smooth(3.0, 4.2, t);
		const runOff = smooth(6.0, 7.2, t);
		const stop = BLINKY_REST + 15;
		const px = Math.round(width + 10 - walkIn * (width + 10 - stop) + runOff * 120);
		const dir: ArcadeDir = runOff > 0 ? 'RIGHT' : 'LEFT';
		const eating = t >= 4.2 && t < 4.8;
		const moving = walkIn < 1 || runOff > 0 || eating;
		const step = moving ? tick % 4 : 0;
		const frame = step === 3 ? 1 : step;
		ctx.drawImage(pacFrame(dir, frame), px - 7, FLOOR_Y - 7);
		// chalk dust puffs while chewing
		if (eating) {
			ctx.fillStyle = ARCADE_COLORS.chalk;
			for (let i = 0; i < 3; i += 1) {
				const k = (tick + i * 5) % 12;
				ctx.fillRect(px - 6 + (i - 1) * 2, FLOOR_Y - 6 - k, 1, 1);
			}
		}
	}
}

/** Draws the first `length` pixels of the plan and returns where the chalk tip is. */
function chalkPlan(ctx: CanvasRenderingContext2D, length: number): [number, number] {
	let left = length;
	let tip: [number, number] = [PLAN[0][0], PLAN[0][1]];
	ctx.fillStyle = ARCADE_COLORS.chalk;
	for (const [x0, y0, x1, y1] of PLAN) {
		if (left <= 0) {
			break;
		}
		const len = Math.hypot(x1 - x0, y1 - y0);
		const u = Math.min(1, left / len);
		const steps = Math.max(1, Math.round(len * u));
		for (let i = 0; i <= steps; i += 1) {
			const k = (i / steps) * u;
			// the arrows are dotted, the sketch is solid
			if (len > 30 && x0 !== x1 && y0 !== y1 && i % 3 === 2) {
				continue;
			}
			ctx.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), 1, 1);
		}
		tip = [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
		left -= len;
	}
	return tip;
}

function ghost(
	ctx: CanvasRenderingContext2D,
	kind: GhostKind,
	x: number,
	y: number,
	dir: ArcadeDir,
	wiggle: number
): void {
	ctx.drawImage(ghostBody(`${GHOST_COLORS[kind]}|${wiggle}`), x - 7, y - 7);
	ctx.drawImage(ghostEyes(dir), x - 7, y - 7);
}

function pixels(
	ctx: CanvasRenderingContext2D,
	rows: readonly string[],
	x: number,
	y: number,
	color: string
): void {
	ctx.fillStyle = color;
	rows.forEach((row, dy) => {
		for (let dx = 0; dx < row.length; dx += 1) {
			if (row[dx] === '#') {
				ctx.fillRect(x + dx, y + dy, 1, 1);
			}
		}
	});
}
