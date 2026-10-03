<!-- src/routes/games/snake/+page.svelte -->
<script lang="ts">
	import GameStage from '$shared/ui/GameStage.svelte';
	import { SnakeGame } from '$games/snake/core/GameMain.js';
	import SnakeHud from '$games/snake/ui/SnakeHud.svelte';

	let game: SnakeGame | null = $state(null);
</script>

<svelte:head>
	<title>SNAKE · NEO ARCADE</title>
</svelte:head>

{#snippet hudTop()}
	<SnakeHud part="top" />
{/snippet}

{#snippet hudBottom()}
	<SnakeHud part="bottom" />
{/snippet}

<GameStage
	init={(el) => {
		const g = new SnakeGame();
		game = g;
		void g.init(el).catch((e) => console.error('[Snake] init failed', e));

		return () => {
			game = null;
			g.destroy();
		};
	}}
	touch={{
		direction: (dir) => game?.touchDirection(dir),
		pause: () => game?.touchPause(),
		mute: () => game?.touchMute()
	}}
	{hudTop}
	{hudBottom}
/>