// Prototype: Ms. Pac-Man (MsPacmanView, the game's own code) running a loop on a real
// season, with every reaction on a button and a 4× close-up.
import { GRID_01 } from '../../../src/games/pacman/config/gridConfig';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { MsPacmanView } from '../../../src/games/pacman/render/actors/MsPacmanView';
import type { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const ZOOM = 4;

/** A corridor loop in GRID_01 (tile corners, clockwise from the bottom-left). */
const LOOP: ReadonlyArray<[number, number]> = [
	[13, 5],
	[22, 5],
	[22, 2],
	[13, 2]
];
const SPEED = 5.5; // tiles per second

let season: Season = 'spring';
let world: MeadowWorld;
let night = false;
let buffed = false;
let stopped = false;
let dyingFor = -1;
let invulnerableFor = 0;
let along = 0;
let vw = 0;
let vh = 0;
const ms = new MsPacmanView();

const perimeter = (() => {
	let p = 0;
	for (let i = 0; i < LOOP.length; i++) {
		const [ax, ay] = LOOP[i];
		const [bx, by] = LOOP[(i + 1) % LOOP.length];
		p += Math.abs(bx - ax) + Math.abs(by - ay);
	}
	return p;
})();

/** Position (tile centres) and facing at a distance along the loop. */
function onLoop(d: number): { x: number; y: number; facing: Dir } {
	let rest = ((d % perimeter) + perimeter) % perimeter;
	for (let i = 0; i < LOOP.length; i++) {
		const [ax, ay] = LOOP[i];
		const [bx, by] = LOOP[(i + 1) % LOOP.length];
		const len = Math.abs(bx - ax) + Math.abs(by - ay);
		if (rest <= len) {
			const u = rest / len;
			const facing: Dir = bx > ax ? 'RIGHT' : bx < ax ? 'LEFT' : by > ay ? 'DOWN' : 'UP';
			return { x: ax + (bx - ax) * u + 0.5, y: ay + (by - ay) * u + 0.5, facing };
		}
		rest -= len;
	}
	return { x: LOOP[0][0] + 0.5, y: LOOP[0][1] + 0.5, facing: 'RIGHT' };
}

const player = { position: { x: 0, y: 0 }, facing: 'RIGHT' as Dir, isInvulnerable: false };

function buildWorld(): void {
	world = new MeadowWorld(GRID_01, meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	world.setMood(night ? 1 : 0, night ? 1 : 0);
	for (let i = 0; i < 80; i++) world.update(0.1);
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

const toggle = (id: string, on: boolean) => $(id).setAttribute('aria-pressed', String(on));
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		buildWorld();
	});
}
$('night').addEventListener('click', () => {
	night = !night;
	toggle('night', night);
	world.setMood(night ? 1 : 0, night ? 1 : 0);
});
$('buff').addEventListener('click', () => {
	buffed = !buffed;
	toggle('buff', buffed);
});
$('stop').addEventListener('click', () => {
	stopped = !stopped;
	toggle('stop', stopped);
});
$('pill').addEventListener('click', () => ms.trigger('energizer'));
$('ghost').addEventListener('click', () => ms.trigger('ghost-eaten'));
$('tele').addEventListener('click', () => {
	along += perimeter / 2;
	ms.trigger('teleport');
});
$('die').addEventListener('click', () => {
	if (dyingFor < 0) dyingFor = 0;
});

let time = 0;
let last = performance.now();
let lastTile = '';
function frame(now: number): void {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	time += dt;
	if (dyingFor >= 0) {
		dyingFor += dt;
		if (dyingFor > 2.6) {
			dyingFor = -1;
			invulnerableFor = 2;
		}
	} else if (!stopped) {
		along += SPEED * dt;
	}
	invulnerableFor = Math.max(0, invulnerableFor - dt);
	const p = onLoop(along);
	player.position = { x: p.x, y: p.y };
	player.facing = p.facing;
	player.isInvulnerable = invulnerableFor > 0;
	const tile = `${Math.floor(p.x)},${Math.floor(p.y)}`;
	if (tile !== lastTile && dyingFor < 0 && !stopped) {
		lastTile = tile;
		ms.trigger('dot');
	}

	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => false);
	const L = world.layout;
	ms.draw(ctx, player as unknown as PlayerService, L, time, {
		look: buffed ? 'energized' : 'normal',
		charge: 0,
		dying: dyingFor >= 0
	});
	world.drawOverlay(ctx);

	// close-up: the area around her, magnified, in a frame on the right
	const box = Math.min(vw * 0.3, vh * 0.42);
	const src = box / ZOOM;
	const cx = (L.offsetX + p.x * L.tileSize) * D;
	const cy = (L.offsetY + p.y * L.tileSize) * D;
	const bx = vw - box - 18;
	const by = 70;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.imageSmoothingEnabled = true;
	ctx.drawImage(view, cx - (src * D) / 2, cy - (src * D) / 2, src * D, src * D, bx * D, by * D, box * D, box * D);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.strokeStyle = 'rgba(255,255,255,.9)';
	ctx.lineWidth = 2;
	ctx.strokeRect(bx, by, box, box);
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
(window as unknown as { ms: unknown }).ms = {
	buff: () => $('buff').click(),
	die: () => $('die').click(),
	stop: () => $('stop').click(),
	season: (s: Season) => {
		season = s;
		buildWorld();
	}
};
requestAnimationFrame(frame);
