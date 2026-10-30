<!-- The one HUD of the game. No plate: numbers sit on the world over soft dark bands at the
	screen edges; the world's colour only marks small accents. Boss levels add the boss bar
	at the bottom of the screen and the player's fight status in the bottom-left corner.
	The secret level uses ArcadeHud instead. -->
<script lang="ts">
	import type { HudSnapshot } from './hudSnapshot';
	import { t } from '../i18n';
	import FruitIcon from './FruitIcon.svelte';

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
	const ROMAN = ['', 'I', 'II', 'III'];

	const fmt = (n: number) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
	const ratio = $derived(
		snap.timer && snap.timer.duration > 0
			? Math.max(0, Math.min(1, snap.timer.remaining / snap.timer.duration))
			: 0
	);
	/** The power timer as Pac-Man: the mouth opens wider as the time runs out. */
	const pie = $derived.by(() => {
		const open = (1 - ratio) * Math.PI * 0.98;
		const a0 = open / 2;
		const a1 = Math.PI * 2 - open / 2;
		const r = 15;
		const p = (a: number) =>
			`${(16 + Math.cos(a) * r).toFixed(2)} ${(16 + Math.sin(a) * r).toFixed(2)}`;
		return `M16 16 L${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`;
	});

	const boss = $derived(snap.boss);
	/** The bar in three phase segments (top band first), each 0..1 full. */
	const segments = $derived.by(() => {
		if (!boss) return [];
		const edges = [1, ...boss.marks, 0].map((m) => m * boss.hpMax);
		const out: number[] = [];
		for (let i = 0; i < edges.length - 1; i++) {
			const hi = edges[i];
			const lo = edges[i + 1];
			out.push(Math.max(0, Math.min(1, (boss.hp - lo) / (hi - lo))));
		}
		// drawn left to right: the last band to go is on the left
		return out.reverse();
	});
</script>

