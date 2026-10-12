<script lang="ts">
	import { tetrisHud } from '../hud/hudStore.svelte.ts';
	import { drawPiece } from '../../render/drawPiece';
	import { prepareCanvas } from '../../render/canvasUtils.ts';

	let nextCanvas = $state<HTMLCanvasElement | null>(null);
	let nextCtx = $state<CanvasRenderingContext2D | null>(null);

	$effect(() => {
		if (!nextCanvas) {
			return;
		}
		nextCtx = prepareCanvas(nextCanvas, 196, 222);
	});

	$effect(() => {
		if (!nextCtx) {
			return;
		}
		nextCtx.clearRect(0, 0, 196, 222);
		for (let i = 0; i < 3 && i < tetrisHud.nextQueue.length; i++) {
			const piece = tetrisHud.nextQueue[i] ?? null;
			const alpha = i === 0 ? 1 : i === 1 ? 0.75 : 0.55;
			drawPiece(nextCtx, piece, 98, 38 + i * 74, 17, alpha);
		}
	});
</script>

<aside class="tetris-column">
	<section class="tetris-panel tetris-panel--tilt-right">
		<h3 class="tetris-panel__title">ПОСТАВКА</h3>
		<canvas class="tetris-panel__canvas" bind:this={nextCanvas}></canvas>
		<p class="tetris-panel__hint">Что привезли — то и укладываем</p>
	</section>
	<section class="tetris-panel tetris-panel--tilt-left">
		<h3 class="tetris-panel__title">ДОСКА ПОЧЁТА</h3>
		<ol class="tetris-hall">
			<li class="tetris-hall__item tetris-hall__item--empty">пока пусто — стань первым</li>
		</ol>
	</section>
	<section class="tetris-panel tetris-panel--tilt-right tetris-slogan">
		«Партия сказала: надо —<br />отвечаем: <b>будет построено!</b>»
		<div class="tetris-slogan__stamp"><span class="tetris-stamp">ГОСТ 1922</span></div>
	</section>
</aside>

<style>
	.tetris-hall {
		list-style: none;
	}

	.tetris-hall__item {
		font-family: var(--tetris-font-display);
		font-size: 15px;
		display: flex;
		gap: 10px;
		align-items: baseline;
		padding: 5px 0;
		border-bottom: 2px dotted rgba(23, 18, 16, 0.3);
	}

	.tetris-hall__item::before {
		content: '★';
		color: var(--tetris-red);
		font-size: 13px;
	}

	.tetris-hall__item--empty {
		font-family: var(--tetris-font-body);
		font-size: 12px;
		letter-spacing: 0.08em;
		opacity: 0.6;
		text-transform: uppercase;
	}

	.tetris-hall__item--empty::before {
		content: '—';
	}

	.tetris-slogan {
		font-size: 17px;
		line-height: 1.4;
		font-weight: 500;
	}

	.tetris-slogan b {
		color: var(--tetris-red);
		font-size: 21px;
	}

	.tetris-slogan__stamp {
		margin-top: 12px;
	}
</style>