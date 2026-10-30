// Prototype for plan v2 stage 3 (hell rework), built from the game's sources.
// Gallery: Blinky, lord of hell (phases, states, echo), his imps, the berserk fist, large on
// a dark strip, at game scale on the hell maze and magnified. Fight: the real boss logic
// against Pac-Man on the arrow keys, to try the aimed seals and the new eruption.
import { GRID_DOOM } from '../../../src/games/pacman/config/gridConfig';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { DoomBossService } from '../../../src/games/pacman/logic/doom/DoomBossService';
import { DoomAbilityService } from '../../../src/games/pacman/logic/doom/DoomAbilityService';
import type { DoomAttackKind } from '../../../src/games/pacman/logic/doom/DoomAttackCore';
import type { DoomDirection } from '../../../src/games/pacman/logic/doom/DoomGraph';
import type { DoomStateName, DoomShape } from '../../../src/games/pacman/logic/doom/DoomBossModel';
import type { DoomMinionKind } from '../../../src/games/pacman/logic/doom/DoomMinions';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import type { DoomLight } from '../../../src/games/pacman/render/doom/DoomWorld';
import { DoomCombatView } from '../../../src/games/pacman/render/doom/DoomCombatView';
import { DoomFxView } from '../../../src/games/pacman/render/doom/DoomFxView';
import { DOOM_TILE } from '../../../src/games/pacman/render/doom/DoomBake';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import type { BossSnapshot } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { drawImp } from '../../../src/games/pacman/render/doom/HellImpView';
import { glowTexture, pickupSprite } from '../../../src/games/pacman/render/doom/DoomSprites';
import { PlayerView } from '../../../src/games/pacman/render/actors/PlayerView';
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';

type Pose = 'chase' | 'windup' | 'dash' | 'cast' | 'stunned' | 'hit';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

let mode: 'gallery' | 'fight' = 'gallery';
let phase = 1;
let pose: Pose = 'chase';
let vw = 0;
let vh = 0;
const world = new DoomWorld(GRID_DOOM, [
	{ x: 4, y: 7 },
	{ x: 18, y: 7 },
	{ x: 20, y: 7 }
]);
const bossView = new HellBlinkyView();
const echoView = new HellBlinkyView();
const combat = new DoomCombatView();
const fx = new DoomFxView();
const playerView = new PlayerView();

function poseState(p: Pose): { state: DoomStateName; shape: DoomShape; progress: number } {
	switch (p) {
		case 'windup':
			return { state: 'TELEGRAPH', shape: 'normal', progress: 0.7 };
		case 'dash':
			return { state: 'ACTIVE', shape: 'wedge', progress: 1 };
		case 'cast':
			return { state: 'ACTIVE', shape: 'cast', progress: 1 };
		case 'stunned':
			return { state: 'STUNNED', shape: 'stunned', progress: 0 };
		default:
			return { state: 'CHASE', shape: 'normal', progress: 0 };
	}
}

function snapshot(
	x: number,
	y: number,
	ph: number,
	p: Pose,
	dir: DoomDirection,
	time: number,
	echo = false
): BossSnapshot {
	const s = poseState(p);
	return {
		x,
		y,
		phase: ph,
		state: s.state,
		shape: s.shape,
		dir,
		progress: p === 'windup' ? (time * 0.8) % 1 : s.progress,
		alpha: 1,
		intro: 1,
		look: Math.PI / 2,
		hit: p === 'hit' ? Math.max(0, 1 - ((time * 2) % 1) * 3) : 0,
		echo
	};
}

/** Back and forth between two tiles of one row; returns tile-center x and the heading. */
function patrol(x0: number, x1: number, speed: number, time: number, offset = 0) {
	const span = x1 - x0;
	const u = ((time * speed) / span + offset) % 2;
	const forward = u < 1;
	return { x: x0 + 0.5 + span * (forward ? u : 2 - u), dir: (forward ? 'RIGHT' : 'LEFT') as DoomDirection };
}

const at = (cx: number, cy: number, tile: number): GridLayout => ({
	tileSize: tile,
	offsetX: cx - tile / 2,
	offsetY: cy - tile / 2
});

