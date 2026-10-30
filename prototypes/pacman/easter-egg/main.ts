// Prototype: the lair code's reward on level 7 (stage 10.2), run by the game's own services
// and views on a real season. "Код логова решён" solves the code: the ghosts vanish, the
// lair gate slides open, the Easter egg appears in the lair's centre and Pac-Man walks in
// to take it; "Заново" starts over. A 3× close-up of the lair, the egg large on a strip.
import { GRID_01 } from '../../../src/games/pacman/config/gridConfig';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { GhostService } from '../../../src/games/pacman/logic/actors/GhostService';
import { LairCodeService } from '../../../src/games/pacman/logic/rules/LairCodeService';
import { EasterEggService } from '../../../src/games/pacman/logic/bonuses/EasterEggService';
import { GhostView } from '../../../src/games/pacman/render/actors/GhostView';
import { PlayerView } from '../../../src/games/pacman/render/actors/PlayerView';
import {
	drawEasterEgg,
	EasterEggView
} from '../../../src/games/pacman/render/items/EasterEggView';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const ZOOM = 3;
const STEPS: ReadonlyArray<[PlayerDirection, number, number]> = [
	['UP', 0, -1],
	['DOWN', 0, 1],
	['LEFT', -1, 0],
	['RIGHT', 1, 0]
];

let season: Season = 'spring';
let world: MeadowWorld;
let night = false;
let vw = 0;
let vh = 0;

const ghostView = new GhostView();
const playerView = new PlayerView();
const eggView = new EasterEggView();

interface Scene {
	grid: GridService;
	progress: LevelProgress;
	player: PlayerService;
	ghosts: GhostService;
	lairCode: LairCodeService;
	egg: EasterEggService;
	solved: boolean;
	doneFor: number;
}
let scene: Scene;

function buildScene(): Scene {
	const grid = new GridService(new GridModel(GRID_01));
	const events = new EventBus<PacmanEventMap>();
	const score = new ScoreModel();
	const progress = new LevelProgress(grid, score, events);
	const player = new PlayerService(grid, progress, events);
	const ghosts = new GhostService(grid, player, progress);
	const lairCode = new LairCodeService(7, events);
	const egg = new EasterEggService(7, grid, ghosts, lairCode, progress, events, score);
	player.reset();
	ghosts.reset();
	return { grid, progress, player, ghosts, lairCode, egg, solved: false, doneFor: -1 };
}

/** The first step of a shortest walkable path from Pac-Man's tile to the goal. */
function stepTowards(goal: { x: number; y: number }): PlayerDirection | null {
	const { grid, player } = scene;
	const start = player.tile;
	if (start.x === goal.x && start.y === goal.y) return null;
	const seen = new Map<string, PlayerDirection>();
	const queue: Array<{ x: number; y: number }> = [];
	for (const [dir, dx, dy] of STEPS) {
		const x = start.x + dx;
		const y = start.y + dy;
		if (grid.isPlayerWalkable(x, y) && !seen.has(`${x},${y}`)) {
			seen.set(`${x},${y}`, dir);
			queue.push({ x, y });
		}
	}
	while (queue.length > 0) {
		const at = queue.shift() as { x: number; y: number };
		const first = seen.get(`${at.x},${at.y}`) as PlayerDirection;
		if (at.x === goal.x && at.y === goal.y) return first;
		for (const [, dx, dy] of STEPS) {
			const x = at.x + dx;
			const y = at.y + dy;
			if (grid.isPlayerWalkable(x, y) && !seen.has(`${x},${y}`)) {
				seen.set(`${x},${y}`, first);
				queue.push({ x, y });
			}
		}
	}
	return null;
}

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
$('solve').addEventListener('click', () => {
	if (scene.solved) return;
	scene.solved = true;
	for (const kind of ['BLINKY', 'PINKY', 'INKY', 'CLYDE'] as const) scene.lairCode.register(kind);
});
$('again').addEventListener('click', () => {
	scene = buildScene();
});

scene = buildScene();
let time = 0;
let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	time += dt;
	const { grid, player, ghosts, lairCode, egg } = scene;

	// the game's order: the code, the lair, the player, the egg, the ghosts
	lairCode.update(dt);
	grid.setLairOpen(egg.lairOpen);
	if (scene.solved) {
		const eggTile = grid.lairEggTile() ?? { x: 12, y: 12 };
		// wait in front of the gate until it is open, then walk in to the egg
		const goal = egg.lairOpen ? eggTile : { x: eggTile.x, y: eggTile.y - 3 };
		const dir = stepTowards(goal);
		if (dir) player.setDesiredDirection(dir);
	}
	player.update(dt);
	egg.update(dt, player);
	ghosts.update(dt);
	if (egg.phase === 'spent') {
		scene.doneFor = scene.doneFor < 0 ? 0 : scene.doneFor + dt;
		if (scene.doneFor > 2) scene = buildScene();
	}
	world.update(dt);

	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	world.setLairGate(egg.doorOpen);
	world.drawWorld(ctx, (x, y) => scene.progress.isCollected(x, y));
	world.drawMood(ctx);
	const L = world.layout;
	const S = L.tileSize;
	eggView.draw(ctx, egg, L, time);
	ghostView.draw(ctx, ghosts, L, 0, false, egg.vanishProgress);
	playerView.draw(ctx, player, L, time);
	world.drawOverlay(ctx);

	// magnified close-up of the lair: columns 7..17, rows 8..16
	const srcW = 11 * S;
	const srcH = 9 * S;
	const boxW = Math.min(vw * 0.45, srcW * ZOOM, ((vh - 260) / srcH) * srcW);
	const boxH = (boxW / srcW) * srcH;
	const sx = (L.offsetX + 7 * S) * D;
	const sy = (L.offsetY + 8 * S) * D;
	const px = vw - boxW - 18;
	const py = 18;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.imageSmoothingEnabled = true;
	ctx.drawImage(view, sx, sy, srcW * D, srcH * D, px * D, py * D, boxW * D, boxH * D);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.strokeStyle = 'rgba(255,255,255,.9)';
	ctx.lineWidth = 2;
	ctx.strokeRect(px, py, boxW, boxH);

	// the egg large, on a dark strip
	const cell = 150;
	ctx.fillStyle = '#06080e';
	ctx.fillRect(18, 18, cell, cell + 22);
	drawEasterEgg(ctx, 18 + cell / 2, 18 + cell / 2 + 4, cell * 0.9, time);
	ctx.fillStyle = 'rgba(200,212,224,.75)';
	ctx.font = '11px "Courier New", monospace';
	ctx.textAlign = 'center';
	ctx.fillText(`EASTER EGG · ${egg.phase.toUpperCase()}`, 18 + cell / 2, 18 + cell + 14);
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
