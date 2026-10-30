<script lang="ts">
	// Prototype shell: a real world behind, the game's HUD and screens on top, and buttons
	// for every case. The snapshot is made up here; the components are the game's own.
	import { onMount } from 'svelte';
	import { GRID_01, GRID_DOOM } from '../../../src/games/pacman/config/gridConfig';
	import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
	import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
	import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
	import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
	import GameHud from '../../../src/games/pacman/ui/hud/GameHud.svelte';
	import ArcadeHud from '../../../src/games/pacman/ui/hud/ArcadeHud.svelte';
	import GameScreens from '../../../src/games/pacman/ui/screens/GameScreens.svelte';
	import type { HudSnapshot, HudWorld } from '../../../src/games/pacman/ui/hud/hudSnapshot';
	import { fruitForLevel } from '../../../src/games/pacman/logic/bonuses/fruitCatalog';
	import { toggleLang } from '../../../src/games/pacman/ui/i18n';
	import type { PacmanStateName } from '../../../src/games/pacman/core/Events';

	const WORLDS: HudWorld[] = ['spring', 'summer', 'autumn', 'winter', 'hell', 'secret'];
	const SCREENS: Array<[string, PacmanStateName | 'paused']> = [
		['Play', 'playing'],
		['Menu', 'menu'],
		['Ready', 'ready'],
		['Pause', 'paused'],
		['Death', 'death'],
		['Game over', 'game-over']
	];
	const WEAPONS = ['', 'bfg', 'barrel', 'berserk'] as const;

	let world = $state<HudWorld>('spring');
	let screen = $state<PacmanStateName | 'paused'>('playing');
	let power = $state(true);
	let ms = $state(false);
	let lives = $state(3);
	let level = $state(3);
	let bossPhase = $state(1);
	let weapon = $state<(typeof WEAPONS)[number]>('');
	let reward = $state(false);
	let time = $state(0);
	let canvas: HTMLCanvasElement | undefined = $state();

	const snap = $derived<HudSnapshot>({
		state: screen === 'paused' ? 'playing' : screen,
		underPause: 'playing',
		paused: screen === 'paused',
		fade: 0,
		phase: screen === 'ready' ? 'intro' : 'run',
		remaining: screen === 'ready' ? 5 - (time % 5) : 0,
		duration: screen === 'ready' ? 5 : 0,
		profile: ms ? 'ms-pacman' : 'pacman',
		world,
		level: world === 'hell' ? 5 : level,
		score: 12340 + Math.floor(time * 40),
		highScore: 48210,
		lives,
		dots: (time / 30) % 1,
		timer:
			power && world !== 'hell'
				? { kind: ms ? 'overdrive' : 'power', remaining: 6 - (time % 6), duration: 6 }
				: null,
		fruits: Array.from({ length: Math.min(7, level) }, (_, i) =>
			fruitForLevel(Math.max(1, level - Math.min(7, level) + 1 + i))
		),
		boss:
			world === 'hell'
				? {
						name: 'hell',
						phase: reward ? 3 : bossPhase,
						hp: reward ? 0 : [1500, 1000, 500][bossPhase - 1] - ((time * 30) % 450),
						hpMax: 1500,
						marks: [1000 / 1500, 500 / 1500],
						playerHp: 2,
						playerHpMax: 3,
						weapon,
						berserk: weapon === 'berserk' ? 8 - (time % 8) : 0,
						charge: weapon === 'bfg' ? (time % 2) / 2 : 0,
						defeated: reward,
						rewardOffered: reward
					}
				: null
	});

	const noop = () => {};
	const actions = {
		confirm: () => (screen = 'playing'),
		pause: () => (screen = screen === 'paused' ? 'playing' : 'paused'),
		menu: () => (screen = 'menu'),
		profile: () => (ms = !ms),
		restart: () => (screen = 'ready')
	};
	void noop;

	onMount(() => {
		const ctx = canvas!.getContext('2d')!;
		const D = Math.min(window.devicePixelRatio || 1, 2);
		let meadow: MeadowWorld | null = null;
		let doom: DoomWorld | null = null;
		let built = '';
		let last = performance.now();
		let frame = 0;
		const size = () => {
			canvas!.width = Math.round(innerWidth * D);
			canvas!.height = Math.round(innerHeight * D);
			canvas!.style.width = `${innerWidth}px`;
			canvas!.style.height = `${innerHeight}px`;
			built = '';
		};
		size();
		addEventListener('resize', size);
		const loop = (now: number) => {
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			time += dt;
			const key = `${world}|${innerWidth}x${innerHeight}`;
			if (key !== built) {
				built = key;
				meadow = doom = null;
				if (world === 'hell') {
					doom = new DoomWorld(GRID_DOOM, []);
					doom.resize(innerWidth, innerHeight, D);
				} else if (world !== 'secret') {
					meadow = new MeadowWorld(GRID_01, meadowThemeFor(world) as MeadowTheme);
					meadow.resize(innerWidth, innerHeight, D);
					for (let i = 0; i < 60; i++) meadow.update(0.1);
				}
			}
			ctx.setTransform(D, 0, 0, D, 0, 0);
			if (meadow) {
				meadow.update(dt);
				meadow.drawWorld(ctx, () => false);
				meadow.drawMood(ctx);
				meadow.drawOverlay(ctx);
			} else if (doom) {
				doom.update(dt);
				doom.drawWorld(ctx);
				doom.drawMood(ctx);
				doom.drawOverlay(ctx);
			} else {
				drawArcadeMaze(ctx);
			}
			frame = requestAnimationFrame(loop);
		};
		frame = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(frame);
			removeEventListener('resize', size);
		};
	});

	/** The secret level stand-in: the original's black board and blue walls. */
	function drawArcadeMaze(ctx: CanvasRenderingContext2D): void {
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, innerWidth, innerHeight);
		const rows = GRID_01.length;
		const cols = GRID_01[0].length;
		const S = Math.floor(Math.min((innerWidth - 40) / cols, (innerHeight - 120) / rows));
		const ox = (innerWidth - cols * S) / 2;
		const oy = (innerHeight - rows * S) / 2;
		ctx.strokeStyle = '#2121ff';
		ctx.lineWidth = 2;
		ctx.fillStyle = '#ffb8ae';
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				const tile = GRID_01[y][x];
				if (tile === 'WL') {
					ctx.strokeRect(ox + x * S + 3, oy + y * S + 3, S - 6, S - 6);
				} else if (tile === 'DT') {
					ctx.fillRect(ox + x * S + S / 2 - 1, oy + y * S + S / 2 - 1, 2, 2);
				}
			}
		}
	}

	const press = (fn: () => void) => (event: MouseEvent) => {
		(event.currentTarget as HTMLElement | null)?.blur();
		fn();
	};