function drawFist(c: CanvasRenderingContext2D, x: number, y: number, tile: number, time: number): void {
	const sprite = pickupSprite('berserk');
	const u = tile / DOOM_TILE;
	const glow = ((64 * 0.95) / 3) * u;
	c.save();
	c.translate(x, y);
	c.scale(1 + 0.05 * Math.sin(time * 2.6), 1 + 0.05 * Math.sin(time * 2.6));
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.7;
	c.drawImage(glowTexture(sprite.glow), -glow / 2, -glow / 2, glow, glow);
	c.globalCompositeOperation = 'source-over';
	c.globalAlpha = 1;
	c.rotate(Math.sin(time * 2) * 0.1);
	c.drawImage(sprite.icon, -13 * u, -13 * u, 26 * u, 26 * u);
	c.restore();
}

function drawPickupIcon(
	c: CanvasRenderingContext2D,
	kind: 'medkit' | 'bfg',
	x: number,
	y: number,
	tile: number
): void {
	const u = tile / DOOM_TILE;
	const sprite = pickupSprite(kind);
	const glow = ((64 * 0.95) / 3) * u;
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.7;
	c.drawImage(glowTexture(sprite.glow), x - glow / 2, y - glow / 2, glow, glow);
	c.globalCompositeOperation = 'source-over';
	c.globalAlpha = 1;
	c.drawImage(sprite.icon, x - 13 * u, y - 13 * u, 26 * u, 26 * u);
	c.restore();
}

// ---------- gallery ----------

function gallery(time: number): void {
	world.setMood(phase >= 2, phase >= 3);
	world.drawWorld(ctx);
	world.drawMood(ctx, []);
	const L = world.layout;
	const S = L.tileSize;
	const speed = pose === 'dash' ? 8 : pose === 'chase' ? 3 : 0;
	const walk = patrol(6, 16, speed || 0.0001, time);
	const bx = speed ? walk.x : 11.5;
	bossView.draw(ctx, snapshot(bx, 5.5, phase, pose, speed ? walk.dir : 'DOWN', time), L, time);
	if (phase >= 3) {
		const e = patrol(2, 22, 5, time, 0.5);
		echoView.draw(ctx, snapshot(e.x, 23.5, 3, 'chase', e.dir, time, true), L, time);
	}
	const kinds: DoomMinionKind[] = ['pinky', 'inky', 'clyde'];
	kinds.forEach((kind, i) => {
		const m = patrol(2, 11, 4, time, i * 0.6);
		const px = L.offsetX + m.x * S;
		const py = L.offsetY + (17.5 + (i === 2 ? 0 : 0)) * S;
		if (i < 2) {
			drawImp(ctx, kind, px, py + (i === 1 ? 4 * S : 0), S, m.dir, time, 1);
		} else {
			const v = patrol(12, 21, 4, time, 0.3);
			drawImp(ctx, kind, L.offsetX + v.x * S, L.offsetY + 17.5 * S, S, v.dir, time, 1);
		}
	});
	drawFist(ctx, L.offsetX + 4.5 * S, L.offsetY + 7.5 * S, S, time);
	drawPickupIcon(ctx, 'medkit', L.offsetX + 18.5 * S, L.offsetY + 7.5 * S, S);
	drawPickupIcon(ctx, 'bfg', L.offsetX + 20.5 * S, L.offsetY + 7.5 * S, S);
	world.drawOverlay(ctx);

	// magnified close-up: rows 4..8 (the boss's corridor and the pickups)
	const srcW = 21 * S;
	const srcH = 5 * S;
	const boxW = Math.min(vw - 32, srcW * 4, ((vh * 0.36) / srcH) * srcW);
	const boxH = (boxW / srcW) * srcH;
	const px = (vw - boxW) / 2;
	const py = vh - boxH - 96;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.drawImage(
		view,
		(L.offsetX + 2 * S) * D,
		(L.offsetY + 4 * S) * D,
		srcW * D,
		srcH * D,
		px * D,
		py * D,
		boxW * D,
		boxH * D
	);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.strokeStyle = 'rgba(255,200,170,.85)';
	ctx.lineWidth = 2;
	ctx.strokeRect(px, py, boxW, boxH);

	// large, on a dark strip: every phase, the chosen pose, the echo, the imps, the fist
	const items: Array<{ name: string; draw: (cx: number, cy: number, t: number) => void }> = [
		...[1, 2, 3].map((ph) => ({
			name: `phase ${ph}`,
			draw: (cx: number, cy: number, t: number) =>
				bossView.draw(ctx, snapshot(0.5, 0.5, ph, pose, 'RIGHT', time), at(cx, cy, t), time)
		})),
		{
			name: 'echo',
			draw: (cx, cy, t) =>
				echoView.draw(ctx, snapshot(0.5, 0.5, 3, pose, 'LEFT', time, true), at(cx, cy, t), time)
		},
		...kinds.map((kind, i) => ({
			name: kind,
			draw: (cx: number, cy: number, t: number) =>
				drawImp(ctx, kind, cx, cy, t, (['UP', 'LEFT', 'DOWN'] as const)[i], time, 1)
		})),
		{ name: 'berserk', draw: (cx, cy, t) => drawFist(ctx, cx, cy, t, time) }
	];
	const cell = Math.min(140, (vw - 32) / items.length);
	const stripW = cell * items.length;
	const sx = (vw - stripW) / 2;
	const sy = 12;
	ctx.fillStyle = '#0a0606';
	ctx.fillRect(sx, sy, stripW, cell + 20);
	items.forEach((item, i) => {
		const cx = sx + cell * (i + 0.5);
		const cy = sy + cell / 2 + 2;
		ctx.strokeStyle = 'rgba(255,255,255,.08)';
		ctx.strokeRect(cx - cell * 0.36, cy - cell * 0.36, cell * 0.72, cell * 0.72);
		item.draw(cx, cy, cell * 0.72);
		ctx.fillStyle = 'rgba(230,200,190,.75)';
		ctx.font = '11px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(item.name.toUpperCase(), cx, sy + cell + 12);
	});
}

