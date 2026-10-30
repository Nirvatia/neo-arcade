// Prototype: Pac-Man and Ms. Pac-Man, one design each (stage 10.3/10.4), shaded per pixel in
// WebGL2 (`shaders.ts`). Left: both large, circling on a dark panel. Right: both running
// loops in the summer maze at game scale. The GL layer is composited into the 2D frame
// between the food and the overlay, as the game will do. "Энерджайзер" powers both for 6 s
// (the last 1.6 s blink).
import { GRID_01 } from '../../../src/games/pacman/config/gridConfig';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { CHARACTER, TRAIL, VERTEX } from './shaders';

interface Point {
	x: number;
	y: number;
	age: number;
}

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

const POWER_TIME = 6;
const POWER_ENDING = 1.6;
const POWER_EASE = 0.35;
const SPEED = 5.2; // tiles per second
/** Length of path kept for the trail, in body radii. */
const TRAIL_LENGTH = 4.6;

// ───────────── WebGL ─────────────

const glCanvas = document.createElement('canvas');
const gl = glCanvas.getContext('webgl2', {
	premultipliedAlpha: true,
	alpha: true,
	antialias: false,
	preserveDrawingBuffer: true
}) as WebGL2RenderingContext;

function program(fragment: string): WebGLProgram {
	const make = (type: number, src: string) => {
		const sh = gl.createShader(type) as WebGLShader;
		gl.shaderSource(sh, src);
		gl.compileShader(sh);
		if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
			console.error('characters shader', gl.getShaderInfoLog(sh));
		}
		return sh;
	};
	const p = gl.createProgram() as WebGLProgram;
	gl.attachShader(p, make(gl.VERTEX_SHADER, VERTEX));
	gl.attachShader(p, make(gl.FRAGMENT_SHADER, fragment));
	gl.bindAttribLocation(p, 0, 'aCorner');
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
		console.error('characters program', gl.getProgramInfoLog(p));
	}
	return p;
}
const charProg = program(CHARACTER);
const trailProg = program(TRAIL);
const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const loc = (p: WebGLProgram, name: string) => gl.getUniformLocation(p, name);

interface Actor {
	kind: 0 | 1;
	x: number;
	y: number;
	r: number;
	angle: number;
	/** Mirror of the sprite frame: -1 keeps the top up after turning round. */
	flip: number;
	/** The last horizontal heading: 1 right, -1 left. */
	lastH: number;
	mouth: number;
	trail: Point[];
}

