// Prototype: Pac-Man and Ms. Pac-Man concepts (stage 10.3/10.4). The strip on top shows a
// concept pair large, normal and under the energizer; below, both run loops in the real
// maze at game scale (Pac-Man right, Ms. Pac-Man left) with a close-up of the top corridors.
// The energizer button transforms both for 6 s (the last 1.6 s blink).
import { GRID_01 } from '../../../src/games/pacman/config/gridConfig';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { CONCEPTS } from './concepts';
import type { ActorState, CharacterArt, Point } from './kit';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

/** Corridor loops in GRID_01 (tile corners, clockwise from the bottom-left). */
const PAC_LOOP: ReadonlyArray<[number, number]> = [
	[13, 5],
	[22, 5],
	[22, 2],
	[13, 2]
];
const MS_LOOP: ReadonlyArray<[number, number]> = [
	[2, 5],
	[11, 5],
	[11, 2],
	[2, 2]
];
const SPEED = 5.2; // tiles per second
const POWER_TIME = 6;
const POWER_ENDING = 1.6;
const POWER_EASE = 0.35;

let concept = 0;
let season: Season = 'summer';
let world: MeadowWorld;
let night = false;
let stopped = false;
let vw = 0;
let vh = 0;
let powerTimer = 0;
let power = 0;

function perimeter(loop: ReadonlyArray<[number, number]>): number {
	let p = 0;
	for (let i = 0; i < loop.length; i++) {
		const [ax, ay] = loop[i];
		const [bx, by] = loop[(i + 1) % loop.length];
		p += Math.abs(bx - ax) + Math.abs(by - ay);
	}
	return p;
}

/** Tile-centre position and heading at a distance along the loop. */
function onLoop(
	loop: ReadonlyArray<[number, number]>,
	d: number
): { x: number; y: number; angle: number } {
	const per = perimeter(loop);
	let rest = ((d % per) + per) % per;
	for (let i = 0; i < loop.length; i++) {
		const [ax, ay] = loop[i];
		const [bx, by] = loop[(i + 1) % loop.length];
		const len = Math.abs(bx - ax) + Math.abs(by - ay);
		if (rest <= len) {
			const u = rest / len;
			return {
				x: ax + (bx - ax) * u + 0.5,
				y: ay + (by - ay) * u + 0.5,
				angle: Math.atan2(by - ay, bx - ax)
			};
		}
		rest -= len;
	}
	return { x: loop[0][0] + 0.5, y: loop[0][1] + 0.5, angle: 0 };
}

interface Runner {
	readonly loop: ReadonlyArray<[number, number]>;
	along: number;
	flip: number;
	trail: Point[];
	readonly art: () => CharacterArt;
}

const runners: Runner[] = [
	{ loop: PAC_LOOP, along: 0, flip: 1, trail: [], art: () => CONCEPTS[concept].pac },
	{ loop: MS_LOOP, along: 7, flip: 1, trail: [], art: () => CONCEPTS[concept].ms }
];

function buildWorld(): void {
	world = new MeadowWorld(GRID_01, meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	world.setMood(0, night ? 1 : 0);
	for (let i = 0; i < 80; i++) world.update(0.1);
	for (const r of runners) r.trail = [];
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
}

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	buildWorld();
}

function selectConcept(i: number): void {
	concept = i;
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-concept]')) {
		b.setAttribute('aria-pressed', String(Number(b.dataset.concept) === concept));
	}
	$('note').textContent = `${CONCEPTS[concept].name} — ${CONCEPTS[concept].note}`;
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-concept]')) {
	b.addEventListener('click', () => selectConcept(Number(b.dataset.concept)));
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		buildWorld();
	});
}
$('night').addEventListener('click', () => {
	night = !night;
	$('night').setAttribute('aria-pressed', String(night));
	world.setMood(0, night ? 1 : 0);
});
$('power').addEventListener('click', () => {
	powerTimer = POWER_TIME;
});
$('stop').addEventListener('click', () => {
	stopped = !stopped;
	$('stop').setAttribute('aria-pressed', String(stopped));
});

/** The arcade chomp: open and shut while moving, half open when standing. */
const chomp = (t: number, moving: boolean): number =>
	moving ? Math.abs(Math.sin(t * 13)) : 0.35;

