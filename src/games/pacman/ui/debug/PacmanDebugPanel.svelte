<script lang="ts">
	import { onDestroy } from 'svelte';
	import { debugController, debugVisible, toggleDebugVisible } from './debugActions';
	import type {
		DebugController,
		DebugRenderFlags,
		DebugSnapshot
	} from '../../core/debug/DebugController';
	import DevWindow from './DevWindow.svelte';
	import DevGroup from './DevGroup.svelte';
	import DevLogWindow from './DevLogWindow.svelte';
	import { FRUIT_ORDER } from '../../logic/bonuses/fruitCatalog';
	import { attackWeightsForPhase, DOOM_ATTACK_KINDS } from '../../logic/doom/DoomAttackCore';
	import type { DoomPickupKind } from '../../logic/doom/DoomPickupModel';
	import { seasonForLevel } from '../../logic/level/SeasonCatalog';

	const WEAPONS: DoomPickupKind[] = ['bfg', 'barrel', 'berserk', 'medkit'];
	const SCALES = [0.1, 0.25, 0.5, 1, 2];
	const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
	const RENDER_FLAGS: Array<[keyof DebugRenderFlags, string]> = [
		['grid', 'Grid'],
		['ghostPaths', 'Paths'],
		['hitboxes', 'Hitboxes'],
		['fronts', 'Fronts']
	];

	let dev = $state<DebugController | null>(null);
	let snap = $state<DebugSnapshot | null>(null);
	let visible = $state(false);
	let levelInput = $state(1);
	let mazeScale = $state(0.8);
	let flags = $state<DebugRenderFlags>({
		grid: false,
		ghostPaths: false,
		hitboxes: false,
		fronts: false
	});
	let frame = 0;
	/** Frames per second and the worst frame time of the last second, from rAF timestamps. */
	let fps = $state(0);
	let worst = $state(0);
	let fpsFrames = 0;
	let fpsStart = -1;
	let fpsLast = -1;
	let fpsWorst = 0;

	const unsubDev = debugController.subscribe((value) => (dev = value));
	const unsubVisible = debugVisible.subscribe((value) => (visible = value));

	function tick(now: number): void {
		snap = dev ? dev.snapshot() : null;
		if (fpsStart < 0) fpsStart = now;
		if (fpsLast >= 0) fpsWorst = Math.max(fpsWorst, now - fpsLast);
		fpsLast = now;
		fpsFrames += 1;
		if (now - fpsStart >= 1000) {
			fps = Math.round((fpsFrames * 1000) / (now - fpsStart));
			worst = Math.round(fpsWorst);
			fpsFrames = 0;
			fpsStart = now;
			fpsWorst = 0;
		}
		frame = requestAnimationFrame(tick);
	}

	$effect(() => {
		if (!visible) {
			return;
		}
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	onDestroy(() => {
		unsubDev();
		unsubVisible();
	});

	/** Runs a command without leaving focus on the button (arrows keep steering). */
	function run(action: (d: DebugController) => void): (event: MouseEvent) => void {
		return (event) => {
			(event.currentTarget as HTMLElement | null)?.blur();
			if (dev) action(dev);
		};
	}

	/** The first regular level of a season (the hell takes every fifth number). */
	function levelOf(season: string): number {
		for (let n = 1; n < 40; n++) {
			if (n % 5 !== 0 && seasonForLevel(n).name === season) return n;
		}
		return 1;
	}

	const bossAttacks = $derived(
		snap?.boss
			? DOOM_ATTACK_KINDS.filter((k) => attackWeightsForPhase(snap!.boss!.phase)[k] > 0)
			: []
	);
	const fmt = (v: number) => v.toFixed(2);
</script>

<button type="button" class="dev-toggle" tabindex={-1} onclick={toggleDebugVisible}>
	{visible ? 'DEV ×' : 'DEV'}
</button>

{#if visible && dev}
	<DevWindow id="panel" title="DEV · Pac-Man" x={8} y={44} width={250}>
		{#if snap}
			<div class="live">
				<div><b>{fps} FPS</b> · worst {worst} ms</div>
				<div><b>{snap.state}</b> · {snap.phase} · {fmt(snap.phaseRemaining)} s</div>
				<div>
					LV {snap.level}{snap.hell ? ' · hell' : ''}{snap.secret ? ' · secret' : ''} · {snap.profile}
					· lives {snap.lives} · {snap.score}
				</div>
				<div>
					{snap.frozen ? 'FROZEN' : `×${snap.scale}`}{snap.paused ? ' · paused' : ''}{snap.godMode
						? ' · GOD'
						: ''}
				</div>
			</div>
		{/if}

		<DevGroup id="flow" title="FLOW" open>
			<div class="row">
				<button type="button" tabindex={-1} onclick={run((d) => d.togglePause())}>Pause</button>
				<button type="button" tabindex={-1} onclick={run((d) => d.toggleFreeze())}>
					{snap?.frozen ? 'Unfreeze' : 'Freeze'}
				</button>
				<button type="button" tabindex={-1} onclick={run((d) => d.step())} title="F8">Step</button>
			</div>
			<div class="row">
				{#each SCALES as s (s)}
					<button
						type="button"
						tabindex={-1}
						class:on={snap?.scale === s && !snap?.frozen}
						onclick={run((d) => (d.setTimeScale(s), snap?.frozen && d.toggleFreeze()))}>×{s}</button
					>
				{/each}
			</div>
		</DevGroup>

		<DevGroup id="level" title="LEVEL">
			<div class="row">
				<input type="number" min="1" bind:value={levelInput} />
				<button type="button" tabindex={-1} onclick={run((d) => d.gotoLevel(levelInput))}>Go</button
				>
				<button type="button" tabindex={-1} onclick={run((d) => d.setStartLevel(levelInput))}
					>Start at</button
				>
			</div>
			<div class="row">
				{#each SEASONS as season (season)}
					<button type="button" tabindex={-1} onclick={run((d) => d.gotoLevel(levelOf(season)))}
						>{season}</button
					>
				{/each}
			</div>
			<div class="row">
				<button type="button" tabindex={-1} onclick={run((d) => d.enterHell())}>Hell</button>
				<button type="button" tabindex={-1} onclick={run((d) => d.enterSecret())}>Secret</button>
				<button type="button" tabindex={-1} onclick={run((d) => d.restartLevel())}>Restart</button>
			</div>
			<div class="row">
				<button type="button" tabindex={-1} onclick={run((d) => d.completeLevel())}>Complete</button
				>
				<button type="button" tabindex={-1} onclick={run((d) => d.die())}>Die</button>
			</div>
			<div class="row">
				<span>Maze</span>
				<button
					type="button"
					tabindex={-1}
					onclick={run((d) =>
						d.setMazeScale((mazeScale = Math.max(0.3, +(mazeScale - 0.05).toFixed(2))))
					)}>−</button
				>
				<span>×{mazeScale.toFixed(2)}</span>
				<button
					type="button"
					tabindex={-1}
					onclick={run((d) =>
						d.setMazeScale((mazeScale = Math.min(1.5, +(mazeScale + 0.05).toFixed(2))))
					)}>+</button
				>
			</div>
		</DevGroup>

		<DevGroup id="player" title="PLAYER">
			<div class="row">
				<button
					type="button"
					tabindex={-1}
					class:on={snap?.godMode}
					onclick={run((d) => d.toggleGodMode())}>God mode</button
				>
				<button type="button" tabindex={-1} onclick={run((d) => d.toggleProfile())}>Profile</button>
			</div>
			<div class="row">
				<span>Lives</span>
				<button type="button" tabindex={-1} onclick={run((d) => d.addLives(-1))}>−1</button>
				<button type="button" tabindex={-1} onclick={run((d) => d.addLives(1))}>+1</button>
				<button type="button" tabindex={-1} onclick={run((d) => d.power())}>Energizer</button>
			</div>
			{#if snap?.hell}
				<div class="row">
					{#each WEAPONS as weapon (weapon)}
						<button type="button" tabindex={-1} onclick={run((d) => d.giveWeapon(weapon))}
							>{weapon}</button
						>
					{/each}
				</div>
			{/if}
		</DevGroup>

		{#if snap?.boss}
			<DevGroup id="boss" title="BOSS">
				<div>
					HP {Math.round(snap.boss.hp)} · phase {snap.boss.phase} · {snap.boss.state}{snap.boss
						.forced
						? ` · next: ${snap.boss.forced}`
						: ''}
				</div>
				<div class="row">
					<button type="button" tabindex={-1} onclick={run((d) => d.damageBoss(250))}
						>−250 HP</button
					>
					<button type="button" tabindex={-1} onclick={run((d) => d.killBoss())}>Kill</button>
				</div>
				<div class="row">
					{#each [1, 2, 3] as p (p)}
						<button
							type="button"
							tabindex={-1}
							class:on={snap.boss.phase === p}
							onclick={run((d) => d.setBossPhase(p))}>Phase {p}</button
						>
					{/each}
				</div>
				<div class="row wrap">
					{#each bossAttacks as kind (kind)}
						<button
							type="button"
							tabindex={-1}
							class:on={snap.boss.forced === kind}
							onclick={run((d) => d.forceAttack(kind))}>{kind}</button
						>
					{/each}
				</div>
			</DevGroup>
		{/if}

		<DevGroup id="spawns" title="SPAWNS">
			{#if snap?.hell}
				<button type="button" tabindex={-1} onclick={run((d) => d.spawnPickups())}
					>Hell pickups</button
				>
			{:else}
				<div class="row wrap">
					{#each FRUIT_ORDER as kind (kind)}
						<button type="button" tabindex={-1} onclick={run((d) => d.spawnFruit(kind))}
							>{kind.toLowerCase()}</button
						>
					{/each}
				</div>
				<div class="row">
					<button type="button" tabindex={-1} onclick={run((d) => d.spawnEgg())}>Easter egg</button>
					<button type="button" tabindex={-1} onclick={run((d) => d.spawnEcho())}>Echo</button>
				</div>
			{/if}
		</DevGroup>
		<DevGroup id="render" title="RENDER">
			<div class="row wrap">
				{#each RENDER_FLAGS as [flag, label] (flag)}
					<button
						type="button"
						tabindex={-1}
						class:on={flags[flag]}
						onclick={run((d) => {
							d.setRenderFlag(flag, !d.renderFlags[flag]);
							flags = { ...d.renderFlags };
						})}>{label}</button
					>
				{/each}
			</div>
		</DevGroup>
	</DevWindow>
	<DevLogWindow {dev} />
{/if}

<style>
	.dev-toggle {
		position: fixed;
		top: 8px;
		right: 8px;
		z-index: 61;
		border: 1px solid #3b4f7c;
		background: rgba(11, 19, 34, 0.9);
		color: #56d9ff;
		font-family: monospace;
		font-size: 11px;
		line-height: 1;
		padding: 6px 8px;
		cursor: pointer;
	}
	.live {
		color: #b8c6e6;
		line-height: 1.5;
	}
	.live b {
		color: #fff;
	}
	.row {
		display: flex;
		gap: 4px;
		align-items: center;
	}
	.wrap {
		flex-wrap: wrap;
	}
	input {
		width: 48px;
		border: 1px solid #3b4f7c;
		background: #0b1322;
		color: #e8efff;
		font: inherit;
		padding: 3px;
	}
	button {
		border: 1px solid #3b4f7c;
		background: #0b1322;
		color: #e8efff;
		font: inherit;
		line-height: 1;
		padding: 5px 6px;
		cursor: pointer;
	}
	button:hover {
		border-color: #56d9ff;
		color: #56d9ff;
	}
	button.on {
		border-color: #79ff6f;
		color: #79ff6f;
	}
</style>
