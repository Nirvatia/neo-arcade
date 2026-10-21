<script lang="ts">
	import { pacmanHudStore } from '../hud/hudStore';
	import { pressConfirm, pressMenu, pressPause, pressProfile } from '../actions/pacmanActions';

	$: modeLabel = $pacmanHudStore.mode === 'ms-pacman' ? 'MS PAC-MAN' : 'PAC-MAN';

	function activate(action: () => void, event: MouseEvent): void {
		const target = event.currentTarget;

		if (target instanceof HTMLButtonElement) {
			target.blur();
		}

		action();
	}
</script>

{#if $pacmanHudStore.state !== 'playing'}
	<div class="pacman-overlay">
		{#if $pacmanHudStore.state === 'menu'}
			<div class="title">PAC-MAN REIMAGINED</div>
			<div class="subtitle">MODE: {modeLabel}</div>
			<div class="buttons">
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => activate(pressConfirm, event)}
				>
					START
				</button>
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => activate(pressProfile, event)}
				>
					CHANGE MODE
				</button>
			</div>
		{:else if $pacmanHudStore.state === 'ready'}
			<div class="state ready">READY</div>
			<div class="subtitle">MODE: {modeLabel}</div>
			<div class="buttons">
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => activate(pressConfirm, event)}
				>
					SKIP
				</button>
			</div>
		{:else if $pacmanHudStore.state === 'paused'}
			<div class="state paused">PAUSED</div>
			<div class="buttons">
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => activate(pressPause, event)}
				>
					RESUME
				</button>
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => activate(pressMenu, event)}
				>
					MENU
				</button>
			</div>
		{:else if $pacmanHudStore.state === 'death'}
			<div class="state death">DEATH</div>
		{:else if $pacmanHudStore.state === 'level-clear'}
			<div class="state clear">LEVEL CLEAR</div>
		{:else if $pacmanHudStore.state === 'game-over'}
			<div class="state over">GAME OVER</div>
			<div class="subtitle">MODE: {modeLabel}</div>
			<div class="buttons">
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => activate(pressConfirm, event)}
				>
					PLAY AGAIN
				</button>
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => activate(pressProfile, event)}
				>
					CHANGE MODE
				</button>
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => activate(pressMenu, event)}
				>
					MENU
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.pacman-overlay {
		margin-top: 8px;
		border-top: 1px solid #223052;
		padding-top: 8px;
		display: grid;
		gap: 6px;
	}

	.title {
		color: #ffd93b;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.subtitle {
		color: #7585a3;
	}

	.state {
		font-weight: 700;
		letter-spacing: 0.1em;
	}

	.ready {
		color: #79ff6f;
	}

	.paused {
		color: #56d9ff;
	}

	.death {
		color: #ff4d4d;
	}

	.clear {
		color: #79ff6f;
	}

	.over {
		color: #ff4d4d;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	button {
		border: 1px solid #3b4f7c;
		background: #0b1322;
		color: #e8efff;
		font-family: inherit;
		font-size: 11px;
		line-height: 1;
		padding: 6px 8px;
		cursor: pointer;
	}

	button:hover {
		border-color: #56d9ff;
		color: #56d9ff;
	}
</style>