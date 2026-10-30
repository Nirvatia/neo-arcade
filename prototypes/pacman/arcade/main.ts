// Prototype for plan v2 stage 6 (the secret level as our own arcade round), built from
// the game's sources: the pixel art, the CRT pass, the intermission and the synth sounds.
// Pac-Man and the ghosts wander the maze on their own; the buttons show every state.
import { GRID_01 } from '../../../src/games/pacman/config/gridConfig';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import type { FruitKind } from '../../../src/games/pacman/logic/bonuses/fruitCatalog';
import { ArcadeView } from '../../../src/games/pacman/render/arcade/ArcadeView';
import type { ArcadeGhostLook, ArcadeScene } from '../../../src/games/pacman/render/arcade/ArcadeView';
import { ArcadeScreen } from '../../../src/games/pacman/render/arcade/ArcadeScreen';
import {
	drawIntermission,
	INTERMISSION_DURATION
} from '../../../src/games/pacman/render/arcade/ArcadeIntermission';
import type { ArcadeDir } from '../../../src/games/pacman/render/arcade/arcadeSprites';
import { ArcadeSynth } from '../../../src/games/pacman/audio/ArcadeSynth';
import type { ArcadeLoop, ArcadeSound } from '../../../src/games/pacman/audio/ArcadeSynth';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

const arcade = new ArcadeView(GRID_01);
const screen = new ArcadeScreen();
const synth = new ArcadeSynth();
const raw = document.createElement('canvas');
raw.width = arcade.canvas.width;
raw.height = arcade.canvas.height;
const rawCtx = raw.getContext('2d') as CanvasRenderingContext2D;

const walkable = (x: number, y: number): boolean => {
	const t = GRID_01[y]?.[x];
	return t !== undefined && t !== 'WL' && t !== 'ES' && t !== 'LE' && t !== 'LT' && t[0] !== '0';
};
const food = new Map<string, 'dot' | 'energizer'>();
function refill(): void {
	food.clear();
	GRID_01.forEach((row, y) =>
		row.forEach((t, x) => {
			if (t === 'DT') food.set(`${x},${y}`, 'dot');
			if (t === 'EU') food.set(`${x},${y}`, 'energizer');
		})
	);
}
refill();

const VEC: Record<ArcadeDir, [number, number]> = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
const BACK: Record<ArcadeDir, ArcadeDir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

/** Wanders tile to tile, never turning back unless at a dead end. */
class Walker {
	x: number;
	y: number;
	dir: ArcadeDir;
	u = 0;
	travel = 0;
	constructor(
		x: number,
		y: number,
		dir: ArcadeDir,
		readonly speed: number
	) {
		this.x = x;
		this.y = y;
		this.dir = dir;
	}
	get pos(): { x: number; y: number } {
		const [dx, dy] = VEC[this.dir];
		return { x: this.x + 0.5 + dx * this.u, y: this.y + 0.5 + dy * this.u };
	}
	step(dt: number, onTile?: (x: number, y: number) => void): void {
		this.u += dt * this.speed;
		this.travel += dt * this.speed;
		while (this.u >= 1) {
			this.u -= 1;
			const [dx, dy] = VEC[this.dir];
			this.x += dx;
			this.y += dy;
			onTile?.(this.x, this.y);
			const options = (Object.keys(VEC) as ArcadeDir[]).filter(
				(d) => d !== BACK[this.dir] && walkable(this.x + VEC[d][0], this.y + VEC[d][1])
			);
			this.dir = options.length
				? options[Math.floor(Math.random() * options.length)]
				: BACK[this.dir];
		}
	}
}

const pac = new Walker(11, 19, 'LEFT', 7);
const ghosts: Array<{ kind: GhostKind; w: Walker }> = [
	{ kind: 'BLINKY', w: new Walker(12, 9, 'LEFT', 6) },
	{ kind: 'PINKY', w: new Walker(3, 5, 'RIGHT', 6) },
	{ kind: 'INKY', w: new Walker(21, 17, 'LEFT', 6) },
	{ kind: 'CLYDE', w: new Walker(6, 23, 'RIGHT', 6) }
];

let look: ArcadeGhostLook = 'normal';
let mode: 'play' | 'death' | 'clear' | 'intermission' = 'play';
let modeTime = 0;
let fruit: FruitKind | null = null;
let crt = true;
let popups: Array<{ x: number; y: number; value: number; life: number }> = [];

function setMode(next: typeof mode): void {
	mode = next;
	modeTime = 0;
	if (next === 'death') {
		synth.setLoop(null);
		synth.play('death');
	} else if (next === 'clear') {
		synth.setLoop(null);
		synth.play('clear');
	} else if (next === 'intermission') {
		synth.setLoop(null);
		synth.play('intermission');
	}
}