function drawTrail(a: Actor, power: number, t: number): void {
	const pts = a.trail;
	if (pts.length < 2) return;
	const step = Math.max(1, Math.ceil(pts.length / 48));
	const used: Point[] = [];
	for (let i = 0; i < pts.length; i += step) used.push(pts[i]);
	if (used[used.length - 1] !== pts[pts.length - 1]) used.push(pts[pts.length - 1]);
	const flat = new Float32Array(96);
	let len = 0;
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	used.slice(0, 48).forEach((p, i) => {
		flat[i * 2] = p.x * D;
		flat[i * 2 + 1] = p.y * D;
		if (i > 0) len += Math.hypot(p.x - used[i - 1].x, p.y - used[i - 1].y) * D;
		x0 = Math.min(x0, p.x);
		y0 = Math.min(y0, p.y);
		x1 = Math.max(x1, p.x);
		y1 = Math.max(y1, p.y);
	});
	const m = a.r * 2;
	gl.useProgram(trailProg);
	gl.uniform2f(loc(trailProg, 'uRes'), glCanvas.width, glCanvas.height);
	gl.uniform4f(loc(trailProg, 'uBox'), (x0 - m) * D, (y0 - m) * D, (x1 + m) * D, (y1 + m) * D);
	gl.uniform2fv(loc(trailProg, 'uPts'), flat);
	gl.uniform1i(loc(trailProg, 'uN'), Math.min(48, used.length));
	gl.uniform1f(loc(trailProg, 'uR'), a.r * D);
	gl.uniform1f(loc(trailProg, 'uLen'), len);
	gl.uniform1f(loc(trailProg, 'uPow'), power);
	gl.uniform1f(loc(trailProg, 'uKind'), a.kind);
	gl.uniform1f(loc(trailProg, 'uT'), t);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function drawActor(a: Actor, power: number, ending: number, t: number): void {
	const m = a.r * 2.4;
	gl.useProgram(charProg);
	gl.uniform2f(loc(charProg, 'uRes'), glCanvas.width, glCanvas.height);
	gl.uniform4f(loc(charProg, 'uBox'), (a.x - m) * D, (a.y - m) * D, (a.x + m) * D, (a.y + m) * D);
	gl.uniform2f(loc(charProg, 'uC'), a.x * D, a.y * D);
	gl.uniform1f(loc(charProg, 'uR'), a.r * D);
	gl.uniform1f(loc(charProg, 'uAng'), a.angle);
	gl.uniform1f(loc(charProg, 'uFlip'), a.flip);
	gl.uniform1f(loc(charProg, 'uMouth'), a.mouth);
	gl.uniform1f(loc(charProg, 'uPow'), power);
	gl.uniform1f(loc(charProg, 'uEnd'), ending);
	gl.uniform1f(loc(charProg, 'uKind'), a.kind);
	gl.uniform1f(loc(charProg, 'uT'), t);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ───────────── scene ─────────────

let world: MeadowWorld;
let vw = 0;
let vh = 0;
let panelW = 0;
let stopped = false;
let powerTimer = 0;
let power = 0;
/** The large pair's angle on their ellipses. */
let bigPhase = 0;

/** Corridor loops in GRID_01 (tile corners, clockwise from the bottom-left). */
const LOOPS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
	[
		[13, 5],
		[22, 5],
		[22, 2],
		[13, 2]
	],
	[
		[2, 5],
		[11, 5],
		[11, 2],
		[2, 2]
	]
];

function onLoop(loop: ReadonlyArray<[number, number]>, d: number) {
	let per = 0;
	for (let i = 0; i < loop.length; i++) {
		const [ax, ay] = loop[i];
		const [bx, by] = loop[(i + 1) % loop.length];
		per += Math.abs(bx - ax) + Math.abs(by - ay);
	}
	let rest = ((d % per) + per) % per;
	for (let i = 0; i < loop.length; i++) {
		const [ax, ay] = loop[i];
		const [bx, by] = loop[(i + 1) % loop.length];
		const len = Math.abs(bx - ax) + Math.abs(by - ay);
		if (rest <= len) {
			const u = rest / len;
			return { x: ax + (bx - ax) * u + 0.5, y: ay + (by - ay) * u + 0.5, angle: Math.atan2(by - ay, bx - ax) };
		}
		rest -= len;
	}
	return { x: loop[0][0] + 0.5, y: loop[0][1] + 0.5, angle: 0 };
}

const newActor = (kind: 0 | 1): Actor => ({
	kind,
	x: 0,
	y: 0,
	r: 10,
	angle: 0,
	flip: 1,
	lastH: 1,
	mouth: 0,
	trail: []
});
const mazeActors = [newActor(0), newActor(1)];
const bigActors = [newActor(0), newActor(1)];
const along = [0, 7];

/** Moves an actor and records its path for the trail. */
function place(a: Actor, x: number, y: number, angle: number, dt: number, t: number): void {
	a.x = x;
	a.y = y;
	a.angle = angle;
	if (Math.abs(Math.cos(angle)) > 0.5) a.lastH = Math.cos(angle) > 0 ? 1 : -1;
	// heading left the frame turns round: flipping y keeps the head's top up; heading up or
	// down it keeps the mirror of the last horizontal heading, like the arcade sprite
	const vertical = Math.abs(Math.sin(angle)) > 0.5;
	a.flip = (vertical ? a.lastH : Math.cos(angle) > 0 ? 1 : -1) < 0 ? -1 : 1;
	a.mouth = stopped ? 0.35 : Math.abs(Math.sin(t * 13));
	for (const p of a.trail) p.age += dt;
	a.trail.unshift({ x, y, age: 0 });
	let len = 0;
	for (let i = 1; i < a.trail.length; i++) {
		len += Math.hypot(a.trail[i].x - a.trail[i - 1].x, a.trail[i].y - a.trail[i - 1].y);
		if (len > a.r * TRAIL_LENGTH) {
			a.trail.length = i + 1;
			break;
		}
	}
	if (stopped) a.trail.length = Math.min(a.trail.length, 1);
}

function buildWorld(): void {
	world = new MeadowWorld(GRID_01, meadowThemeFor('summer') as MeadowTheme);
	world.resize(vw - panelW, vh, D);
	for (let i = 0; i < 80; i++) world.update(0.1);
	for (const a of [...mazeActors, ...bigActors]) a.trail = [];
}

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	panelW = Math.round(Math.min(560, vw * 0.4));
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	glCanvas.width = view.width;
	glCanvas.height = view.height;
	buildWorld();
}

