<script lang="ts">
  import { onMount } from "svelte";
  import { SnakeGame } from "$games/snake/core/GameMain.js";

  let parent: HTMLDivElement;

  onMount(() => {
    const game = new SnakeGame();
    void game.init(parent);
    return () => {
      game.destroy();
    };
  });
</script>

<div class="flex min-h-screen items-center justify-center bg-black">
  <div bind:this={parent}></div>
</div>