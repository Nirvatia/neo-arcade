<!-- The secret level is our arcade, so it gets an arcade HUD: 1UP, HIGH SCORE and the round
	on top, the tries in reserve and the rounds' fruits at the bottom, blocky white lettering. -->
<script lang="ts">
	import type { HudSnapshot } from './hudSnapshot';
	import { t } from '../i18n';
	import FruitIcon from './FruitIcon.svelte';
	import LifeIcon from './LifeIcon.svelte';

	let { snap }: { snap: HudSnapshot } = $props();
	const score = (n: number) => (n > 0 ? String(Math.floor(n)) : '00');
	// the tries in reserve, not the one on the board (the arcade's own, not the game's lives)
	const reserve = $derived(
		Array.from({ length: Math.min(5, Math.max(0, snap.lives - 1)) }, (_, i) => i)
	);
</script>

<div class="arcade">
	<div class="top">
		<div class="col">
			<span class="label blink">{$t('oneUp')}</span>
			<span class="num">{score(snap.score)}</span>
		</div>
		<div class="col">
			<span class="label">{$t('highScore')}</span>
			<span class="num">{score(snap.highScore)}</span>
		</div>
		<div class="col">
			<span class="label">{$t('round')}</span>
			<span class="num">{snap.level}</span>
		</div>
	</div>
	<div class="bottom">
		<div class="row">
			{#each reserve as i (i)}<LifeIcon ms={snap.profile === 'ms-pacman'} size={20} />{/each}
		</div>
		<div class="row">
			{#each snap.fruits as kind, i (i)}<FruitIcon {kind} size={22} />{/each}
		</div>
	</div>
</div>

<style>
	.arcade {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 20;
		color: #fff;
		font-family: 'Press Start 2P', 'Courier New', monospace;
		font-weight: 700;
		text-transform: uppercase;
		image-rendering: pixelated;
	}
	.top {
		position: absolute;
		top: 8px;
		left: 50%;
		transform: translateX(-50%);
		width: min(560px, calc(100vw - 24px));
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
	}
	.col {
		display: grid;
		justify-items: center;
		gap: 4px;
	}
	.label {
		font-size: 15px;
		letter-spacing: 2px;
	}
	.num {
		font-size: 15px;
		letter-spacing: 2px;
		justify-self: end;
		padding-right: 20%;
	}
	.blink {
		animation: blink 0.53s steps(1) infinite;
	}
	.bottom {
		position: absolute;
		bottom: 8px;
		left: 50%;
		transform: translateX(-50%);
		width: min(560px, calc(100vw - 24px));
		display: flex;
		justify-content: space-between;
	}
	.row {
		display: flex;
		gap: 4px;
		align-items: center;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
</style>