<div class="hud" style:--accent={ACCENT[snap.world]}>
	<div class="band top"></div>

	<div class="corner tl">
		<span class="label">{$t('score')}</span>
		<span class="score">{fmt(snap.score)}</span>
		<span class="minor"><i class="dot"></i>{$t('high')} {fmt(snap.highScore)}</span>
	</div>

	<div class="corner tr">
		<div class="stat">
			<span class="label">{$t('level')}</span>
			<span class="num">{snap.level}</span>
			<span class="minor">{$t(`world_${snap.world}`)}</span>
		</div>
		<div class="stat">
			<span class="label">{$t('lives')}</span>
			<span class="num">{Math.max(0, snap.lives)}</span>
		</div>
	</div>

	{#if !boss}
		<div class="progress" title="{$t('weather')} 50% · {$t('night')} 75%">
			<i style:width="{snap.dots * 100}%"></i>
			<em style:left="50%"></em>
			<em style:left="75%"></em>
		</div>
	{/if}

	{#if snap.timer}
		<div class="power">
			<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
				<circle cx="16" cy="16" r="15" fill="rgba(0,0,0,.35)" />
				<path d={pie} fill="var(--accent)" />
			</svg>
			<span class="label">{$t(snap.timer.kind)}</span>
			<span class="sec">{snap.timer.remaining.toFixed(1)}</span>
		</div>
	{/if}

	{#if boss}
		<div class="band bottom"></div>
		<div class="corner bl">
			<div class="hp">
				{#each Array.from({ length: boss.playerHpMax }, (_, k) => k) as i (i)}
					<i class:on={i < boss.playerHp}></i>
				{/each}
			</div>
			<div class="weapon" class:armed={boss.weapon !== ''}>
				<span class="label">{$t('weapon')}</span>
				<span class="name">{$t(WEAPON_KEY[boss.weapon])}</span>
				{#if boss.weapon === 'berserk'}
					<span class="gauge"><i style:width="{Math.min(1, boss.berserk / 10) * 100}%"></i></span>
				{:else if boss.charge > 0}
					<span class="gauge"><i style:width="{boss.charge * 100}%"></i></span>
				{/if}
			</div>
		</div>

		{#if !boss.defeated}
			<div class="boss" class:enraged={boss.phase >= 3}>
				<div class="boss-title">
					<span class="boss-name">{$t('boss_hell')}</span>
					<span class="boss-phase">{ROMAN[boss.phase] ?? boss.phase}</span>
				</div>
				<div class="bar">
					{#each segments as fill, i (i)}
						<div class="seg" class:spent={fill <= 0}>
							<b class="trail" style:width="{fill * 100}%"></b>
							<b class="fill" style:width="{fill * 100}%"></b>
						</div>
					{/each}
				</div>
			</div>
		{:else if boss.rewardOffered}
			<div class="boss hint">
				<span>{$t('rewardHint')}</span>
			</div>
		{/if}
	{/if}

	{#if !boss}
		<div class="fruits">
			{#each snap.fruits as kind, i (i)}
				<FruitIcon {kind} size={26} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.hud {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 20;
		color: #fbf7ee;
		font-family:
			'Bahnschrift', 'DIN Condensed', 'Arial Narrow', 'Roboto Condensed', system-ui, sans-serif;
		--shadow: 0 1px 0 rgba(0, 0, 0, 0.55), 0 0 12px rgba(0, 0, 0, 0.5);
	}
	.band {
		position: absolute;
		left: 0;
		right: 0;
		height: 96px;
	}
	.band.top {
		top: 0;
		background: linear-gradient(rgba(4, 5, 8, 0.62), rgba(4, 5, 8, 0));
	}
	.band.bottom {
		bottom: 0;
		height: 120px;
		background: linear-gradient(rgba(4, 5, 8, 0), rgba(4, 5, 8, 0.7));
	}
	.corner {
		position: absolute;
		display: grid;
		text-shadow: var(--shadow);
	}
	.tl {
		top: 14px;
		left: 22px;
	}
	.tr {
		top: 14px;
		right: 22px;
		grid-auto-flow: column;
		gap: 26px;
	}
	.bl {
		bottom: 18px;
		left: 22px;
		gap: 8px;
	}
	.label {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 3px;
		opacity: 0.7;
	}
	.score {
		font-size: 40px;
		font-weight: 700;
		line-height: 0.95;
		letter-spacing: 1px;
		font-variant-numeric: tabular-nums;
	}
	.minor {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 3px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 2px;
		opacity: 0.75;
	}
	.dot {
		width: 6px;
		height: 6px;
		background: var(--accent);
		transform: rotate(45deg);
	}
	.stat {
		display: grid;
		justify-items: end;
	}
	.num {
		font-size: 34px;
		font-weight: 700;
		line-height: 0.95;
		font-variant-numeric: tabular-nums;
	}
	.stat .minor {
		color: var(--accent);
		opacity: 1;
	}
	.progress {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(0, 0, 0, 0.35);
	}
	.progress i {
		display: block;
		height: 100%;
		background: var(--accent);
		box-shadow: 0 0 8px var(--accent);
	}
	.progress em {
		position: absolute;
		top: 0;
		width: 2px;
		height: 7px;
		background: #fbf7ee;
	}
	.power {
		position: absolute;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 8px;
		text-shadow: var(--shadow);
	}
	.power .label {
		opacity: 1;
		color: var(--accent);
	}
	.sec {
		font-size: 22px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		min-width: 3ch;
	}
	.fruits {
		position: absolute;
		right: 18px;
		bottom: 14px;
		display: flex;
		gap: 4px;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
	}
	/* ── boss levels ───────────────────────────────────────────── */
	.hp {
		display: flex;
		gap: 6px;
	}
	.hp i {
		width: 16px;
		height: 16px;
		clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
		background: rgba(255, 255, 255, 0.18);
	}
	.hp i.on {
		background: linear-gradient(#ff6b5a, #c4141c);
		box-shadow: 0 0 10px #ff3b2f;
	}
	.weapon {
		display: grid;
		gap: 2px;
	}
	.weapon .name {
		font-size: 24px;
		font-weight: 700;
		line-height: 1;
		letter-spacing: 2px;
	}
	.weapon:not(.armed) .name {
		opacity: 0.35;
	}
	.gauge {
		display: block;
		width: 120px;
		height: 4px;
		background: rgba(255, 255, 255, 0.12);
	}
	.gauge i {
		display: block;
		height: 100%;
		background: var(--accent);
		box-shadow: 0 0 8px var(--accent);
	}
	.boss {
		position: absolute;
		left: 50%;
		bottom: 22px;
		transform: translateX(-50%);
		width: min(560px, calc(100vw - 340px));
		min-width: 280px;
	}
	.boss-title {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 6px;
		text-shadow: var(--shadow);
	}
	.boss-name {
		font-size: 15px;
		font-weight: 700;
		letter-spacing: 6px;
	}
	.boss-phase {
		font-family: 'Georgia', 'Times New Roman', serif;
		font-size: 22px;
		font-weight: 700;
		color: var(--accent);
	}
	.bar {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 5px;
		padding: 4px;
		background: rgba(8, 4, 3, 0.75);
		clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
	}
	.seg {
		position: relative;
		height: 12px;
		background: rgba(255, 255, 255, 0.07);
		clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
	}
	.seg b {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
	}
	/* the chunk just lost lingers white, then drains */
	.trail {
		background: #fff6e8;
		transition: width 0.5s ease-in 0.35s;
	}
	.fill {
		background: linear-gradient(#ff8a3a, #c2300c 60%, #7a1606);
		transition: width 0.08s;
	}
	.enraged .fill {
		background: linear-gradient(#ff4434, #a40e10 60%, #4c0405);
		animation: throb 0.9s ease-in-out infinite;
	}
	.seg.spent {
		background: rgba(255, 255, 255, 0.04);
	}
	.hint {
		display: grid;
		place-items: center;
		padding: 10px 18px;
		background: rgba(8, 4, 3, 0.75);
		clip-path: polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%);
		font-size: 15px;
		font-weight: 700;
		letter-spacing: 3px;
		color: var(--accent);
		animation: throb 1.2s ease-in-out infinite;
	}
	@keyframes throb {
		50% {
			filter: brightness(1.35);
		}
	}
	@media (max-width: 640px) {
		.score {
			font-size: 28px;
		}
		.num {
			font-size: 24px;
		}
		.boss {
			width: calc(100vw - 32px);
			bottom: 92px;
		}
	}
</style>
