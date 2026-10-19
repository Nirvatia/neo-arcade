<script lang="ts">
	import GameStage from '../../../shared/ui/GameStage.svelte';
	import PacmanHud from '../../../games/pacman/ui/hud/PacmanHud.svelte';
	import { GameMain } from '../../../games/pacman/core/GameMain';

	function initGame(container: HTMLDivElement) {
		const game = new GameMain();

		game.init(container).catch((error: unknown) => {
			console.error('PacmanPage.initGame', error);
		});

		return () => {
			game.destroy();
		};
	}
</script>

{#snippet hudTop()}
	<PacmanHud />
{/snippet}

<GameStage init={initGame} backHref="/" {hudTop} />