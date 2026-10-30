<script lang="ts">
	import type { FruitKind } from '../../logic/bonuses/fruitCatalog';
	import { drawFruit } from '../../render/items/fruit/FruitView';

	/** One fruit drawn by the game's own fruit art, still (no breathing), `size` css px. */
	let { kind, size = 22 }: { kind: FruitKind; size?: number } = $props();
	let canvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		if (!canvas) return;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = Math.round(size * dpr);
		canvas.height = Math.round(size * dpr);
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, size, size);
		// the icon is one tile: the fruit and its glow stay inside it
		drawFruit(ctx, kind, size / 2, size / 2, size, 0);
	});
</script>

<canvas bind:this={canvas} style:width="{size}px" style:height="{size}px"></canvas>

<style>
	canvas {
		display: block;
	}
</style>