// ---------- fight ----------

interface Fight {
	grid: GridService;
	player: PlayerService;
	boss: DoomBossService;
	doom: DoomAbilityService;
	hits: number;
}

let fight: Fight | null = null;
let god = false;
const held: PlayerDirection[] = [];

function newFight(): Fight {
	const grid = new GridService(new GridModel(GRID_DOOM));
	grid.setLairOpen(true);
	const events = new EventBus<PacmanEventMap>();
	const progress = new LevelProgress(grid, new ScoreModel(), events);
	const player = new PlayerService(grid, progress, events);
	const spawn = grid.bossSpawn();
	if (!spawn) {
		throw new Error('no boss spawn');
	}
	const boss = new DoomBossService(grid, spawn);
	const doom = new DoomAbilityService(grid, boss);
	doom.setGodMode(god);
	fx.reset();
	playerView.reset();
	return { grid, player, boss, doom, hits: 0 };
}

function stepFight(f: Fight, dt: number): void {
	const want = held[held.length - 1];
	if (want) {
		f.player.setDesiredDirection(want);
	}
	f.player.update(dt);
	const hpBefore = f.doom.playerHp;
	f.boss.update(dt, f.player);
	f.doom.update(dt, f.player);
	if (f.doom.playerHp < hpBefore) {
		f.hits += 1;
	}
	if (f.doom.consumePlayerDeath()) {
		const hits = f.hits;
		fight = newFight();
		fight.hits = hits;
	}
}

