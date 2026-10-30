// Prototype: Pac-Man ("Solar Flare") and Ms. Pac-Man ("Stardust Heart") as baked sprites
// (src/games/pacman/render/actors/sprite). Left: both large, circling on a dark panel. Right:
// both running loops in the summer maze at game scale, eating a dot on every tile. Buttons:
// the energizer (6 s, the last 1.6 s blink), eating a ghost, a teleport, death (revives).
// ?capture: no real-time loop; window.__advance(seconds) steps 1/60 s frames, for stills.
import { GRID_01 } from '../../../src/games/pacman/config/gridConfig';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import type {
	CharacterSprite,
	SpriteEvent
} from '../../../src/games/pacman/render/actors/sprite/CharacterSprite';
import { SolarPacmanSprite } from '../../../src/games/pacman/render/actors/sprite/SolarPacmanSprite';
import { StardustMsPacmanSprite } from '../../../src/games/pacman/render/actors/sprite/StardustMsPacmanSprite';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

const POWER_TIME = 6;
const POWER_ENDING = 1.6;
const SPEED = 5.2; // tiles per second
const DEATH_TIME = 2.6;

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
	readonly sprite: CharacterSprite;
	along: number;
	lastTile: number;
}

const maze: Runner[] = [
	{ sprite: new SolarPacmanSprite(), along: 0, lastTile: 0 },
	{ sprite: new StardustMsPacmanSprite(), along: 7, lastTile: 7 }
];
const big: CharacterSprite[] = [new SolarPacmanSprite(), new StardustMsPacmanSprite()];
const all = [...maze.map((m) => m.sprite), ...big];

let world: MeadowWorld;
let vw = 0;
let vh = 0;
let panelW = 0;
let stopped = false;
let powerTimer = 0;
let deathTimer = -1;
let bigPhase = 0;

function buildWorld(): void {
	world = new MeadowWorld(GRID_01, meadowThemeFor('summer') as MeadowTheme);
	world.resize(vw - panelW, vh, D);
	for (let i = 0; i < 80; i++) world.update(0.1);
}

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	panelW = Math.round(Math.min(560, vw * 0.4));
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	buildWorld();
	const S = world.layout.tileSize;
	for (const m of maze) m.sprite.setSize(S * 0.44, D);
	for (const b of big) b.setSize(Math.min(panelW * 0.11, vh * 0.08), D);
	for (const s of all) s.reset();
}

const send = (e: SpriteEvent) => {
	for (const s of all) s.trigger(e);
};
$('power').addEventListener('click', () => {
	powerTimer = POWER_TIME;
	send('energizer');
});
$('ghost').addEventListener('click', () => send('ghost'));
$('tele').addEventListener('click', () => {
	for (const m of maze) m.along += 9;
	bigPhase += Math.PI;
	stepAll(0, true);
	send('teleport');
});
$('die').addEventListener('click', () => {
	if (deathTimer < 0) {
		deathTimer = 0;
		send('death');
	}
});
$('stop').addEventListener('click', () => {
	stopped = !stopped;
	$('stop').setAttribute('aria-pressed', String(stopped));
});

/** Moves everyone by `dt` (0 just re-places them, e.g. after a teleport). */
function stepAll(dt: number, placeOnly = false): void {
	const frozen = stopped || deathTimer >= 0;
	const move = frozen ? 0 : dt;
	const power = powerTimer > 0;
	const ending = powerTimer > 0 && powerTimer < POWER_ENDING;
	const L = world.layout;
	const S = L.tileSize;
	for (const m of maze) {
		m.along += SPEED * move;
		const p = onLoop(LOOPS[maze.indexOf(m)], m.along);
		m.sprite.update(placeOnly ? 0 : dt, {
			x: panelW + L.offsetX + p.x * S,
			y: L.offsetY + p.y * S,
			angle: p.angle,
			moving: !frozen,
			power,
			ending
		});
		const tile = Math.floor(m.along);
		if (!placeOnly && tile !== m.lastTile) {
			m.lastTile = tile;
			m.sprite.trigger('dot');
		}
	}
	bigPhase += 2.0 * move;
	big.forEach((b, i) => {
		const ph = bigPhase + i * 1.3;
		const rx = panelW * 0.26;
		const ry = vh * 0.09;
		b.update(placeOnly ? 0 : dt, {
			x: panelW / 2 + Math.cos(ph) * rx,
			y: vh * (i === 0 ? 0.3 : 0.7) + Math.sin(ph) * ry,
			angle: Math.atan2(Math.cos(ph) * ry, -Math.sin(ph) * rx),
			moving: !frozen,
			power,
			ending
		});
	});
}

function frame(dt: number): void {
	powerTimer = Math.max(0, powerTimer - dt);
	if (deathTimer >= 0) {
		deathTimer += dt;
		if (deathTimer > DEATH_TIME) {
			deathTimer = -1;
			send('revive');
		}
	}
	world.update(dt);
	stepAll(dt);

	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.save();
	ctx.translate(panelW, 0);
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => true);
	ctx.restore();
	const g = ctx.createLinearGradient(0, 0, 0, vh);
	g.addColorStop(0, '#141826');
	g.addColorStop(1, '#07080e');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, panelW, vh);
	ctx.fillStyle = 'rgba(210,220,235,.7)';
	ctx.font = '12px "Courier New", monospace';
	ctx.textAlign = 'center';
	ctx.fillText('PAC-MAN · SOLAR FLARE', panelW / 2, vh * 0.47);
	ctx.fillText('MS. PAC-MAN · STARDUST HEART', panelW / 2, vh * 0.87);
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, 0, panelW, vh);
	ctx.clip();
	for (const b of big) b.draw(ctx);
	ctx.restore();
	ctx.save();
	ctx.beginPath();
	ctx.rect(panelW, 0, vw - panelW, vh);
	ctx.clip();
	for (const m of maze) m.sprite.draw(ctx);
	ctx.translate(panelW, 0);
	world.drawOverlay(ctx);
	ctx.restore();
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
		frame(Math.min(0.1, (now - last) / 1000));
		last = now;
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
