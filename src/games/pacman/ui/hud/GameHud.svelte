<!-- The one HUD of the game: a dark glass plate tinted by the world's accent; boss levels
	add the boss block under it. The secret level uses ArcadeHud instead. -->
<script lang="ts">
	import type { HudSnapshot } from './hudSnapshot';
	import { t } from '../i18n';
	import FruitIcon from './FruitIcon.svelte';
	import LifeIcon from './LifeIcon.svelte';

	let { snap }: { snap: HudSnapshot } = $props();

	const ACCENT: Record<string, string> = {
		spring: '#ff8fc8',
		summer: '#ffc04a',
		autumn: '#ff8a3d',
		winter: '#8fdcff',
		hell: '#ff5a2a',
		secret: '#ffd23f'
	};
	const WEAPON_KEY = { bfg: 'bfg', barrel: 'barrel', berserk: 'berserk', '': 'none' } as const;

	const fmt = (n: number) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
	const lives = $derived(Array.from({ length: Math.min(6, Math.max(0, snap.lives)) }, (_, i) => i));
	const timerRatio = $derived(
		snap.timer && snap.timer.duration > 0
			? Math.max(0, Math.min(1, snap.timer.remaining / snap.timer.duration))
			: 0
	);
	const boss = $derived(snap.boss);
	const bossRatio = $derived(boss ? Math.max(0, Math.min(1, boss.hp / boss.hpMax)) : 0);
</script>