/** A trail for an actor standing in place: a gentle wave behind it, newest first. */
function waveTrail(x: number, y: number, r: number, t: number): Point[] {
	return Array.from({ length: 22 }, (_, i) => ({
		x: x - i * r * 0.32,
		y: y + Math.sin(t * 4 - i * 0.35) * r * 0.22 * Math.min(1, i / 4)
	}));
}

let time = 0;
let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	time += dt;
	powerTimer = Math.max(0, powerTimer - dt);
	const target = powerTimer > 0 ? 1 : 0;
	power += Math.sign(target - power) * Math.min(Math.abs(target - power), dt / POWER_EASE);
	const ending = powerTimer > 0 && powerTimer < POWER_ENDING ? 1 : 0;
	world.update(dt);

	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => true);
	const L = world.layout;
	const S = L.tileSize;

	for (const runner of runners) {
		if (!stopped) runner.along += SPEED * dt;
		const p = onLoop(runner.loop, runner.along);
		if (Math.abs(Math.cos(p.angle)) > 0.5) runner.flip = Math.cos(p.angle) > 0 ? 1 : -1;
		const x = L.offsetX + p.x * S;
		const y = L.offsetY + p.y * S;
		const head = runner.trail[0];
		if (!head || Math.hypot(head.x - x, head.y - y) > S * 0.12) {
			runner.trail.unshift({ x, y });
			if (runner.trail.length > 26) runner.trail.length = 26;
		} else {
			runner.trail[0] = { x, y };
		}
		const state: ActorState = {
			x,
			y,
			r: S * 0.44,
			angle: p.angle,
			flip: runner.flip,
			mouth: chomp(time, !stopped),
			power,
			ending,
			t: time,
			trail: runner.trail
		};
		runner.art().draw(ctx, state);
	}
	world.drawOverlay(ctx);

	// close-up of the top corridors (columns 1..23, rows 1..6), copied before the strip
	// covers them
	const srcW = 23 * S;
	const srcH = 6 * S;
	const boxW = Math.min(vw - 36, srcW * 2.6, ((vh - 400) / srcH) * srcW);
	const boxH = (boxW / srcW) * srcH;
	const sx = (L.offsetX + 1 * S) * D;
	const sy = (L.offsetY + 1 * S) * D;
	const px = (vw - boxW) / 2;
	const py = vh - boxH - 74;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.imageSmoothingEnabled = true;
	ctx.drawImage(view, sx, sy, srcW * D, srcH * D, px * D, py * D, boxW * D, boxH * D);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.strokeStyle = 'rgba(255,255,255,.9)';
	ctx.lineWidth = 2;
	ctx.strokeRect(px, py, boxW, boxH);
	// the pair large: normal and under the energizer, on a dark strip
	const cell = Math.min(230, (vw - 36) / 4);
	const stripW = cell * 4;
	const stripX = (vw - stripW) / 2;
	const stripY = 14;
	ctx.fillStyle = '#0a0c14';
	ctx.fillRect(stripX, stripY, stripW, cell * 0.8 + 24);
	const c = CONCEPTS[concept];
	const cells: Array<[CharacterArt, number, string]> = [
		[c.pac, 0, 'PAC-MAN'],
		[c.pac, 1, 'PAC-MAN · ЭНЕРДЖАЙЗЕР'],
		[c.ms, 0, 'MS. PAC-MAN'],
		[c.ms, 1, 'MS. PAC-MAN · ЭНЕРДЖАЙЗЕР']
	];
	cells.forEach(([art, pw, label], i) => {
		const r = cell * 0.17;
		const x = stripX + cell * (i + 0.62);
		const y = stripY + cell * 0.42;
		ctx.save();
		ctx.beginPath();
		ctx.rect(stripX + cell * i, stripY, cell, cell * 0.8 + 24);
		ctx.clip();
		art.draw(ctx, {
			x,
			y,
			r,
			angle: 0,
			flip: 1,
			mouth: chomp(time, true),
			power: pw,
			ending: 0,
			t: time,
			trail: waveTrail(x, y, r, time)
		});
		ctx.restore();
		ctx.fillStyle = 'rgba(200,212,224,.75)';
		ctx.font = '11px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(label, stripX + cell * (i + 0.5), stripY + cell * 0.8 + 16);
	});
	$('note').style.top = `${stripY + cell * 0.8 + 30}px`;

	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
selectConcept(0);
requestAnimationFrame(frame);
