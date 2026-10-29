<script lang="ts">
	import { onMount } from 'svelte';
	import { GameMain } from '../../../games/pacman/core/GameMain';
	import PacmanOverlay from '../../../games/pacman/ui/overlay/PacmanOverlay.svelte';
	import PacmanDebugPanel from '../../../games/pacman/ui/debug/PacmanDebugPanel.svelte';
	import HellHud from '../../../games/pacman/ui/hud/HellHud.svelte';

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

	<HellHud />

	<div class="overlay-slot">
		<PacmanOverlay />
	</div>

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

	.overlay-slot {
		position: absolute;
		left: 50%;
		bottom: 12px;
		transform: translateX(-50%);
		min-width: 280px;
	}
</style>