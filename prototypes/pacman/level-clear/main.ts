// Stage 4 prototype: the level-complete animation on the real seasons. Everything drawn
// here comes from the game's sources; only the controls and the Pac-Man marker are local.
import { GRID_01 } from '../../../src/games/pacman/config/gridConfig';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { glowTexture } from '../../../src/games/pacman/render/common/textures';
import { SeasonTurn } from '../../../src/games/pacman/render/transitions/seasonTurn/SeasonTurn';
import { SEASON_TURN_TOTAL } from '../../../src/games/pacman/render/transitions/seasonTurn/seasonTurnTimeline';
import { FLOW } from '../../../src/games/pacman/config/flowConfig';

const { lights, turn: turning, settle: settling } = FLOW.levelClear;

const ORDER = ['summer', 'autumn', 'winter', 'spring'] as const;
type Season = (typeof ORDER)[number];
const LIGHT = 0xffe3a0;
const GAP = 0xfff4d6;

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

const theme = (s: Season): MeadowTheme => meadowThemeFor(s) as MeadowTheme;
const nextOf = (s: Season): Season => ORDER[(ORDER.indexOf(s) + 1) % ORDER.length];

let from: Season = 'summer';
let oldWorld: MeadowWorld;
let newWorld: MeadowWorld;
let vw = 0;
let vh = 0;
/** Seconds since the level was cleared; -1 before, total after. */
let tl = -1;
let playing = false;
let speed = 1;
let finish = { r: 19, c: 12 };
const turn = new SeasonTurn();

/** Brings a world's mood (weather, night) to its target at once. */
function settle(world: MeadowWorld): void {
	for (let i = 0; i < 80; i++) {
		world.update(0.1);
	}
}

function buildWorlds(): void {
	oldWorld = new MeadowWorld(GRID_01, theme(from));
	newWorld = new MeadowWorld(GRID_01, theme(nextOf(from)));
	oldWorld.resize(vw, vh, D);
	newWorld.resize(vw, vh, D);
	// the cleared level ends in its weather and at night; the next one starts fresh
	oldWorld.setMood(1, 1);
	newWorld.setMood(0, 0);
	settle(oldWorld);
	settle(newWorld);
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === from));
	}
	$('note').textContent = `${label(from)} → ${label(nextOf(from))} · клик по коридору — где съедена последняя точка`;
}

const label = (s: Season) => ({ summer: 'Лето', autumn: 'Осень', winter: 'Зима', spring: 'Весна' })[s];

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	buildWorlds();
}

const allEaten = () => true;
const noneEaten = () => false;

function drawWorld(target: CanvasRenderingContext2D, world: MeadowWorld, eaten: () => boolean): void {
	target.setTransform(D, 0, 0, D, 0, 0);
	target.globalAlpha = 1;
	target.globalCompositeOperation = 'source-over';
	world.drawWorld(target, eaten);
	world.drawMood(target);
	world.drawOverlay(target);
}

/** Pac-Man on the last dot: a golden halo pulses while the light runs, then he bows out. */
function drawPac(t: number, time: number): void {
	const L = oldWorld.layout;
	const x = L.offsetX + (finish.c + 0.5) * L.tileSize;
	const y = L.offsetY + (finish.r + 0.5) * L.tileSize;
	const r = L.tileSize * 0.42;
	let scale = 1;
	let alpha = 1;
	if (t >= 0) {
		const end = lights + turning;
		scale = 1 + 0.18 * Math.max(0, Math.sin(Math.min(t, 1.2) * Math.PI * 2.5)) * (1 - Math.min(1, t / 1.2));
		if (t > end) {
			alpha = Math.max(0, 1 - (t - end) / settling);
		}
		const halo = Math.max(0, 1 - t / 2.35);
		if (halo > 0) {
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = halo * (0.6 + 0.4 * Math.sin(time * 8));
			const s = L.tileSize * (1.6 + t * 1.5);
			ctx.drawImage(glowTexture(LIGHT), x - s, y - s, s * 2, s * 2);
		}
	}
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = alpha;
	const m = Math.PI * (0.12 + 0.14 * Math.abs(Math.sin(time * 9)));
	ctx.fillStyle = '#ffd23f';
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.arc(x, y, r * scale, Math.PI + m, Math.PI - m + Math.PI * 2);
	ctx.closePath();
	ctx.fill();
	ctx.strokeStyle = 'rgba(120,80,0,.45)';
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.globalAlpha = 1;
}

const slider = $<HTMLInputElement>('ts');
const tLabel = $('tt');
function setT(t: number): void {
	tl = t;
	slider.value = String(Math.round((Math.max(0, t) / SEASON_TURN_TOTAL) * 1000));
	tLabel.textContent = t < 0 ? '—' : `${t.toFixed(2)} с`;
}

$('bp').addEventListener('click', () => {
	playing = true;
	setT(0);
});
$('br').addEventListener('click', () => {
	playing = false;
	setT(-1);
});
$('bv').addEventListener('click', () => {
	speed = speed === 1 ? 0.25 : 1;
	$('bv').textContent = speed === 1 ? '1×' : '¼×';
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		from = b.dataset.season as Season;
		playing = false;
		setT(-1);
		buildWorlds();
	});
}
slider.addEventListener('input', () => {
	playing = false;
	setT((Number(slider.value) / 1000) * SEASON_TURN_TOTAL);
});
view.addEventListener('click', (e) => {
	const L = oldWorld.layout;
	const c = Math.floor((e.clientX - L.offsetX) / L.tileSize);
	const r = Math.floor((e.clientY - L.offsetY) / L.tileSize);
	const t = GRID_01[r]?.[c];
	if (!t || t === 'WL' || t === 'ES' || ['LT', 'LE', 'BY', 'PY', 'IY', 'CE'].includes(t)) {
		return;
	}
	finish = { r, c };
	playing = false;
	setT(-1);
});

let time = 0;
let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	time += dt;
	if (playing) {
		const nt = tl + dt * speed;
		if (nt >= SEASON_TURN_TOTAL) {
			playing = false;
			setT(SEASON_TURN_TOTAL);
		} else {
			setT(nt);
		}
	}
	oldWorld.update(dt);
	newWorld.update(dt);
	if (tl < 0) {
		drawWorld(ctx, oldWorld, allEaten);
	} else if (tl >= SEASON_TURN_TOTAL) {
		drawWorld(ctx, newWorld, noneEaten);
	} else {
		drawWorld(turn.old(view.width, view.height), oldWorld, allEaten);
		drawWorld(turn.next(view.width, view.height), newWorld, noneEaten);
		ctx.setTransform(D, 0, 0, D, 0, 0);
		turn.compose(ctx, vw, vh, D, oldWorld.layout, time, {
			grid: GRID_01,
			x: finish.c + 0.5,
			y: finish.r + 0.5,
			elapsed: tl,
			light: LIGHT,
			gap: GAP,
			particle: (i) => theme(nextOf(from)).live.drift.texture(i)
		});
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	if (tl < SEASON_TURN_TOTAL) {
		drawPac(tl, time);
	}
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
setT(-1);
(window as unknown as { turn: unknown }).turn = {
	play: () => $('bp').click(),
	seek: (t: number) => {
		playing = false;
		setT(t);
	},
	season: (s: Season) => {
		from = s;
		buildWorlds();
	}
};
requestAnimationFrame(frame);
