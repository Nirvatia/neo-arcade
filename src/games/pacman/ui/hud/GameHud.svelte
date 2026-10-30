<!-- The one HUD of the game: one compact box at the top centre, right above the board, on a
	solid dark background. Boss levels add a second box of the same width just under it.
	The secret level uses ArcadeHud instead. -->
<script lang="ts">
	import type { HudSnapshot } from './hudSnapshot';
	import { t } from '../i18n';

	let { snap }: { snap: HudSnapshot } = $props();

	const ACCENT: Record<string, string> = {
		spring: '#ff8fc8',
		summer: '#ffc04a',
		autumn: '#ff9a4d',
		winter: '#8fdcff',
		hell: '#ff6a3a',
		secret: '#ffd23f'
	};
	const WEAPON_KEY = { bfg: 'bfg', barrel: 'barrel', berserk: 'berserk', '': 'none' } as const;

	const fmt = (n: number) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
	const timerRatio = $derived(
		snap.timer && snap.timer.duration > 0
			? Math.max(0, Math.min(1, snap.timer.remaining / snap.timer.duration))
			: 0
	);
	const boss = $derived(snap.boss);
	/** The boss bar in three phase segments, left = the last to go; each 0..1. */
	const segments = $derived.by(() => {
		if (!boss) return [];
		const edges = [1, ...boss.marks, 0].map((m) => m * boss.hpMax);
		const out: number[] = [];
		for (let i = 0; i < edges.length - 1; i++) {
			out.push(Math.max(0, Math.min(1, (boss.hp - edges[i + 1]) / (edges[i] - edges[i + 1]))));
		}
		return out.reverse();
	});
</script>

<div class="hud" style:--accent={ACCENT[snap.world]}>
	<div class="box main">
		<div class="cell score">
			<span class="label">{$t('score')}</span>
			<span class="value">{fmt(snap.score)}</span>
			<span class="sub">{$t('high')} {fmt(snap.highScore)}</span>
		</div>
		<div class="cell">
			<span class="label">{$t('level')}</span>
			<span class="value">{snap.level}</span>
			<span class="sub world">{$t(`world_${snap.world}`)}</span>
		</div>
		<div class="cell">
			<span class="label">{$t('lives')}</span>
			<span class="value">{Math.max(0, snap.lives)}</span>
			<span class="sub">&nbsp;</span>
		</div>
		{#if boss}
			<div class="cell wide" class:idle={boss.weapon === ''}>
				<span class="label">{$t('weapon')}</span>
				<span class="value">{$t(WEAPON_KEY[boss.weapon])}</span>
				{#if boss.weapon === 'berserk'}
					<span class="meter"><i style:width="{Math.min(1, boss.berserk / 10) * 100}%"></i></span>
				{:else if boss.charge > 0}
					<span class="meter"><i style:width="{boss.charge * 100}%"></i></span>
				{:else}
					<span class="sub">&nbsp;</span>
				{/if}
			</div>
		{:else}
			<div class="cell wide" class:idle={!snap.timer}>
				<span class="label">{snap.timer ? $t(snap.timer.kind) : $t('power')}</span>
				<span class="value">{snap.timer ? snap.timer.remaining.toFixed(1) : '—'}</span>
				<span class="meter"><i style:width="{timerRatio * 100}%"></i></span>
			</div>
		{/if}
		{#if !boss}
			<div class="dots" title="{$t('weather')} 50% · {$t('night')} 75%">
				<i style:width="{snap.dots * 100}%"></i>
				<em style:left="50%"></em>
				<em style:left="75%"></em>
			</div>
		{/if}
	</div>

	{#if boss}
		<div class="box boss" class:enraged={boss.phase >= 3}>
			{#if !boss.defeated}
				<div class="row">
					<span class="name">{$t('boss_hell')}</span>
					<span class="phase">{$t('phase')} {boss.phase}/3</span>
				</div>
				<div class="bar">
					{#each segments as fill, i (i)}
						<div class="seg">
							<b class="trail" style:width="{fill * 100}%"></b>
							<b class="fill" style:width="{fill * 100}%"></b>
						</div>
					{/each}
				</div>
			{:else if boss.rewardOffered}
				<div class="hint">{$t('rewardHint')}</div>
			{/if}
			<div class="row">
				<span class="hp">
					<span class="label">{$t('hp')}</span>
					{#each Array.from({ length: boss.playerHpMax }, (_, k) => k) as i (i)}
						<svg viewBox="0 0 24 22" width="16" height="14" aria-hidden="true">
							<path
								d="M12 21s-9-6.2-9-12.2C3 5.6 5.4 3 8.4 3c1.6 0 2.9.8 3.6 2 .7-1.2 2-2 3.6-2 3 0 5.4 2.6 5.4 5.8C21 14.8 12 21 12 21z"
								fill={i < boss.playerHp ? '#e5383b' : 'rgba(255,255,255,.15)'}
							/>
						</svg>
					{/each}
				</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.hud {
		position: fixed;
		top: 10px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		display: grid;
		gap: 8px;
		width: min(560px, calc(100vw - 20px));
		pointer-events: none;
		color: #f3f1ec;
		font-family: 'Segoe UI', 'Roboto', system-ui, sans-serif;
	}
	.box {
		position: relative;
		background: rgba(12, 13, 17, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
	}
	.main {
		display: grid;
		grid-template-columns: 1.4fr 1fr 0.8fr 1.2fr;
		overflow: hidden;
	}
	.cell {
		display: grid;
		gap: 1px;
		padding: 8px 14px 10px;
	}
	.cell + .cell {
		border-left: 1px solid rgba(255, 255, 255, 0.07);
	}
	.label {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 1.5px;
		color: rgba(243, 241, 236, 0.55);
	}
	.value {
		font-size: 22px;
		font-weight: 700;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}
	.sub {
		font-size: 11px;
		color: rgba(243, 241, 236, 0.55);
		font-variant-numeric: tabular-nums;
	}
	.world {
		color: var(--accent);
	}
	.idle .value {
		color: rgba(243, 241, 236, 0.3);
	}
	.meter {
		display: block;
		height: 4px;
		margin-top: 5px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}
	.meter i {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.dots {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 3px;
		background: rgba(255, 255, 255, 0.06);
	}
	.dots i {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.dots em {
		position: absolute;
		bottom: 0;
		width: 1px;
		height: 6px;
		background: rgba(255, 255, 255, 0.7);
	}
	.boss {
		display: grid;
		gap: 7px;
		padding: 9px 14px 10px;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.name {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 2px;
	}
	.phase {
		font-size: 11px;
		font-weight: 600;
		color: var(--accent);
	}
	.bar {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3px;
	}
	.seg {
		position: relative;
		height: 10px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.seg b {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
	}
	.trail {
		background: rgba(255, 240, 220, 0.85);
		transition: width 0.5s ease-in 0.3s;
	}
	.fill {
		background: linear-gradient(#ff7a3d, #c8331a);
		transition: width 0.08s;
	}
	.enraged .fill {
		background: linear-gradient(#ff3d3d, #a01414);
	}
	.hp {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.hp .label {
		margin-right: 4px;
	}
	.hint {
		padding: 4px 0;
		text-align: center;
		font-size: 13px;
		font-weight: 700;
		color: var(--accent);
	}
	@media (max-width: 480px) {
		.cell {
			padding: 6px 8px 8px;
		}
		.value {
			font-size: 17px;
		}
	}
</style>
