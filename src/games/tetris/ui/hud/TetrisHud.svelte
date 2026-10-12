<script lang="ts">
	import { tetrisHud } from './hudStore.svelte.ts';
	import { drawPiece } from '../../render/drawPiece';
	import { prepareCanvas } from '../../render/canvasUtils.ts';

	let holdCanvas = $state<HTMLCanvasElement | null>(null);
	let holdCtx = $state<CanvasRenderingContext2D | null>(null);

	$effect(() => {
		if (!holdCanvas) return;
		holdCtx = prepareCanvas(holdCanvas, 196, 70);
	});

	const score = $derived(String(tetrisHud.score).padStart(6, '0'));
	const highScore = $derived(String(tetrisHud.highScore).padStart(6, '0'));
	const planTarget = 10;
	const planPercent = $derived((tetrisHud.planProgress / planTarget) * 100);

	$effect(() => {
		if (!holdCtx) return;
		holdCtx.clearRect(0, 0, 196, 70);
		const alpha = tetrisHud.holdUsed ? 0.35 : 1;
		drawPiece(holdCtx, tetrisHud.heldPiece, 98, 35, 16, alpha);
	});
</script>

<aside class="tetris-column">
	<section class="tetris-panel tetris-panel--tilt-left">
		<h3 class="tetris-panel__title">СКЛАД</h3>
		<canvas class="tetris-panel__canvas" bind:this={holdCanvas}></canvas>
		<p class="tetris-panel__hint">[C] — отложить фигуру на чёрный день</p>
	</section>
	<section class="tetris-panel tetris-panel--tilt-right">
		<h3 class="tetris-panel__title">СВОДКА</h3>
		<div class="tetris-summary">
			<div class="tetris-summary__row">
				<span class="tetris-summary__label">Очки труда</span>
				<span class="tetris-summary__value">{score}</span>
			</div>
			<div class="tetris-summary__row">
				<span class="tetris-summary__label">Рядов уложено</span>
				<span class="tetris-summary__value">{tetrisHud.lines}</span>
			</div>
			<div class="tetris-summary__row">
				<span class="tetris-summary__label">Пятилетка №</span>
				<span class="tetris-summary__value">{tetrisHud.level}</span>
			</div>
			<div class="tetris-summary__row">
				<span class="tetris-summary__label">Рекорд бригады</span>
				<span class="tetris-summary__value tetris-summary__value--gold">{highScore}</span>
			</div>
		</div>
		<div class="tetris-summary__plan">
			<span class="tetris-summary__label">
				План пятилетки: <b>{tetrisHud.planProgress}/{planTarget}</b>
			</span>
			<div class="tetris-summary__bar"><i style:width="{planPercent}%"></i></div>
		</div>
	</section>
</aside>

<style>
	.tetris-summary__row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		border-bottom: 2px dashed rgba(23, 18, 16, 0.25);
		padding: 6px 0;
	}

	.tetris-summary__label {
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 500;
	}

	.tetris-summary__value {
		font-family: var(--tetris-font-display);
		font-size: 24px;
		line-height: 1;
	}

	.tetris-summary__value--gold {
		color: #b07c10;
	}

	.tetris-summary__plan {
		margin-top: 12px;
	}

	.tetris-summary__plan b {
		font-family: var(--tetris-font-display);
		color: var(--tetris-red);
	}

	.tetris-summary__bar {
		margin-top: 6px;
		height: 13px;
		border: 2px solid var(--tetris-ink);
		background: repeating-linear-gradient(
			45deg,
			rgba(23, 18, 16, 0.14) 0 6px,
			transparent 6px 12px
		);
	}

	.tetris-summary__bar i {
		display: block;
		height: 100%;
		width: 0;
		background: var(--tetris-red);
		transition: width 0.3s;
	}
</style>