</script>

<canvas bind:this={canvas}></canvas>

{#if world === 'secret'}
	<ArcadeHud {snap} />
{:else}
	<GameHud {snap} />
{/if}
<GameScreens {snap} {actions} />

<div class="ctl">
	<div class="row">
		{#each WORLDS as w (w)}
			<button class:on={world === w} onclick={press(() => (world = w))}>{w}</button>
		{/each}
	</div>
	<div class="row">
		{#each SCREENS as [label, s] (s)}
			<button class:on={screen === s} onclick={press(() => (screen = s))}>{label}</button>
		{/each}
	</div>
	<div class="row">
		<button class:on={power} onclick={press(() => (power = !power))}>Power timer</button>
		<button class:on={ms} onclick={press(() => (ms = !ms))}>Ms. Pac-Man</button>
		<button onclick={press(() => (lives = (lives % 5) + 1))}>Lives {lives}</button>
		<button onclick={press(() => (level = (level % 12) + 1))}>Level {level}</button>
		<button onclick={press(toggleLang)}>EN / RU</button>
	</div>
	{#if world === 'hell'}
		<div class="row">
			{#each [1, 2, 3] as p (p)}
				<button class:on={bossPhase === p && !reward} onclick={press(() => ((bossPhase = p), (reward = false)))}
					>Phase {p}</button
				>
			{/each}
			<button onclick={press(() => (weapon = WEAPONS[(WEAPONS.indexOf(weapon) + 1) % WEAPONS.length]))}
				>Weapon: {weapon || '—'}</button
			>
			<button class:on={reward} onclick={press(() => (reward = !reward))}>Boss dead</button>
		</div>
	{/if}
</div>

<style>
	canvas {
		position: fixed;
		inset: 0;
		display: block;
	}
	.ctl {
		position: fixed;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		width: 190px;
		z-index: 100;
		display: grid;
		gap: 6px;
		max-width: calc(100vw - 24px);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	button {
		border: 1px solid #3b4f7c;
		background: rgba(11, 19, 34, 0.92);
		color: #e8efff;
		font: 11px monospace;
		padding: 5px 8px;
		border-radius: 6px;
		cursor: pointer;
	}
	button.on {
		border-color: #79ff6f;
		color: #79ff6f;
	}
</style>
