<script lang="ts">
	import { onMount } from 'svelte';
	import { GameMain } from '../../../games/pacman/core/GameMain';
	import PacmanDebugPanel from '../../../games/pacman/ui/debug/PacmanDebugPanel.svelte';
	import PacmanUi from '../../../games/pacman/ui/PacmanUi.svelte';

	const isDev = import.meta.env.DEV;

	let container: HTMLDivElement | undefined = undefined;

	onMount(() => {
		if (!container) {
			console.error('PacmanPage.onMount', 'container is not initialized');
			return;
		}

		const game = new GameMain();
		void game.init(container);

		return () => {
			game.destroy();
		};
	});
</script>

<div class="pacman-page">
	<div class="stage" bind:this={container}></div>

	<PacmanUi />

	{#if isDev}
		<PacmanDebugPanel />
	{/if}
</div>

<style>
	.pacman-page {
		position: fixed;
		inset: 0;
		background: #030509;
		overflow: hidden;
		font-family: monospace;
		font-size: 12px;
		color: #e8efff;
	}

	.stage {
		position: absolute;
		inset: 0;
		line-height: 0;
	}
</style>
