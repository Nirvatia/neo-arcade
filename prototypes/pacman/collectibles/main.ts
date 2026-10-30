// Prototype: the collectibles (cherry, apple, Galaxian, bell, bonus life) drawn by the game's
// own views on a real season: in a corridor at game scale, a 4× close-up of that corridor,
// and large on a dark strip the way the mock-ups show them. Under each item: how far it
// reaches from its tile centre, glow and animation included (stage 10.1: at most 0.5 tile).
import { GRID_01 } from '../../../src/games/pacman/config/gridConfig';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { drawFruit } from '../../../src/games/pacman/render/items/fruit/FruitView';
import { drawBonusLife } from '../../../src/games/pacman/render/items/BonusLifeView';
import { drawExit } from '../../../src/games/pacman/render/items/ExitView';
import { FRUIT } from '../../../src/games/pacman/logic/bonuses/fruitCatalog';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const ZOOM = 4; // at most; shrinks to fit the screen

type Item = (c: CanvasRenderingContext2D, x: number, y: number, tile: number, t: number) => void;
const fruit =
	(kind: (typeof FRUIT)[keyof typeof FRUIT]): Item =>
	(c, x, y, tile, t) =>
		drawFruit(c, kind, x, y, tile, t);
const ITEMS: Array<{ name: string; draw: Item }> = [
	{ name: 'Cherry', draw: fruit(FRUIT.CHERRY) },
	{ name: 'Strawberry', draw: fruit(FRUIT.STRAWBERRY) },
	{ name: 'Orange', draw: fruit(FRUIT.ORANGE) },
	{ name: 'Pretzel', draw: fruit(FRUIT.PRETZEL) },
	{ name: 'Apple', draw: fruit(FRUIT.APPLE) },
	{ name: 'Pear', draw: fruit(FRUIT.PEAR) },
	{ name: 'Melon', draw: fruit(FRUIT.MELON) },
	{ name: 'Galaxian', draw: fruit(FRUIT.GALAXIAN) },
	{ name: 'Bell', draw: fruit(FRUIT.BELL) },
	{ name: 'Key', draw: fruit(FRUIT.KEY) },
	{ name: 'Bonus life', draw: drawBonusLife },
	{ name: 'Exit', draw: drawExit }
];
/** Corridor tiles of GRID_01: rows 5 and 2, columns 12..23, one item every other tile. */
const SPOTS: ReadonlyArray<[number, number]> = Array.from({ length: 12 }, (_, i) => [
	i < 6 ? 12 + i * 2 : 13 + (i - 6) * 2,
	i < 6 ? 5 : 2
]);

let season: Season = 'spring';
let world: MeadowWorld;
let night = false;
let heat = false;
let blink = false;
let grid = false;
let vw = 0;
let vh = 0;

function buildWorld(): void {
	world = new MeadowWorld(GRID_01, meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	world.setMood(heat ? 1 : 0, night ? 1 : 0);
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
	world.setMood(heat ? 1 : 0, night ? 1 : 0);
});
// the season's weather: heat in summer, wind, snow or rain in the others
$('heat').addEventListener('click', () => {
	heat = !heat;
	$('heat').setAttribute('aria-pressed', String(heat));
	world.setMood(heat ? 1 : 0, night ? 1 : 0);
});
$('blink').addEventListener('click', () => {
	blink = !blink;
	$('blink').setAttribute('aria-pressed', String(blink));
});

$('grid').addEventListener('click', () => {
	grid = !grid;
	$('grid').setAttribute('aria-pressed', String(grid));
});

/** The farthest visible pixel (alpha > 10) from the tile centre over a few seconds, in tiles. */
function reach(item: Item): number {
	const T = 100;
	const c = document.createElement('canvas');
	c.width = c.height = 4 * T;
	const x = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
	const mid = 2 * T;
	let far = 0;
	for (let t = 0; t < 6; t += 0.2) {
		x.clearRect(0, 0, c.width, c.height);
		item.draw(x, mid, mid, T, t);
		const d = x.getImageData(0, 0, c.width, c.height).data;
		for (let py = 0; py < c.height; py++) {
			for (let px = 0; px < c.width; px++) {
				if (d[(py * c.width + px) * 4 + 3] > 10) {
					far = Math.max(far, Math.abs(px + 0.5 - mid), Math.abs(py + 0.5 - mid));
				}
			}
		}
	}
	return far / T;
}
const REACH = ITEMS.map(reach);

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
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => false);
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
	if (grid) {
		ctx.strokeStyle = 'rgba(255,255,255,.35)';
		ctx.lineWidth = 1 / D;
		ctx.beginPath();
		for (let c = 12; c <= 24; c++) {
			ctx.moveTo(L.offsetX + c * S, L.offsetY + S);
			ctx.lineTo(L.offsetX + c * S, L.offsetY + 7 * S);
		}
		for (let r = 1; r <= 7; r++) {
			ctx.moveTo(L.offsetX + 12 * S, L.offsetY + r * S);
			ctx.lineTo(L.offsetX + 24 * S, L.offsetY + r * S);
		}
		ctx.stroke();
	}

	// magnified close-up of the two corridors (columns 12..23, rows 1..6)
	const srcW = 12 * S;
	const srcH = 6 * S;
	const boxW = Math.min(vw - 36, srcW * ZOOM, ((vh - 300) / srcH) * srcW);
	const boxH = (boxW / srcW) * srcH;
	const sx = (L.offsetX + 12 * S) * D;
	const sy = (L.offsetY + 1 * S) * D;
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
	ctx.fillRect(stripX, stripY, stripW, cell + 36);
	ITEMS.forEach((item, i) => {
		item.draw(ctx, stripX + cell * (i + 0.5), stripY + cell / 2 + 4, cell * 0.62, time);
		ctx.fillStyle = 'rgba(200,212,224,.75)';
		ctx.font = '11px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(item.name.toUpperCase(), stripX + cell * (i + 0.5), stripY + cell + 14);
		ctx.fillStyle = REACH[i] > 0.5 ? '#ff6a5a' : '#7be0a0';
		ctx.fillText(`${REACH[i].toFixed(2)} tile`, stripX + cell * (i + 0.5), stripY + cell + 28);
	});
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
