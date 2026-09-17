<script lang="ts">
	import { onMount } from 'svelte';
	import { SnakeGame } from '$games/snake/core/GameMain.js';
	import ArcadeShell from '$shared/ui/ArcadeShell.svelte';

	let parent = $state<HTMLDivElement | undefined>(undefined);

	onMount(() => {
		const container = parent;

		if (!container) {
			return;
		}

		const game = new SnakeGame();
		void game.init(container);

		return () => {
			game.destroy();
		};
	});
</script>

<ArcadeShell
	title="Snake"
	subtitle="Bit maze. Move carefully, collect bits, and reach the exit."
	backHref="/"
	backLabel="Back to arcade"
>
	<section
		aria-label="Snake game area"
		class="flex min-h-[70vh] items-center justify-center overflow-hidden rounded border border-arcade-line bg-black"
	>
		<div bind:this={parent}></div>
	</section>
</ArcadeShell>
