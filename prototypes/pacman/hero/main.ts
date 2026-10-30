// Prototype: the hero stage for Pac-Man (stage 10.3, from scratch). Him alone, large on a dark
// stage, running a figure of eight (or resting in the middle), with a tile-sized inset of the
// same moment on the summer sand. Buttons: run / rest, a bite, the energizer (6 s, the last
// 1.6 s calm down), quarter speed. ?capture: window.__advance(seconds) steps 1/60 s frames.
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

const POWER_TIME = 6;
const POWER_ENDING = 1.6;
/** The inset's tile, css px (the game's tile on a large screen). */
const TILE = 30;

const hero = new PacmanHero();
const small = new PacmanHero();
let vw = 0;
let vh = 0;
let running = true;
let slow = false;
let powerTimer = 0;
let phase = 0;
let biteClock = 0;

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	hero.setRadius(Math.min(vw, vh) * 0.13);
	small.setRadius(TILE * 0.44);
	hero.reset();
	small.reset();
}

$('run').addEventListener('click', () => {
	running = !running;
	$('run').setAttribute('aria-pressed', String(running));
	$('run').textContent = running ? 'Бег' : 'Покой';
});
$('bite').addEventListener('click', () => {
	hero.eat();
	small.eat();
});
$('power').addEventListener('click', () => {
	powerTimer = POWER_TIME;
});
$('slow').addEventListener('click', () => {
	slow = !slow;
	$('slow').setAttribute('aria-pressed', String(slow));
});

function frame(realDt: number): void {
	const dt = realDt * (slow ? 0.25 : 1);
	powerTimer = Math.max(0, powerTimer - dt);
	const power = powerTimer > 0;
	const ending = power && powerTimer < POWER_ENDING;
	if (running) phase += dt * 0.9;

	// a figure of eight across the stage
	const cx = vw / 2;
	const cy = vh * 0.46;
	const ax = Math.min(vw * 0.3, vh * 0.55);
	const ay = vh * 0.2;
	const x = cx + Math.sin(phase) * ax;
	const y = cy + Math.sin(phase * 2) * ay * 0.5;
	const angle = running ? Math.atan2(Math.cos(phase * 2) * ay, Math.cos(phase) * ax) : 0;
	hero.update(dt, { x: running ? x : cx, y: running ? y : cy, angle, moving: running, power, ending });

	// the inset runs in place along its corridor
	const ix = vw - 18 - TILE * 4;
	const iy = vh - 96 - TILE * 1.5;
	if (running) {
		biteClock += dt * 5.2;
		if (biteClock > 1) {
			biteClock -= 1;
			small.eat();
		}
	}
	const sx = ix + (running ? ((phase * 2.2) % 1) * TILE * 2 - TILE : 0);
	small.update(dt, { x: sx, y: iy, angle: 0, moving: running, power, ending });

	// the stage: dark, a pool of warm light on the floor
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	const bg = ctx.createRadialGradient(cx, vh * 0.5, 0, cx, vh * 0.5, Math.max(vw, vh) * 0.7);
	bg.addColorStop(0, '#1a1420');
	bg.addColorStop(1, '#050408');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, vw, vh);
	hero.draw(ctx);

	// the inset: a corridor of the summer maze at game scale
	const w = TILE * 8;
	const h = TILE * 3;
	const bx = ix - w / 2;
	const by = iy - h / 2;
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(bx, by, w, h, 10);
	ctx.clip();
	ctx.fillStyle = '#8d6b40';
	ctx.fillRect(bx, by, w, h);
	ctx.fillStyle = '#5fae3e';
	ctx.fillRect(bx, by, w, TILE);
	ctx.fillRect(bx, by + TILE * 2, w, TILE);
	ctx.fillStyle = '#ffd56a';
	for (let i = 0; i < 8; i++) {
		ctx.beginPath();
		ctx.arc(bx + TILE * (i + 0.5), iy, TILE * 0.1, 0, Math.PI * 2);
		ctx.fill();
	}
	small.draw(ctx);
	ctx.restore();
	ctx.strokeStyle = 'rgba(255,255,255,.8)';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.roundRect(bx, by, w, h, 10);
	ctx.stroke();
	ctx.fillStyle = 'rgba(220,220,235,.7)';
	ctx.font = '11px "Courier New", monospace';
	ctx.textAlign = 'center';
	ctx.fillText('В РАЗМЕРЕ ТАЙЛА', ix, by - 8);
}

window.addEventListener('resize', layout);
layout();
if (new URLSearchParams(location.search).has('capture')) {
	(window as unknown as { __advance: (s: number) => void }).__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) frame(1 / 60);
	};
} else {
	let last = performance.now();
	const loop = (now: number) => {
		frame(Math.min(0.1, Math.max(0, (now - last) / 1000)));
		last = now;
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