function press(attr: string, value: string): void {
	for (const b of document.querySelectorAll<HTMLButtonElement>(`[data-${attr}]`)) {
		b.setAttribute('aria-pressed', String(b.dataset[attr] === value));
	}
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-look]')) {
	b.addEventListener('click', () => {
		look = b.dataset.look as ArcadeGhostLook;
		press('look', look);
		synth.setLoop(look === 'eyes' ? 'eyes' : look === 'normal' ? 'hum' : 'scared');
	});
}
$('death').addEventListener('click', () => setMode('death'));
$('clear').addEventListener('click', () => setMode('clear'));
$('inter').addEventListener('click', () => setMode('intermission'));
$('fruit').addEventListener('click', () => {
	const order: FruitKind[] = ['PEAR', 'PRETZEL', 'MELON'];
	fruit = order[(fruit ? order.indexOf(fruit) + 1 : 0) % order.length];
	$('fruit').textContent = `Фрукт: ${fruit.toLowerCase()}`;
});
$('crt').addEventListener('click', () => {
	crt = !crt;
	$('crt').setAttribute('aria-pressed', String(crt));
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-sound]')) {
	b.addEventListener('click', () => synth.play(b.dataset.sound as ArcadeSound));
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-loop]')) {
	b.addEventListener('click', () => {
		const loop = (b.dataset.loop === 'off' ? null : b.dataset.loop) as ArcadeLoop;
		synth.setLoop(loop);
		press('loop', b.dataset.loop as string);
	});
}
$('urgency').addEventListener('input', (e) => {
	synth.setUrgency(Number((e.target as HTMLInputElement).value) / 100);
});

let time = 0;
let last = performance.now();
let vw = 0;
let vh = 0;
function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
}

function frame(now: number): void {
	const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
	last = now;
	time += dt;
	modeTime += dt;
	if (mode === 'play') {
		pac.step(dt, (x, y) => {
			const f = food.get(`${x},${y}`);
			if (f) {
				food.delete(`${x},${y}`);
				synth.play(f === 'dot' ? 'chomp' : 'power');
			}
			if (food.size === 0) refill();
		});
		for (const g of ghosts) {
			g.w.step(dt * (look === 'eyes' ? 2 : look === 'normal' ? 1 : 0.6));
		}
		// a score pop-up wherever a scared ghost meets Pac-Man
		if (look === 'scared' || look === 'flash') {
			for (const g of ghosts) {
				const a = g.w.pos;
				const b = pac.pos;
				if (Math.hypot(a.x - b.x, a.y - b.y) < 0.6 && !popups.some((p) => p.life > 0.8)) {
					popups.push({ x: a.x, y: a.y, value: 200 * 2 ** (popups.length % 4), life: 1 });
					synth.play('ghost');
				}
			}
		}
	}
	popups = popups.map((p) => ({ ...p, life: p.life - dt })).filter((p) => p.life > 0);
	if (mode === 'death' && modeTime > 2.4) setMode('play');
	if (mode === 'clear' && modeTime > 2.2) {
		refill();
		setMode('play');
	}
	if (mode === 'intermission' && modeTime > INTERMISSION_DURATION + 0.4) setMode('play');

	if (mode === 'intermission') {
		drawIntermission(rawCtx, raw.width, raw.height, modeTime);
	} else {
		const p = pac.pos;
		const scene: ArcadeScene = {
			time,
			food: (x, y) => food.get(`${x},${y}`) ?? null,
			pac: { x: p.x, y: p.y, dir: pac.dir, travel: pac.travel },
			death: mode === 'death' ? Math.min(1, modeTime / 1.8) : null,
			ghosts:
				mode === 'death' || mode === 'clear'
					? []
					: ghosts.map((g) => ({ kind: g.kind, ...g.w.pos, dir: g.w.dir, look })),
			fruit: fruit ? { kind: fruit, x: 12.5, y: 15.5 } : null,
			popups,
			flash: mode === 'clear' && Math.floor(modeTime / 0.25) % 2 === 1,
			frozen: false
		};
		arcade.draw(scene);
		rawCtx.drawImage(arcade.canvas, 0, 0);
	}

	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, vw, vh);
	// the CRT screen at game scale on the left, a magnified raw corner on the right
	const scale = Math.min((vw * 0.55 - 24) / raw.width, (vh - 190) / raw.height);
	const w = raw.width * scale;
	const h = raw.height * scale;
	const x = 16;
	const y = 16;
	if (crt) {
		screen.present(ctx, raw, x, y, w, h, D);
	} else {
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(raw, x, y, w, h);
	}
	const zx = x + w + 16;
	const zw = vw - zx - 16;
	const src = 70;
	ctx.imageSmoothingEnabled = false;
	const p = pac.pos;
	const sx = Math.max(0, Math.min(raw.width - src, p.x * 10 - src / 2));
	const sy = Math.max(0, Math.min(raw.height - src, p.y * 10 - src / 2));
	ctx.drawImage(raw, sx, sy, src, src, zx, y, Math.min(zw, h), Math.min(zw, h));
	ctx.strokeStyle = 'rgba(46,230,214,.6)';
	ctx.strokeRect(zx, y, Math.min(zw, h), Math.min(zw, h));
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
