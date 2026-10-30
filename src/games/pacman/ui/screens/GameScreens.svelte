<!-- Menu, ready, pause, death and game over, over the game. Buttons never keep focus, so the
	arrows keep steering. On the secret level the titles take the arcade look. -->
<script lang="ts">
	import type { HudSnapshot } from '../hud/hudSnapshot';
	import { t, toggleLang } from '../i18n';
	import LifeIcon from '../hud/LifeIcon.svelte';
	import type { ScreenActions } from './screenActions';

	let { snap, actions }: { snap: HudSnapshot; actions: ScreenActions } = $props();

	const ACCENT: Record<string, string> = {
		spring: '#ff8fc8',
		summer: '#ffc04a',
		autumn: '#ff8a3d',
		winter: '#8fdcff',
		hell: '#ff5a2a',
		secret: '#ffd23f'
	};

	function act(action: () => void): (event: MouseEvent) => void {
		return (event) => {
			(event.currentTarget as HTMLElement | null)?.blur();
			action();
		};
	}

	const arcade = $derived(snap.world === 'secret');
	const record = $derived(snap.score > 0 && snap.score >= snap.highScore);
	const fmt = (n: number) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
</script>

<div class="screens" class:arcade style:--accent={ACCENT[snap.world]}>
	{#if snap.paused}
		<div class="veil"></div>
		<div class="card">
			<h2>{$t('paused')}</h2>
			<div class="buttons">
				<button type="button" tabindex={-1} class="primary" onclick={act(actions.pause)}
					>{$t('resume')}</button
				>
				<button type="button" tabindex={-1} onclick={act(actions.restart)}>{$t('restart')}</button>
				<button type="button" tabindex={-1} onclick={act(actions.menu)}>{$t('menu')}</button>
				<button type="button" tabindex={-1} class="ghost" onclick={act(toggleLang)}
					>{$t('language')}</button
				>
			</div>
		</div>
	{:else if snap.state === 'menu'}
		<div class="veil"></div>
		<div class="card wide">
			<h1>{snap.profile === 'ms-pacman' ? 'MS. PAC-MAN' : 'PAC-MAN'}</h1>
			<div class="modes">
				<button
					type="button"
					tabindex={-1}
					class:on={snap.profile === 'pacman'}
					onclick={act(() => snap.profile !== 'pacman' && actions.profile())}
				>
					<LifeIcon size={22} /> Pac-Man
				</button>
				<button
					type="button"
					tabindex={-1}
					class:on={snap.profile === 'ms-pacman'}
					onclick={act(() => snap.profile !== 'ms-pacman' && actions.profile())}
				>
					<LifeIcon ms size={22} /> Ms. Pac-Man
				</button>
			</div>
			<div class="stat">{$t('high')} <b>{fmt(snap.highScore)}</b></div>
			<div class="buttons">
				<button type="button" tabindex={-1} class="primary" onclick={act(actions.confirm)}
					>{$t('start')}</button
				>
				<button type="button" tabindex={-1} class="ghost" onclick={act(toggleLang)}
					>{$t('language')}</button
				>
			</div>
			<p class="help">{$t('pressEnter')}<br />{$t('fire')}</p>
		</div>
	{:else if snap.state === 'ready'}
		<div class="ready">
			<span class="title">{$t('ready')}</span>
			{#if !arcade}
				<span class="where">{$t('level')} {snap.level} · {$t(`world_${snap.world}`)}</span>
				<span class="bar"
					><i style:width="{snap.duration > 0 ? (snap.remaining / snap.duration) * 100 : 0}%"
					></i></span
				>
			{/if}
			{#if snap.phase === 'intro'}
				<button type="button" tabindex={-1} class="ghost small" onclick={act(actions.confirm)}
					>{$t('skip')} ⏎</button
				>
			{/if}
		</div>
	{:else if snap.state === 'death' && !arcade}
		<div class="banner">
			{#if snap.lives > 0}
				<span class="lives">
					{#each Array.from({ length: Math.min(6, snap.lives) }, (_, k) => k) as i (i)}
						<LifeIcon ms={snap.profile === 'ms-pacman'} />
					{/each}
				</span>
				{snap.lives === 1 ? $t('lastLife') : `${snap.lives} ${$t('livesLeft')}`}
			{:else}
				{$t('gameOver')}
			{/if}
		</div>
	{:else if snap.state === 'game-over'}
		<div class="veil"></div>
		<div class="card">
			<h2 class="over">{$t('gameOver')}</h2>
			<div class="stat">{$t('score')} <b>{fmt(snap.score)}</b></div>
			{#if record}<div class="record">{$t('newRecord')}</div>{/if}
			<div class="buttons">
				<button type="button" tabindex={-1} class="primary" onclick={act(actions.confirm)}
					>{$t('playAgain')}</button
				>
				<button type="button" tabindex={-1} onclick={act(actions.profile)}
					>{snap.profile === 'ms-pacman' ? 'Pac-Man' : 'Ms. Pac-Man'}</button
				>
				<button type="button" tabindex={-1} onclick={act(actions.menu)}>{$t('menu')}</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.screens {
		position: fixed;
		inset: 0;
		z-index: 30;
		pointer-events: none;
		display: grid;
		place-items: center;
		color: #f4f1ea;
		font-family: 'Segoe UI', system-ui, sans-serif;
		--glass: linear-gradient(180deg, rgba(28, 32, 42, 0.9), rgba(8, 10, 14, 0.94));
	}
	.veil {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, rgba(4, 6, 10, 0.35), rgba(4, 6, 10, 0.7));
	}
	.card {
		position: relative;
		pointer-events: auto;
		display: grid;
		justify-items: center;
		gap: 12px;
		min-width: 260px;
		max-width: calc(100vw - 32px);
		padding: 22px 26px;
		box-sizing: border-box;
		background: var(--glass);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-top: 3px solid var(--accent);
		border-radius: 16px;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(8px);
	}
	.card.wide {
		min-width: 340px;
	}
	h1,
	h2 {
		margin: 0;
		font-family: 'Impact', 'Arial Narrow', system-ui, sans-serif;
		font-weight: 400;
		letter-spacing: 3px;
	}
	h1 {
		font-size: 44px;
		color: var(--accent);
		text-shadow: 0 0 18px color-mix(in srgb, var(--accent) 60%, transparent);
	}
	h2 {
		font-size: 30px;
	}
	h2.over {
		color: #ff4d4d;
	}
	.modes {
		display: flex;
		gap: 8px;
	}
	.modes button {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.stat {
		font-size: 12px;
		letter-spacing: 2px;
		color: rgba(244, 241, 234, 0.6);
	}
	.stat b {
		font-family: 'Impact', 'Arial Narrow', system-ui, sans-serif;
		font-weight: 400;
		font-size: 22px;
		color: #fff;
		margin-left: 6px;
	}
	.record {
		padding: 3px 10px;
		border-radius: 999px;
		background: var(--accent);
		color: #120d06;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 2px;
		animation: pop 0.9s ease-in-out infinite alternate;
	}
	.buttons {
		display: grid;
		gap: 8px;
		width: 100%;
	}
	button {
		pointer-events: auto;
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.05);
		color: #f4f1ea;
		font: inherit;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 2px;
		padding: 10px 16px;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	button:hover,
	button.on {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 16%, transparent);
	}
	button.primary {
		background: var(--accent);
		border-color: var(--accent);
		color: #120d06;
	}
	button.primary:hover {
		filter: brightness(1.08);
	}
	button.ghost {
		background: none;
		font-size: 11px;
		color: rgba(244, 241, 234, 0.6);
	}
	button.small {
		padding: 6px 12px;
	}
	.help {
		margin: 0;
		font-size: 11px;
		line-height: 1.6;
		text-align: center;
		color: rgba(244, 241, 234, 0.5);
	}
	.ready {
		display: grid;
		justify-items: center;
		gap: 8px;
		transform: translateY(18%);
	}
	.ready .title {
		font-family: 'Impact', 'Arial Narrow', system-ui, sans-serif;
		font-size: 42px;
		letter-spacing: 4px;
		color: #fff;
		-webkit-text-stroke: 1.5px rgba(10, 8, 6, 0.85);
		paint-order: stroke fill;
		text-shadow:
			0 3px 0 rgba(0, 0, 0, 0.55),
			0 0 22px var(--accent),
			0 0 44px color-mix(in srgb, var(--accent) 60%, transparent);
	}
	.ready .where {
		padding: 4px 12px;
		border-radius: 999px;
		background: var(--glass);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 2px;
	}
	.ready .bar {
		width: 140px;
		height: 3px;
		border-radius: 2px;
		background: rgba(0, 0, 0, 0.45);
		overflow: hidden;
	}
	.ready .bar i {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.banner {
		align-self: end;
		margin-bottom: 64px;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 16px;
		border-radius: 999px;
		background: var(--glass);
		border: 1px solid rgba(255, 255, 255, 0.12);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 2px;
	}
	.banner .lives {
		display: flex;
		gap: 3px;
	}
	/* the original game's titles: yellow READY!, red GAME OVER, blocky letters */
	.arcade .ready .title,
	.arcade h2 {
		font-family: 'Press Start 2P', 'Courier New', monospace;
		font-weight: 700;
		font-size: 22px;
		letter-spacing: 2px;
		color: #ffff00;
		text-shadow: none;
	}
	.arcade h2.over {
		color: #ff0000;
	}
	@keyframes pop {
		to {
			transform: scale(1.06);
		}
	}
</style>
