<script lang="ts">
	import { pacmanHudStore } from './hudStore';
</script>

<div class="pacman-hud">
	<div class="row">
		<span class="label">SCORE</span>
		<span class="value">{String($pacmanHudStore.score).padStart(6, '0')}</span>
	</div>

	<div class="row">
		<span class="label">LIVES</span>
		<span class="value">{String($pacmanHudStore.lives).padStart(2, '0')}</span>
	</div>

	<div class="row">
		<span class="label">DOTS</span>
		<span class="value">{String($pacmanHudStore.dots).padStart(3, '0')}</span>
	</div>

	{#if $pacmanHudStore.power > 0}
		<div class="row">
			<span class="label">POWER</span>
			<span class="value power">{$pacmanHudStore.power.toFixed(1)}</span>
		</div>
	{/if}

	{#if $pacmanHudStore.result === 'win'}
		<div class="banner win">LEVEL COMPLETE</div>
	{:else if $pacmanHudStore.result === 'lose'}
		<div class="banner lose">GAME OVER</div>
	{/if}
</div>

<style>
	.pacman-hud {
		min-width: 220px;
		border: 2px solid #223052;
		background: rgba(3, 5, 9, 0.82);
		color: #e8efff;
		font-family: monospace;
		font-size: 12px;
		line-height: 1.35;
		padding: 8px 10px;
		margin-bottom: 4px;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	.label {
		color: #7585a3;
	}

	.value {
		color: #e8efff;
	}

	.power {
		color: #56d9ff;
	}

	.banner {
		margin-top: 6px;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.win {
		color: #79ff6f;
	}

	.lose {
		color: #ff4d4d;
	}
</style>