function drawFight(f: Fight, dt: number, time: number): void {
	const { boss, doom, grid, player } = f;
	world.setMood(boss.phase >= 2, boss.phase >= 3);
	for (const event of doom.consumeFx()) {
		fx.spawn(event);
	}
	fx.update(dt, doom.shots, doom.barrelList);
	world.drawWorld(ctx);
	const lights: DoomLight[] = [
		{ x: player.position.x, y: player.position.y, r: 6.5, tint: 0xffe2b0, a: 1 },
		{ x: boss.position.x, y: boss.position.y, r: 3.2, tint: 0xff3a2a, a: 0.85 }
	];
	world.drawMood(ctx, lights);
	const L = world.layout;
	fx.drawGround(ctx, L);
	if (!boss.defeated) {
		combat.drawGround(ctx, boss, doom, grid, L, time);
	}
	if (!boss.defeated) {
		const rs = boss.renderState;
		const look = (at: { x: number; y: number }) =>
			Math.atan2(player.position.y - at.y, player.position.x - at.x);
		const echo = boss.echo;
		const echoPos = boss.echoPosition();
		if (echo && echoPos) {
			echoView.draw(
				ctx,
				{
					x: echoPos.x,
					y: echoPos.y,
					phase: boss.phase,
					state: boss.state,
					shape: rs.shape,
					dir: rs.dir,
					progress: rs.progress,
					alpha: Math.max(0, Math.min(1, echo.presence)),
					intro: boss.introProgress,
					look: look(echoPos),
					hit: 0,
					echo: true
				},
				L,
				time
			);
		}
		bossView.draw(
			ctx,
			{
				x: boss.position.x,
				y: boss.position.y,
				phase: boss.phase,
				state: boss.state,
				shape: rs.shape,
				dir: rs.dir,
				progress: rs.progress,
				alpha: rs.alpha,
				intro: boss.introProgress,
				look: look(boss.position),
				hit: 0,
				echo: false
			},
			L,
			time
		);
		combat.drawAir(ctx, boss, L, time);
		combat.drawPull(ctx, boss, player.position, L, time);
	}
	playerView.draw(ctx, player, L, time, {
		look: doom.berserkActive ? 'berserk' : 'normal',
		charge: doom.bfgChargeProgress,
		dying: false
	});
	fx.draw(ctx, L, doom.shots, doom.tracerList);
	world.drawFx(ctx);
	world.drawOverlay(ctx);
	fx.drawHurt(ctx, vw, vh);
	$('status').textContent =
		`HP ${doom.playerHp}  ·  hits taken ${f.hits}  ·  boss ${Math.ceil(boss.hp)}  ·  phase ${boss.phase}  ·  ${boss.state.toLowerCase()}`;
}

// ---------- page ----------

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	world.resize(vw, vh, D);
}

function press(group: string, value: string): void {
	for (const b of document.querySelectorAll<HTMLButtonElement>(`[data-${group}]`)) {
		b.setAttribute('aria-pressed', String(b.dataset[group] === value));
	}
}

function setMode(next: 'gallery' | 'fight'): void {
	mode = next;
	press('mode', next);
	document.body.dataset.mode = next;
	if (next === 'fight' && !fight) {
		fight = newFight();
	}
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
	b.addEventListener('click', () => setMode(b.dataset.mode as 'gallery' | 'fight'));
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-phase]')) {
	b.addEventListener('click', () => {
		phase = Number(b.dataset.phase);
		press('phase', b.dataset.phase as string);
		if (mode === 'fight' && fight) {
			fight.boss.debugSetPhase(phase);
		}
	});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pose]')) {
	b.addEventListener('click', () => {
		pose = b.dataset.pose as Pose;
		press('pose', pose);
	});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-attack]')) {
	b.addEventListener('click', () => fight?.boss.debugForceAttack(b.dataset.attack as DoomAttackKind));
}
$('god').addEventListener('click', () => {
	god = !god;
	$('god').setAttribute('aria-pressed', String(god));
	fight?.doom.setGodMode(god);
});
$('restart').addEventListener('click', () => {
	fight = newFight();
});

const KEYS: Record<string, PlayerDirection> = {
	ArrowUp: 'UP',
	ArrowDown: 'DOWN',
	ArrowLeft: 'LEFT',
	ArrowRight: 'RIGHT',
	KeyW: 'UP',
	KeyS: 'DOWN',
	KeyA: 'LEFT',
	KeyD: 'RIGHT'
};
window.addEventListener('keydown', (e) => {
	const dir = KEYS[e.code];
	if (dir) {
		e.preventDefault();
		if (!held.includes(dir)) {
			held.push(dir);
		}
	} else if ((e.code === 'KeyF' || e.code === 'ShiftLeft') && fight) {
		fight.doom.fire(fight.player);
	}
});
window.addEventListener('keyup', (e) => {
	const dir = KEYS[e.code];
	const i = dir ? held.indexOf(dir) : -1;
	if (i >= 0) {
		held.splice(i, 1);
	}
});
window.addEventListener('blur', () => (held.length = 0));

let time = 0;
let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	time += dt;
	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, vw, vh);
	if (mode === 'fight' && fight) {
		stepFight(fight, dt);
		drawFight(fight, dt, time);
	} else {
		gallery(time);
	}
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
setMode('gallery');
requestAnimationFrame(frame);
