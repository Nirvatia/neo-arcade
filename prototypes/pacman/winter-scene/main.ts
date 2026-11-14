// Prototype for part I, season scenes: winter as a New Year place. The real winter maze and the
// game's atmosphere, with code-drawn corridor snow, wall garlands and a lit fir tree behind the
// board. The page has the three states the owner reviews: day, snowfall and New Year night.
import { seasonForLevel } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { glowTexture } from '../../../src/games/pacman/render/seasons/meadow/meadowSprites';

type State = 'day' | 'storm' | 'night';

const q = new URLSearchParams(location.search);
const state = (q.get('s') as State | null) ?? 'day';
const winter = seasonForLevel(3);
const theme = meadowThemeFor(winter.name);
if (!theme) {
	throw new Error('winter theme is missing');
}
const world = new MeadowWorld(winter.grid, theme);
world.setQuality('high');
const hero = new PacmanHero();
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const rows = winter.grid.length;
const cols = winter.grid[0]?.length ?? 0;
const LIGHT_COLORS = ['#ff4d55', '#ffd45c', '#62e6ff', '#7dff87', '#ff8bd1'] as const;

function hash(x: number, y: number, salt: number): number {
	let n = (x * 374761393 + y * 668265263 + salt * 974634) | 0;
	n = Math.imul(n ^ (n >>> 13), 1274126177);
	return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function boardSpace(layout: GridLayout, draw: () => void): void {
	ctx.save();
	ctx.translate(layout.offsetX, layout.offsetY);
	ctx.scale(layout.tileSize, layout.tileSize);
	draw();
	ctx.restore();
}

/** Utóптанный снег внутри коридоров: маленькие пятна только на поверхности пути. */
function drawCorridorSnow(layout: GridLayout): void {
	boardSpace(layout, () => {
		for (let y = 0; y < rows; y += 1) {
			for (let x = 0; x < cols; x += 1) {
				const token = winter.grid[y]?.[x];
				if (token !== 'DT' && token !== 'EU' && token !== 'PM') {
					continue;
				}
				for (let i = 0; i < 3; i += 1) {
					const px = x + 0.18 + hash(x, y, i) * 0.64;
					const py = y + 0.2 + hash(y, x, i + 9) * 0.6;
					ctx.globalAlpha = 0.18 + hash(x, y, i + 20) * 0.14;
					ctx.fillStyle = '#f4fbff';
					ctx.beginPath();
					ctx.ellipse(px, py, 0.13 + hash(x, y, i + 40) * 0.1, 0.06, hash(x, y, i) * 3, 0, 7);
					ctx.fill();
				}
			}
		}
		ctx.globalAlpha = 1;
	});
}

/** Гирлянды лежат на верхней поверхности горизонтальных стен и не вылезают в коридор. */
function drawWallGarlands(layout: GridLayout, night: number, time: number): void {
	boardSpace(layout, () => {
		for (let y = 1; y < rows - 1; y += 1) {
			let x = 1;
			while (x < cols - 1) {
				if (winter.grid[y]?.[x] !== 'WL') {
					x += 1;
					continue;
				}
				const start = x;
				while (x < cols - 1 && winter.grid[y]?.[x] === 'WL') {
					x += 1;
				}
				const len = x - start;
				if (len < 3 || hash(start, y, 3) > 0.84) {
					continue;
				}
				const gy = y + 0.34;
				ctx.strokeStyle = 'rgba(22,83,52,.95)';
				ctx.lineWidth = 0.034;
				ctx.beginPath();
				ctx.moveTo(start + 0.1, gy);
				for (let bx = start + 0.45; bx < x - 0.1; bx += 0.4) {
					ctx.quadraticCurveTo(bx - 0.2, gy + 0.11, bx, gy);
				}
				ctx.stroke();

				let bulb = 0;
				for (let bx = start + 0.32; bx < x - 0.16; bx += 0.58) {
					const sag = Math.sin((bx - start) * Math.PI * 2) * 0.045;
					const by = gy + sag;
					const color = LIGHT_COLORS[(bulb + start + y) % LIGHT_COLORS.length];
					const glow = 0.22 + night * 0.18 + Math.sin(time * 3 + bulb + start) * night * 0.035;
					ctx.globalCompositeOperation = 'lighter';
					ctx.globalAlpha = Math.max(0, glow);
					ctx.drawImage(glowTexture(0xffffff), bx - 0.24, by - 0.24, 0.48, 0.48);
					ctx.globalCompositeOperation = 'source-over';
					ctx.globalAlpha = 1;
					ctx.fillStyle = color;
					ctx.beginPath();
					ctx.arc(bx, by, 0.075, 0, 7);
					ctx.fill();
					ctx.fillStyle = 'rgba(255,255,255,.85)';
					ctx.beginPath();
					ctx.arc(bx - 0.022, by - 0.025, 0.022, 0, 7);
					ctx.fill();
					bulb += 1;
				}
			}
		}
	});
}

const TREE_LIGHTS = [
	[-0.8, -2.2],
	[0.55, -2.55],
	[-1.2, -3.75],
	[0.9, -4.05],
	[-0.45, -5.0],
	[0.25, -5.55],
	[0.0, -6.45],
	[-1.65, -2.75],
	[1.45, -3.15],
	[-0.1, -3.25],
	[1.05, -4.8],
	[-0.95, -4.65]
] as const;

function branchPath(w: number, top: number, bottom: number): void {
	ctx.beginPath();
	ctx.moveTo(0, top);
	ctx.quadraticCurveTo(-w * 0.28, top + (bottom - top) * 0.25, -w, bottom);
	ctx.quadraticCurveTo(-w * 0.45, bottom - 0.16, 0, bottom - 0.12);
	ctx.quadraticCurveTo(w * 0.45, bottom - 0.16, w, bottom);
	ctx.quadraticCurveTo(w * 0.28, top + (bottom - top) * 0.25, 0, top);
	ctx.closePath();
}

/** Елка стоит на земле за пределами поля, поэтому ширина коридоров не меняется. */
function drawTree(layout: GridLayout, time: number): void {
	boardSpace(layout, () => {
		const x = cols + 3.7;
		const y = rows * 0.54;
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(1.42, 1.42);
		ctx.globalAlpha = 1;

		ctx.fillStyle = 'rgba(235,246,255,.72)';
		ctx.beginPath();
		ctx.ellipse(0, 0.22, 2.5, 0.55, 0, 0, 7);
		ctx.fill();
		ctx.fillStyle = '#6b4328';
		ctx.fillRect(-0.32, -1.1, 0.64, 1.35);

		const layers = [
			{ w: 2.35, top: -2.1, bottom: -1.15 },
			{ w: 1.95, top: -3.45, bottom: -2.25 },
			{ w: 1.48, top: -4.75, bottom: -3.55 },
			{ w: 0.95, top: -6.0, bottom: -4.8 }
		];
		for (const [i, layer] of layers.entries()) {
			ctx.fillStyle = i % 2 ? '#1f6046' : '#1a513d';
			branchPath(layer.w, layer.top, layer.bottom);
			ctx.fill();
			ctx.strokeStyle = 'rgba(244,251,255,.88)';
			ctx.lineWidth = 0.08;
			ctx.beginPath();
			ctx.moveTo(-layer.w * 0.86, layer.bottom - 0.1);
			ctx.quadraticCurveTo(0, layer.bottom - 0.34, layer.w * 0.86, layer.bottom - 0.1);
			ctx.stroke();
		}

		ctx.save();
		ctx.translate(0, -6.22);
		ctx.rotate(Math.sin(time * 0.7) * 0.04);
		ctx.fillStyle = '#ffd85c';
		ctx.beginPath();
		for (let i = 0; i < 10; i += 1) {
			const a = -Math.PI / 2 + (i * Math.PI) / 5;
			const r = i % 2 ? 0.18 : 0.42;
			const px = Math.cos(a) * r;
			const py = Math.sin(a) * r;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.fill();
		ctx.restore();

		for (const [i, p] of TREE_LIGHTS.entries()) {
			ctx.fillStyle = LIGHT_COLORS[i % LIGHT_COLORS.length];
			ctx.beginPath();
			ctx.arc(p[0], p[1] + Math.sin(time * 1.4 + i) * 0.025, 0.085, 0, 7);
			ctx.fill();
		}

		for (const [gx, hue] of [
			[-1.35, '#d93b45'],
			[0.9, '#3b8ed9'],
			[-0.25, '#e6b13d']
		] as const) {
			ctx.fillStyle = hue;
			ctx.fillRect(gx - 0.32, -0.36, 0.64, 0.5);
			ctx.strokeStyle = 'rgba(255,255,255,.65)';
			ctx.lineWidth = 0.045;
			ctx.beginPath();
			ctx.moveTo(gx, -0.36);
			ctx.lineTo(gx, 0.14);
			ctx.moveTo(gx - 0.32, -0.11);
			ctx.lineTo(gx + 0.32, -0.11);
			ctx.stroke();
		}
		ctx.restore();
	});
}

function drawTreeLights(layout: GridLayout, night: number, time: number): void {
	boardSpace(layout, () => {
		const x = cols + 3.7;
		const y = rows * 0.54;
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(1.42, 1.42);
		ctx.globalCompositeOperation = 'lighter';
		for (const [i, p] of TREE_LIGHTS.entries()) {
			const pulse = 0.55 + 0.18 * Math.sin(time * 2.2 + i * 1.7);
			const alpha = 0.08 + night * pulse;
			const r = 0.5 + night * 0.25;
			ctx.globalAlpha = alpha;
			ctx.drawImage(glowTexture(0xffffff), p[0] - r, p[1] - r, r * 2, r * 2);
		}
		ctx.restore();
	});
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 1;
}

function setState(next: State): void {
	world.setMood(next === 'storm', next === 'night');
	for (const b of document.querySelectorAll<HTMLButtonElement>('#bar button')) {
		b.setAttribute('aria-pressed', String(b.dataset.s === next));
	}
}
for (const b of document.querySelectorAll<HTMLButtonElement>('#bar button')) {
	b.addEventListener('click', () => setState(b.dataset.s as State));
}

function layout(): void {
	const w = view.clientWidth;
	const h = view.clientHeight;
	view.width = Math.max(1, Math.round(w * D));
	view.height = Math.max(1, Math.round(h * D));
	world.resize(w, h, D);
}
window.addEventListener('resize', layout);
layout();
setState(state);

/** The hero walks the clear top corridor so the decor can be judged at game scale. */
function walker(time: number): { x: number; dir: 1 | -1 } {
	const span = 18;
	const u = (time * 4.2) % (2 * span);
	return u < span ? { x: 3.5 + u, dir: 1 } : { x: 3.5 + 2 * span - u, dir: -1 };
}

let last = performance.now();
function frame(nowMs: number): void {
	const dt = Math.min(0.1, Math.max(0, (nowMs - last) / 1000));
	last = nowMs;
	const time = nowMs / 1000;
	const w = view.clientWidth;
	const h = view.clientHeight;
	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.clearRect(0, 0, w, h);

	world.drawWorld(ctx);
	const layoutNow = world.layout;
	drawCorridorSnow(layoutNow);
	drawWallGarlands(layoutNow, state === 'night' ? 1 : 0, time);
	drawTree(layoutNow, time);
	world.drawMood(ctx);
	drawTreeLights(layoutNow, state === 'night' ? 1 : 0, time);
	world.drawFood(ctx, () => false);

	const walk = walker(time);
	const S = layoutNow.tileSize;
	hero.setRadius(S * 0.39);
	hero.update(dt, {
		x: layoutNow.offsetX + walk.x * S,
		y: layoutNow.offsetY + 2.5 * S,
		angle: walk.dir > 0 ? 0 : Math.PI,
		moving: true,
		power: false,
		ending: false,
		season: 'winter'
	});
	hero.draw(ctx);
	world.drawOverlay(ctx);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