<div class="hud" style:--accent={ACCENT[snap.world]}>
	<div class="plate">
		<div class="cell">
			<small>{$t('score')}</small>
			<b>{fmt(snap.score)}</b>
			<span class="sub">{$t('high')} {fmt(snap.highScore)}</span>
		</div>
		<div class="cell">
			<small>{$t('level')}</small>
			<b>{snap.level}</b>
			<span class="sub world">{$t(`world_${snap.world}`)}</span>
		</div>
		<div class="cell">
			<small>{$t('lives')}</small>
			<span class="lives">
				{#each lives as i (i)}
					<LifeIcon ms={snap.profile === 'ms-pacman'} />
				{:else}
					<span class="sub">0</span>
				{/each}
			</span>
		</div>
		{#if boss}
			<div class="cell weapon" class:armed={boss.weapon !== ''}>
				<small>{$t('weapon')}</small>
				<b>{$t(WEAPON_KEY[boss.weapon])}</b>
				{#if boss.weapon === 'berserk'}
					<span class="sub">{boss.berserk.toFixed(1)} s</span>
				{:else if boss.charge > 0}
					<span class="meter"><i style:width="{boss.charge * 100}%"></i></span>
				{/if}
			</div>
		{:else}
			<div class="cell timer" class:on={snap.timer}>
				<small>{snap.timer ? $t(snap.timer.kind) : $t('power')}</small>
				<b>{snap.timer ? snap.timer.remaining.toFixed(1) : '—'}</b>
				<span class="meter"><i style:width="{timerRatio * 100}%"></i></span>
			</div>
		{/if}
	</div>

	{#if !boss}
		<div class="dots" title="{$t('weather')} 50% · {$t('night')} 75%">
			<i style:width="{snap.dots * 100}%"></i>
			<em style:left="50%"></em>
			<em style:left="75%"></em>
		</div>
	{/if}

	{#if boss && !boss.defeated}
		<div class="boss" class:enraged={boss.phase >= 3}>
			<div class="boss-head">
				<span>{$t('boss_hell')}</span>
				<span>{$t('phase')} {boss.phase}</span>
			</div>
			<div class="track">
				<div class="fill" style:width="{bossRatio * 100}%"></div>
				{#each boss.marks as m (m)}<em style:left="{m * 100}%"></em>{/each}
			</div>
			<div class="player-hp">
				<small>{$t('hp')}</small>
				{#each Array.from({ length: boss.playerHpMax }, (_, k) => k) as i (i)}
					<svg viewBox="0 0 24 22" width="16" height="14" aria-hidden="true">
						<path
							d="M12 21s-9-6.2-9-12.2C3 5.6 5.4 3 8.4 3c1.6 0 2.9.8 3.6 2 .7-1.2 2-2 3.6-2 3 0 5.4 2.6 5.4 5.8C21 14.8 12 21 12 21z"
							fill={i < boss.playerHp ? '#e0343c' : 'rgba(255,255,255,.18)'}
							stroke={i < boss.playerHp ? '#fff4dc' : 'rgba(255,255,255,.35)'}
							stroke-width="1.5"
						/>
					</svg>
				{/each}
			</div>
		</div>
	{:else if boss?.rewardOffered}
		<div class="hint">{$t('rewardHint')}</div>
	{/if}

	<div class="fruits">
		{#each snap.fruits as kind, i (i)}
			<FruitIcon {kind} size={24} />
		{/each}
	</div>
</div>

<style>
	.hud {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 20;
		color: #f4f1ea;
		font-family: 'Impact', 'Arial Narrow', 'Segoe UI', system-ui, sans-serif;
		--glass: linear-gradient(180deg, rgba(28, 32, 42, 0.86), rgba(8, 10, 14, 0.9));
	}
	.plate {
		position: absolute;
		top: 10px;
		left: 50%;
		transform: translateX(-50%);
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(96px, auto);
		background: var(--glass);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-top: 2px solid var(--accent);
		border-radius: 12px;
		box-shadow:
			0 10px 24px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(6px);
		overflow: hidden;
	}
	.cell {
		display: grid;
		justify-items: center;
		align-content: center;
		gap: 1px;
		padding: 6px 14px 7px;
		min-height: 52px;
		box-sizing: border-box;
	}
	.cell + .cell {
		border-left: 1px solid rgba(255, 255, 255, 0.08);
	}
	small {
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 2px;
		color: var(--accent);
	}
	b {
		font-size: 22px;
		font-weight: 400;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.sub {
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: 9px;
		letter-spacing: 1px;
		color: rgba(244, 241, 234, 0.5);
	}
	.world {
		color: rgba(244, 241, 234, 0.75);
	}
	.lives {
		display: flex;
		gap: 3px;
		min-height: 22px;
		align-items: center;
	}
	.timer:not(.on) b,
	.weapon:not(.armed) b {
		color: rgba(244, 241, 234, 0.35);
	}
	.meter {
		display: block;
		width: 64px;
		height: 4px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}
	.meter i {
		display: block;
		height: 100%;
		background: var(--accent);
		box-shadow: 0 0 6px var(--accent);
	}
	.dots {
		position: absolute;
		top: 68px;
		left: 50%;
		transform: translateX(-50%);
		width: 220px;
		height: 3px;
		border-radius: 2px;
		background: rgba(0, 0, 0, 0.45);
	}
	.dots i {
		display: block;
		height: 100%;
		border-radius: 2px;
		background: var(--accent);
		opacity: 0.85;
	}
	.dots em {
		position: absolute;
		top: -2px;
		width: 1px;
		height: 7px;
		background: rgba(255, 255, 255, 0.6);
	}
	.boss {
		position: absolute;
		top: 72px;
		left: 50%;
		transform: translateX(-50%);
		width: min(420px, calc(100vw - 32px));
		padding: 6px 10px 8px;
		box-sizing: border-box;
		border-radius: 8px;
		background:
			linear-gradient(rgba(10, 6, 4, 0.82), rgba(10, 6, 4, 0.82)),
			repeating-linear-gradient(135deg, #ffcc00 0 8px, #14110f 8px 16px);
		border: 2px solid transparent;
		background-clip: padding-box, border-box;
		background-origin: border-box;
	}
	.boss-head {
		display: flex;
		justify-content: space-between;
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 2px;
		color: #ff8a5a;
	}
	.track {
		position: relative;
		margin-top: 4px;
		height: 10px;
		border-radius: 999px;
		background: linear-gradient(#1a1c20, #2a2d32);
		overflow: hidden;
	}
	.fill {
		height: 100%;
		background: linear-gradient(#ff6a1a, #b02a08);
		transition: width 0.15s;
	}
	.enraged .fill {
		background: linear-gradient(#e01a10, #6a0a06);
	}
	.track em {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: rgba(0, 0, 0, 0.7);
	}
	.player-hp {
		display: flex;
		align-items: center;
		gap: 3px;
		margin-top: 5px;
	}
	.player-hp small {
		color: #ff8a5a;
		margin-right: 4px;
	}
	.hint {
		position: absolute;
		top: 76px;
		left: 50%;
		transform: translateX(-50%);
		padding: 6px 14px;
		border-radius: 999px;
		background: var(--glass);
		border: 1px solid var(--accent);
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 1px;
		animation: pulse 1.2s ease-in-out infinite;
	}
	.fruits {
		position: absolute;
		right: 14px;
		bottom: 12px;
		display: flex;
		gap: 2px;
		padding: 4px 6px;
		border-radius: 10px;
		background: var(--glass);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	@keyframes pulse {
		50% {
			box-shadow: 0 0 16px var(--accent);
		}
	}
	@media (max-width: 560px) {
		.plate {
			grid-auto-columns: minmax(64px, auto);
		}
		.cell {
			padding: 5px 8px 6px;
		}
		b {
			font-size: 17px;
		}
	}
</style>
