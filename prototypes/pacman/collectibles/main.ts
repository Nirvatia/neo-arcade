// Prototype: the collectibles (cherry, apple, Galaxian, bell, bonus life) drawn by the game's
// own views on a real season: in a corridor at game scale, a 4× close-up of that corridor,
// and large on a dark strip the way the mock-ups show them.
import { GRID_01 } from '../../../src/games/pacman/config/gridConfig';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { drawFruit, FRUIT_EXTENT } from '../../../src/games/pacman/render/items/fruit/FruitView';
import { drawBonusLife } from '../../../src/games/pacman/render/items/BonusLifeView';
import { FRUIT } from '../../../src/games/pacman/logic/bonuses/fruitCatalog';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const ZOOM = 4;

type Item = (c: CanvasRenderingContext2D, x: number, y: number, tile: number, t: number) => void;
const fruit =
	(kind: (typeof FRUIT)[keyof typeof FRUIT]): Item =>
	(c, x, y, tile, t) =>
		drawFruit(c, kind, x, y, tile, t);
const ITEMS: Array<{ name: string; draw: Item }> = [
	{ name: 'Cherry', draw: fruit(FRUIT.CHERRY) },
	{ name: 'Apple', draw: fruit(FRUIT.APPLE) },
	{ name: 'Galaxian', draw: fruit(FRUIT.GALAXIAN) },
	{ name: 'Bell', draw: fruit(FRUIT.BELL) },
	{ name: 'Bonus life', draw: (c, x, y, tile, t) => drawBonusLife(c, x, y, tile * FRUIT_EXTENT, t) }
];
/** Corridor tiles of GRID_01 (row 5, columns 14..22). */
const SPOTS: ReadonlyArray<[number, number]> = [
	[14, 5],
	[16, 5],
	[18, 5],
	[20, 5],
	[22, 5]
];

let season: Season = 'spring';
let world: MeadowWorld;
let night = false;
let blink = false;
let vw = 0;
let vh = 0;

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

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		buildWorld();
	});
}
$('night').addEventListener('click', () => {
	night = !night;
	$('night').setAttribute('aria-pressed', String(night));
	world.setMood(night ? 1 : 0, night ? 1 : 0);
});
$('blink').addEventListener('click', () => {
	blink = !blink;
	$('blink').setAttribute('aria-pressed', String(blink));
});

let time = 0;
let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	time += dt;
	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	world.drawWorld(ctx, () => false);
	world.drawMood(ctx);
	const L = world.layout;
	const S = L.tileSize;
	// the game's blink while the fruit timer runs out
	const hidden = blink && Math.floor(time * 4) % 2 === 0;
	ITEMS.forEach((item, i) => {
		const [tx, ty] = SPOTS[i];
		ctx.save();
		ctx.globalAlpha = hidden ? 0.45 : 1;
		item.draw(ctx, L.offsetX + (tx + 0.5) * S, L.offsetY + (ty + 0.5) * S, S, time);
		ctx.restore();
	});
	world.drawOverlay(ctx);

	// 4× close-up of the corridor
	const [ax] = SPOTS[0];
	const [bx] = SPOTS[SPOTS.length - 1];
	const srcW = (bx - ax + 2) * S;
	const srcH = 2.2 * S;
	const boxW = Math.min(vw - 36, srcW * ZOOM);
	const boxH = (boxW / srcW) * srcH;
	const sx = (L.offsetX + ax * S - S * 0.5) * D;
	const sy = (L.offsetY + (SPOTS[0][1] + 0.5) * S - srcH / 2) * D;
	const px = (vw - boxW) / 2;
	const py = vh - boxH - 90;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.imageSmoothingEnabled = true;
	ctx.drawImage(view, sx, sy, srcW * D, srcH * D, px * D, py * D, boxW * D, boxH * D);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.strokeStyle = 'rgba(255,255,255,.9)';
	ctx.lineWidth = 2;
	ctx.strokeRect(px, py, boxW, boxH);

	// large, on the mock-ups' dark background
	const cell = Math.min(150, (vw - 36) / ITEMS.length);
	const stripW = cell * ITEMS.length;
	const stripX = (vw - stripW) / 2;
	const stripY = 14;
	ctx.fillStyle = '#06080e';
	ctx.fillRect(stripX, stripY, stripW, cell + 22);
	ITEMS.forEach((item, i) => {
		item.draw(ctx, stripX + cell * (i + 0.5), stripY + cell / 2 + 4, cell * 0.62, time);
		ctx.fillStyle = 'rgba(200,212,224,.75)';
		ctx.font = '11px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(item.name.toUpperCase(), stripX + cell * (i + 0.5), stripY + cell + 14);
	});
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
