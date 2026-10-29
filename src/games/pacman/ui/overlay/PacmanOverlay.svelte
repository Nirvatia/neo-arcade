<script lang="ts">
	import { pacmanHudStore } from '../hud/hudStore';
	import { pressConfirm, pressMenu, pressPause, pressProfile } from '../actions/pacmanActions';

	function activate(action: () => void, event: MouseEvent): void {
		const target = event.currentTarget;

		if (target instanceof HTMLButtonElement) {
			target.blur();
		}

		action();
	}
</script>

{#if $pacmanHudStore.state === 'menu'}
	<div class="pacman-overlay">
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
	<div class="pacman-overlay">
		<button
			type="button"
			tabindex={-1}
			on:click={(event) => activate(pressConfirm, event)}
		>
			SKIP
		</button>
	</div>
{:else if $pacmanHudStore.state === 'paused'}
	<div class="pacman-overlay">
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
{:else if $pacmanHudStore.state === 'game-over'}
	<div class="pacman-overlay">
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

<style>
	.pacman-overlay {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
		border: 1px solid #223052;
		background: rgba(3, 5, 9, 0.82);
		padding: 8px;
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