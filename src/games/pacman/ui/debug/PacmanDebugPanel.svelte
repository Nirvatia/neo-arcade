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
	import type { FramePerfSummary } from '../../core/debug/FrameMeter';
	import { FRUIT_ORDER } from '../../logic/bonuses/fruitCatalog';
	import { attackWeightsForPhase, DOOM_ATTACK_KINDS } from '../../logic/doom/DoomAttackCore';
	import { BOSS_HP, PHASE_THRESHOLDS } from '../../logic/doom/DoomBalance';
	import type { DoomPickupKind } from '../../logic/doom/DoomPickupModel';
	import { firstLevelOfSeason } from '../../logic/level/SeasonCatalog';
	import type { SeasonName } from '../../logic/level/SeasonCatalog';

	const WEAPONS: DoomPickupKind[] = ['bfg', 'barrel', 'berserk', 'medkit'];
	const SCALES = [0.1, 0.25, 0.5, 1, 2];
	const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
	const RENDER_FLAGS: Array<[keyof DebugRenderFlags, string]> = [
		['grid', 'Grid'],
		['ghostPaths', 'Paths'],
		['hitboxes', 'Hitboxes'],
		['fronts', 'Fronts']
	];
	const SCENE_LAYER_FLAGS: Array<[keyof DebugRenderFlags, string]> = [
		['atmosphere', 'Atmos'],
		['night', 'Night'],
		['weather', 'Weather'],
		['drift', 'Drift'],
		['vignette', 'Vignette']
	];

	let dev = $state<DebugController | null>(null);
	let snap = $state<DebugSnapshot | null>(null);
	let perf = $state<FramePerfSummary | null>(null);
	let visible = $state(false);
	let levelInput = $state(1);
	let mazeScale = $state(0.8);
	let flags = $state<DebugRenderFlags>({
		grid: false,
		ghostPaths: false,
		hitboxes: false,
		fronts: false,
		atmosphere: true,
		night: true,
		weather: true,
		drift: true,
		vignette: true
	});
	let frame = 0;

	const unsubDev = debugController.subscribe((value) => (dev = value));
	const unsubVisible = debugVisible.subscribe((value) => (visible = value));

	function tick(): void {
		snap = dev ? dev.snapshot() : null;
		perf = dev ? dev.framePerf() : null;
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

	/** The first level a season is played on (boss levels are not season levels). */
	function levelOf(season: SeasonName): number {
		return firstLevelOfSeason(season);
	}

	const bossAttacks = $derived(
		snap?.boss
			? DOOM_ATTACK_KINDS.filter((k) => attackWeightsForPhase(snap!.boss!.phase)[k] > 0)
			: []
	);
	const fmt = (v: number) => v.toFixed(2);
	const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

	/** The boss's health in its three phases: each bar fills between its own thresholds. */
	const bossBars = $derived.by(() => {
		const hp = snap?.boss?.hp ?? 0;
		const [t1, t2] = PHASE_THRESHOLDS;
		return [clamp01((hp - t1) / (BOSS_HP - t1)), clamp01((hp - t2) / (t1 - t2)), clamp01(hp / t2)];
	});

	function setProfile(wanted: string): void {
		if (dev && snap && snap.profile !== wanted) {
			dev.toggleProfile();
		}
	}

	function toggleFlag(flag: keyof DebugRenderFlags): void {
		if (!dev) {
			return;
		}
		dev.setRenderFlag(flag, !dev.renderFlags[flag]);
		flags = { ...dev.renderFlags };
	}
</script>

<button type="button" class="dev-toggle" tabindex={-1} onclick={toggleDebugVisible}>
	{visible ? 'DEV ×' : 'DEV'}
</button>

{#if visible && dev}
	<DevWindow id="panel" title="DEV · Pac-Man" x={8} y={68} width={30}>
		{#if snap}
			<div class="dev-status">
				<div class="l1">
					<span class="fps"
						>{perf ? Math.round(perf.fps) : '—'}
						<small>FPS · худший {perf ? perf.frameWorst.toFixed(0) : '—'} ms</small></span
					>
					<span class="st">{snap.state} · {snap.phase} · {fmt(snap.phaseRemaining)} s</span>
				</div>
				<div class="l2">
					<b>LV {snap.level}</b>{snap.hell ? ' · hell' : ''}{snap.secret ? ' · secret' : ''} · {snap.profile}
					· жизни <b>{snap.lives}</b> · счёт <b>{snap.score}</b>
				</div>
				{#if perf}
					<div class="l3">
						up {fmt(perf.updateP95)} ms · draw {fmt(perf.renderP95)} ms · rAF +{fmt(perf.rafLagP95)} ms
						· ввод {fmt(perf.inputP95)} ms ({perf.inputCount}) · {perf.width}×{perf.height} @{perf.pixelRatio}
					</div>
				{/if}
				<div class="dev-badges">
					{#if snap.frozen}
						<span class="dev-badge warn">FROZEN</span>
					{:else}
						<span class="dev-badge">×{snap.scale}</span>
					{/if}
					{#if snap.paused}<span class="dev-badge warn">PAUSED</span>{/if}
					{#if snap.godMode}<span class="dev-badge hot">GOD</span>{/if}
				</div>
			</div>
		{/if}

		<DevGroup id="flow" title="ВРЕМЯ" open>
			<div class="dev-row">
				<span class="dev-lab">Ход</span>
				<div class="dev-ctl">
					<button type="button" class="dev-btn" tabindex={-1} onclick={run((d) => d.togglePause())}
						>Pause</button
					>
					<button
						type="button"
						class="dev-btn"
						tabindex={-1}
						onclick={run((d) => d.toggleFreeze())}
					>
						{snap?.frozen ? 'Unfreeze' : 'Freeze'}
					</button>
					<button
						type="button"
						class="dev-btn"
						tabindex={-1}
						title="F8"
						onclick={run((d) => d.step())}>Step <kbd>F8</kbd></button
					>
				</div>
			</div>
			<div class="dev-row">
				<span class="dev-lab">Скорость</span>
				<div class="dev-ctl">
					<div class="dev-seg" role="group" aria-label="Скорость">
						{#each SCALES as s (s)}
							<button
								type="button"
								tabindex={-1}
								class:on={snap?.scale === s && !snap?.frozen}
								onclick={run((d) => (d.setTimeScale(s), snap?.frozen && d.toggleFreeze()))}
								>×{s}</button
							>
						{/each}
					</div>
				</div>
			</div>
		</DevGroup>

		<DevGroup id="level" title="УРОВЕНЬ" open>
			<div class="dev-row">
				<label class="dev-lab" for="dev-level-input">Перейти</label>
				<div class="dev-ctl">
					<input id="dev-level-input" type="number" min="1" bind:value={levelInput} />
					<button
						type="button"
						class="dev-btn primary"
						tabindex={-1}
						onclick={run((d) => d.gotoLevel(levelInput))}>Go</button
					>
					<button
						type="button"
						class="dev-btn"
						tabindex={-1}
						onclick={run((d) => d.setStartLevel(levelInput))}>Start at</button
					>
				</div>
			</div>
			<div class="dev-row">
				<span class="dev-lab">Сезон</span>
				<div class="dev-ctl">
					<div class="dev-seg" role="group" aria-label="Сезон">
						{#each SEASONS as season (season)}
							<button type="button" tabindex={-1} onclick={run((d) => d.gotoLevel(levelOf(season)))}
								>{season}</button
							>
						{/each}
					</div>
				</div>
			</div>
			<div class="dev-row">
				<span class="dev-lab">Мир</span>
				<div class="dev-ctl">
					<button type="button" class="dev-btn" tabindex={-1} onclick={run((d) => d.enterHell())}
						>Hell</button
					>
					<button type="button" class="dev-btn" tabindex={-1} onclick={run((d) => d.enterSecret())}
						>Secret</button
					>
				</div>
			</div>
			<div class="dev-row">
				<span class="dev-lab">Уровень</span>
				<div class="dev-ctl">
					<button type="button" class="dev-btn" tabindex={-1} onclick={run((d) => d.restartLevel())}
						>Restart</button
					>
					<button
						type="button"
						class="dev-btn"
						tabindex={-1}
						onclick={run((d) => d.completeLevel())}>Complete</button
					>
					<button type="button" class="dev-btn danger" tabindex={-1} onclick={run((d) => d.die())}
						>Die</button
					>
				</div>
			</div>
			<div class="dev-row">
				<span class="dev-lab">Лабиринт</span>
				<div class="dev-ctl">
					<div class="dev-step">
						<button
							type="button"
							tabindex={-1}
							aria-label="Меньше"
							onclick={run((d) =>
								d.setMazeScale((mazeScale = Math.max(0.3, +(mazeScale - 0.05).toFixed(2))))
							)}>−</button
						>
						<output>×{mazeScale.toFixed(2)}</output>
						<button
							type="button"
							tabindex={-1}
							aria-label="Больше"
							onclick={run((d) =>
								d.setMazeScale((mazeScale = Math.min(1.5, +(mazeScale + 0.05).toFixed(2))))
							)}>+</button
						>
					</div>
				</div>
			</div>
		</DevGroup>

		<DevGroup id="player" title="ИГРОК" open>
			<div class="dev-row">
				<span class="dev-lab">Герой</span>
				<div class="dev-ctl">
					<div class="dev-seg" role="group" aria-label="Герой">
						<button
							type="button"
							tabindex={-1}
							class:on={snap?.profile === 'pacman'}
							onclick={run(() => setProfile('pacman'))}>Pac-Man</button
						>
						<button
							type="button"
							tabindex={-1}
							class:on={snap?.profile === 'ms-pacman'}
							onclick={run(() => setProfile('ms-pacman'))}>Ms. Pac-Man</button
						>
					</div>
				</div>
			</div>
			<div class="dev-row">
				<span class="dev-lab">Режим</span>
				<div class="dev-ctl">
					<button
						type="button"
						class="dev-switch"
						role="switch"
						aria-checked={snap?.godMode ?? false}
						tabindex={-1}
						onclick={run((d) => d.toggleGodMode())}
						><span class="track"></span><span>God mode</span></button
					>
				</div>
			</div>
			<div class="dev-row">
				<span class="dev-lab">Жизни</span>
				<div class="dev-ctl">
					<div class="dev-step">
						<button
							type="button"
							tabindex={-1}
							aria-label="Минус жизнь"
							onclick={run((d) => d.addLives(-1))}>−1</button
						>
						<output>{snap?.lives ?? 0}</output>
						<button
							type="button"
							tabindex={-1}
							aria-label="Плюс жизнь"
							onclick={run((d) => d.addLives(1))}>+1</button
						>
					</div>
					<button type="button" class="dev-btn" tabindex={-1} onclick={run((d) => d.power())}
						>Energizer</button
					>
				</div>
			</div>
			{#if snap?.hell}
				<div class="dev-row">
					<span class="dev-lab">Оружие</span>
					<div class="dev-chips">
						{#each WEAPONS as weapon (weapon)}
							<button
								type="button"
								class="dev-chip"
								tabindex={-1}
								onclick={run((d) => d.giveWeapon(weapon))}>{weapon}</button
							>
						{/each}
					</div>
				</div>
			{/if}
		</DevGroup>

		{#if snap?.boss}
			<DevGroup id="boss" title="БОСС" open>
				<div class="dev-hp">
					<div class="bar">
						{#each bossBars as fill, i (i)}
							<span><i style:width="{fill * 100}%"></i></span>
						{/each}
					</div>
					<div class="meta">
						<span>HP <b>{Math.round(snap.boss.hp)}</b> / {BOSS_HP}</span>
						<span>фаза <b>{snap.boss.phase}</b> · {snap.boss.state}</span>
					</div>
				</div>
				<div class="dev-row">
					<span class="dev-lab">Урон</span>
					<div class="dev-ctl">
						<button
							type="button"
							class="dev-btn"
							tabindex={-1}
							onclick={run((d) => d.damageBoss(250))}>−250 HP</button
						>
						<button
							type="button"
							class="dev-btn danger"
							tabindex={-1}
							onclick={run((d) => d.killBoss())}>Kill</button
						>
					</div>
				</div>
				<div class="dev-row">
					<span class="dev-lab">Фаза</span>
					<div class="dev-ctl">
						<div class="dev-seg" role="group" aria-label="Фаза">
							{#each [1, 2, 3] as p (p)}
								<button
									type="button"
									tabindex={-1}
									class:on={snap.boss.phase === p}
									onclick={run((d) => d.setBossPhase(p))}>{p}</button
								>
							{/each}
						</div>
					</div>
				</div>
				<div class="dev-row">
					<span class="dev-lab">Атака</span>
					<div class="dev-chips">
						{#each bossAttacks as kind (kind)}
							<button
								type="button"
								class="dev-chip"
								tabindex={-1}
								class:on={snap.boss.forced === kind}
								onclick={run((d) => d.forceAttack(kind))}>{kind}</button
							>
						{/each}
					</div>
				</div>
			</DevGroup>
		{/if}

		<DevGroup id="spawns" title="СПАВН" summary={snap?.hell ? 'подбор' : 'фрукты, яйцо, эхо'}>
			{#if snap?.hell}
				<div class="dev-row">
					<span class="dev-lab">Подбор</span>
					<div class="dev-ctl">
						<button
							type="button"
							class="dev-btn"
							tabindex={-1}
							onclick={run((d) => d.spawnPickups())}>Hell pickups</button
						>
					</div>
				</div>
			{:else}
				<div class="dev-row">
					<span class="dev-lab">Фрукт</span>
					<div class="dev-chips">
						{#each FRUIT_ORDER as kind (kind)}
							<button
								type="button"
								class="dev-chip"
								tabindex={-1}
								onclick={run((d) => d.spawnFruit(kind))}>{kind.toLowerCase()}</button
							>
						{/each}
					</div>
				</div>
				<div class="dev-row">
					<span class="dev-lab">Бонус</span>
					<div class="dev-ctl">
						<button type="button" class="dev-btn" tabindex={-1} onclick={run((d) => d.spawnEgg())}
							>Easter egg</button
						>
						<button type="button" class="dev-btn" tabindex={-1} onclick={run((d) => d.spawnEcho())}
							>Echo</button
						>
						<button type="button" class="dev-btn" tabindex={-1} onclick={run((d) => d.echoRiot())}
							>Riot</button
						>
					</div>
				</div>
			{/if}
		</DevGroup>

		<DevGroup id="render" title="ОТРИСОВКА" summary="сетка, слои, пути">
			<div class="dev-switch-label">Отладка</div>
			<div class="dev-switches">
				{#each RENDER_FLAGS as [flag, label] (flag)}
					<button
						type="button"
						class="dev-switch"
						role="switch"
						aria-checked={flags[flag]}
						tabindex={-1}
						onclick={run(() => toggleFlag(flag))}
						><span class="track"></span><span>{label}</span></button
					>
				{/each}
			</div>
			<div class="dev-switch-label">Слои сцены</div>
			<div class="dev-switches">
				{#each SCENE_LAYER_FLAGS as [flag, label] (flag)}
					<button
						type="button"
						class="dev-switch"
						role="switch"
						aria-checked={flags[flag]}
						tabindex={-1}
						onclick={run(() => toggleFlag(flag))}
						><span class="track"></span><span>{label}</span></button
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
		bottom: 8px;
		right: 8px;
		z-index: 61;
		border: 1px solid #3b4f7c;
		border-radius: 5px;
		background: #0d1527;
		color: #56d9ff;
		font-family: ui-monospace, Menlo, Consolas, monospace;
		font-size: 12px;
		font-weight: 600;
		line-height: 1;
		padding: 7px 10px;
		cursor: pointer;
	}
	.dev-toggle:hover {
		border-color: #56d9ff;
	}
</style>