$('power').addEventListener('click', () => {
	powerTimer = POWER_TIME;
});
$('stop').addEventListener('click', () => {
	stopped = !stopped;
	$('stop').setAttribute('aria-pressed', String(stopped));
});

let time = 0;
let last = performance.now();
function frame(now: number, loop = true): void {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	time += dt;
	const move = stopped ? 0 : dt;
	powerTimer = Math.max(0, powerTimer - dt);
	const target = powerTimer > 0 ? 1 : 0;
	power += Math.sign(target - power) * Math.min(Math.abs(target - power), dt / POWER_EASE);
	const ending = powerTimer > 0 && powerTimer < POWER_ENDING ? 1 : 0;
	world.update(dt);

	// the maze, right of the panel
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.save();
	ctx.translate(panelW, 0);
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => true);
	ctx.restore();
	const L = world.layout;
	const S = L.tileSize;
	mazeActors.forEach((a, i) => {
		along[i] += SPEED * move;
		const p = onLoop(LOOPS[i], along[i]);
		a.r = S * 0.44;
		place(a, panelW + L.offsetX + p.x * S, L.offsetY + p.y * S, p.angle, dt, time);
	});

	// the panel: both large, circling
	bigPhase += 2.2 * move;
	const g = ctx.createLinearGradient(0, 0, 0, vh);
	g.addColorStop(0, '#141826');
	g.addColorStop(1, '#07080e');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, panelW, vh);
	const bigR = Math.min(panelW * 0.12, vh * 0.085);
	bigActors.forEach((a, i) => {
		const cx = panelW / 2;
		const cy = vh * (i === 0 ? 0.3 : 0.7);
		const ph = bigPhase + i * 1.3;
		const rx = panelW * 0.26;
		const ry = vh * 0.09;
		const ang = stopped ? 0 : Math.atan2(Math.cos(ph) * ry, -Math.sin(ph) * rx);
		a.r = bigR;
		place(a, cx + Math.cos(ph) * rx, cy + Math.sin(ph) * ry, ang, dt, time);
	});
	ctx.fillStyle = 'rgba(210,220,235,.7)';
	ctx.font = '12px "Courier New", monospace';
	ctx.textAlign = 'center';
	ctx.fillText('PAC-MAN', panelW / 2, vh * 0.3 + vh * 0.17);
	ctx.fillText('MS. PAC-MAN', panelW / 2, vh * 0.7 + vh * 0.17);

	// the GL layer: trails under bodies, then the bodies; composited into the frame
	gl.viewport(0, 0, glCanvas.width, glCanvas.height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	const all = [...mazeActors, ...bigActors];
	for (const a of all) drawTrail(a, power, time);
	for (const a of all) drawActor(a, power, ending, time);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.drawImage(glCanvas, 0, 0);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.save();
	ctx.translate(panelW, 0);
	ctx.beginPath();
	ctx.rect(0, 0, vw - panelW, vh);
	ctx.clip();
	world.drawOverlay(ctx);
	ctx.restore();
	if (loop) requestAnimationFrame((n) => frame(n));
}

window.addEventListener('resize', layout);
layout();
// ?capture: no real-time loop; window.__advance(seconds) steps 1/60 s frames, for stills
if (new URLSearchParams(location.search).has('capture')) {
	let clock = 0;
	(window as unknown as { __advance: (s: number) => void }).__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) {
			clock += 1000 / 60;
			frame(clock, false);
		}
	};
	last = 0;
} else {
	requestAnimationFrame(frame);
}
