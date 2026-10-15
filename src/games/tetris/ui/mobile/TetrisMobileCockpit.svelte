<script lang="ts">
	import { onMount } from 'svelte';
	import { tetrisHud } from '../hud/hudStore.svelte.ts';
	import { tetrisFx } from '../fx/fxStore.svelte.ts';
	import { GameMain } from '../../core/GameMain';
	import { drawPiece } from '../../render/drawPiece';
	import { prepareCanvas } from '../../render/canvasUtils';
	import { TetrisCommand } from '../../core/types';

	let cockpitEl = $state<HTMLElement | null>(null);
	let stackEl = $state<HTMLElement | null>(null);
	let tstripEl = $state<HTMLElement | null>(null);
	let frameWrapEl = $state<HTMLElement | null>(null);
	let frameEl = $state<HTMLElement | null>(null);
	let stageEl = $state<HTMLDivElement | null>(null);

	let nextCanvas = $state<HTMLCanvasElement | null>(null);
	let holdCanvas = $state<HTMLCanvasElement | null>(null);
	let nextCtx = $state<CanvasRenderingContext2D | null>(null);
	let holdCtx = $state<CanvasRenderingContext2D | null>(null);

	let game = $state<GameMain | null>(null);
	let fitRaf = 0;
	let resizeObserver: ResizeObserver | null = null;

	const score = $derived(String(tetrisHud.score).padStart(6, '0'));
	const lines = $derived(String(tetrisHud.lines).padStart(4, '0'));
	const level = $derived(String(tetrisHud.level).padStart(2, '0'));
	const canHold = $derived(!tetrisHud.holdUsed);

	$effect(() => {
		if (!nextCanvas) return;

		nextCtx = prepareCanvas(nextCanvas, 196, 24);

		nextCanvas.style.width = '100%';
		nextCanvas.style.maxWidth = '196px';
		nextCanvas.style.height = 'auto';
	});

	$effect(() => {
		if (!holdCanvas) return;

		holdCtx = prepareCanvas(holdCanvas, 196, 24);

		holdCanvas.style.width = '100%';
		holdCanvas.style.maxWidth = '196px';
		holdCanvas.style.height = 'auto';
	});

	$effect(() => {
		if (!nextCtx) return;

		nextCtx.clearRect(0, 0, 196, 24);

		const piece = tetrisHud.nextQueue[0] ?? null;
		drawPiece(nextCtx, piece, 98, 12, 10, 1);
	});

	$effect(() => {
		if (!holdCtx) return;

		holdCtx.clearRect(0, 0, 196, 24);
		drawPiece(holdCtx, tetrisHud.heldPiece, 98, 12, 10, canHold ? 1 : 0.35);
	});

	function handleHold(): void {
		game?.press(TetrisCommand.HOLD);
	}

	function fitMobileCockpit(): void {
		if (!cockpitEl || !stackEl || !tstripEl || !frameEl || !frameWrapEl) {
			return;
		}

		const cockpitCss = getComputedStyle(cockpitEl);
		const stackCss = getComputedStyle(stackEl);

		const padX =
			(parseFloat(cockpitCss.paddingLeft) || 0) +
			(parseFloat(cockpitCss.paddingRight) || 0);

		const padY =
			(parseFloat(cockpitCss.paddingTop) || 0) +
			(parseFloat(cockpitCss.paddingBottom) || 0);

		const gap = parseFloat(stackCss.rowGap || stackCss.gap || '8') || 8;

		const availW = cockpitEl.clientWidth - padX;
		const hudH = tstripEl.offsetHeight;
		const availH = cockpitEl.clientHeight - padY - hudH - gap;

		const baseW = frameEl.offsetWidth;
		const baseH = frameEl.offsetHeight;

		if (availW <= 0 || availH <= 0 || baseW <= 0 || baseH <= 0) {
			return;
		}

		const scale = Math.max(0.2, Math.min(1, availW / baseW, availH / baseH));

		const scaledW = Math.max(1, Math.round(baseW * scale));
		const scaledH = Math.max(1, Math.round(baseH * scale));

		frameEl.style.transformOrigin = 'top center';
		frameEl.style.transform = `scale(${scale})`;

		frameWrapEl.style.width = `${scaledW}px`;
		frameWrapEl.style.height = `${scaledH}px`;

		stackEl.style.width = `${Math.min(Math.round(availW), scaledW)}px`;

		stackEl.classList.toggle('tetris-mobile-stack--compact', scaledW < 300);
		stackEl.classList.toggle('tetris-mobile-stack--ultra', scaledW < 250);
	}

	function scheduleFit(): void {
		cancelAnimationFrame(fitRaf);

		fitRaf = requestAnimationFrame(() => {
			fitMobileCockpit();
			fitMobileCockpit();
		});
	}

	onMount(() => {
		if (!stageEl) return;

		let destroyed = false;

		const g = new GameMain();
		game = g;

		void g
			.init(stageEl)
			.then(() => {
				if (!destroyed) {
					scheduleFit();
				}
			})
			.catch((error) => {
				console.error('[TetrisMobile] init failed', error);
			});

		const onResize = (): void => {
			scheduleFit();
		};

		window.addEventListener('resize', onResize);
		window.addEventListener('orientationchange', onResize);

		const viewport = window.visualViewport;
		if (viewport) {
			viewport.addEventListener('resize', onResize);
		}

		resizeObserver = new ResizeObserver(onResize);

		if (cockpitEl) {
			resizeObserver.observe(cockpitEl);
		}

		if (tstripEl) {
			resizeObserver.observe(tstripEl);
		}

		return () => {
			destroyed = true;

			cancelAnimationFrame(fitRaf);

			window.removeEventListener('resize', onResize);
			window.removeEventListener('orientationchange', onResize);

			if (viewport) {
				viewport.removeEventListener('resize', onResize);
			}

			if (resizeObserver) {
				resizeObserver.disconnect();
			}

			g.destroy();
			game = null;
		};
	});
</script>

<section class="tetris-mobile-cockpit" bind:this={cockpitEl}>
	<div class="tetris-mobile-stack" bind:this={stackEl}>
		<div class="tetris-mobile-tstrip" bind:this={tstripEl}>
			<div class="tetris-mobile-row-stats">
				<div class="tetris-mobile-plaque">
					<span class="tetris-mobile-lbl">Очки</span>
					<span class="tetris-mobile-val">{score}</span>
				</div>

				<div class="tetris-mobile-plaque">
					<span class="tetris-mobile-lbl">Ряды</span>
					<span class="tetris-mobile-val">{lines}</span>
				</div>

				<div class="tetris-mobile-plaque">
					<span class="tetris-mobile-lbl">Уровень</span>
					<span class="tetris-mobile-val">{level}</span>
				</div>
			</div>

			<div class="tetris-mobile-row-pieces">
				<div class="tetris-mobile-plaque">
					<span class="tetris-mobile-lbl">Следующий</span>
					<canvas class="tetris-mobile-mini" bind:this={nextCanvas}></canvas>
				</div>

				<button
					type="button"
					class="tetris-mobile-plaque"
					class:tetris-mobile-used={!canHold}
					onclick={handleHold}
					aria-label="Склад фигур"
				>
					<span class="tetris-mobile-lbl">Склад</span>
					<canvas class="tetris-mobile-mini" bind:this={holdCanvas}></canvas>
				</button>
			</div>
		</div>

		<div class="tetris-mobile-field-wrap" bind:this={frameWrapEl}>
			<div class="tetris-mobile-field-frame" bind:this={frameEl}>
				<div class="tetris-mobile-board-box">
					<div class="tetris-mobile-host" bind:this={stageEl}></div>

					{#if tetrisFx.flash}
						{#key tetrisFx.flash.key}
							<div class="tetris-mobile-stamp">
								{tetrisFx.flash.text}
							</div>
						{/key}
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.tetris-mobile-cockpit {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px;
	}

	.tetris-mobile-stack {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	.tetris-mobile-tstrip {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		padding: 8px;
		background:
			radial-gradient(120% 80% at 50% 0%, rgba(247, 217, 139, 0.07), transparent 38%),
			linear-gradient(180deg, rgba(63, 9, 9, 0.88), rgba(28, 4, 4, 0.94));
		border: 1px solid var(--tm-border);
		box-shadow:
			inset 0 1px 0 rgba(247, 217, 139, 0.12),
			inset 0 0 0 1px rgba(0, 0, 0, 0.4),
			0 10px 22px rgba(0, 0, 0, 0.25);
	}

	.tetris-mobile-tstrip::after {
		content: '';
		position: absolute;
		inset: 3px;
		border: 1px solid rgba(247, 217, 139, 0.08);
		pointer-events: none;
	}

	.tetris-mobile-row-stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
	}

	.tetris-mobile-row-pieces {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}

	.tetris-mobile-plaque {
		position: relative;
		min-width: 0;
		overflow: hidden;
		text-align: center;
		box-sizing: border-box;
		padding: 6px 5px 7px;
		background: linear-gradient(180deg, var(--tm-glass-a), var(--tm-glass-b));
		border: 1px solid rgba(232, 184, 75, 0.30);
		border-radius: 8px;
		box-shadow:
			inset 0 1px 0 rgba(247, 217, 139, 0.12),
			inset 0 -8px 14px rgba(0, 0, 0, 0.32),
			0 2px 6px rgba(0, 0, 0, 0.36);
	}

	button.tetris-mobile-plaque {
		appearance: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.tetris-mobile-plaque:active {
		transform: translateY(1px);
		filter: brightness(1.16);
	}

	.tetris-mobile-lbl {
		display: block;
		font-size: 6px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(240, 226, 196, 0.66);
		white-space: nowrap;
		overflow: hidden;
	}

	.tetris-mobile-val {
		display: block;
		font-family: var(--tetris-font-display);
		font-size: 16px;
		line-height: 1.2;
		margin-top: 2px;
		color: #ffd98d;
		font-variant-numeric: tabular-nums;
		text-shadow:
			0 0 10px var(--tm-gold-glow),
			0 1px 0 #000;
		white-space: nowrap;
		overflow: hidden;
	}

	.tetris-mobile-row-pieces .tetris-mobile-plaque {
		padding: 5px;
	}

	.tetris-mobile-mini {
		display: block;
		width: 100%;
		max-width: 196px;
		height: auto;
		aspect-ratio: 196 / 24;
		margin: 0 auto;
		background: #0d0303;
		border: 1px solid rgba(0, 0, 0, 0.8);
		box-shadow:
			inset 0 0 0 1px rgba(232, 184, 75, 0.08),
			inset 0 8px 14px rgba(0, 0, 0, 0.5);
	}

	.tetris-mobile-used .tetris-mobile-mini {
		opacity: 0.35;
		filter: saturate(0.6);
	}

	.tetris-mobile-field-wrap {
		position: relative;
		margin: 0 auto;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		min-width: 0;
		overflow: visible;
	}

	.tetris-mobile-field-frame {
		flex: none;
		position: relative;
		padding: 7px;
		background:
			radial-gradient(100% 60% at 50% 0%, rgba(247, 217, 139, 0.08), transparent 32%),
			linear-gradient(180deg, #2a0606, #120202);
		border: 1px solid rgba(232, 184, 75, 0.50);
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.8),
			inset 0 20px 34px rgba(0, 0, 0, 0.40),
			0 16px 32px rgba(0, 0, 0, 0.35);
		transform-origin: top center;
	}

	.tetris-mobile-field-frame::before {
		content: '';
		position: absolute;
		inset: 4px;
		border: 1px solid rgba(247, 217, 139, 0.14);
		pointer-events: none;
		z-index: 3;
	}

	.tetris-mobile-board-box {
		position: relative;
		line-height: 0;
		background: #0b0303;
		border: 1px solid rgba(0, 0, 0, 0.95);
		box-shadow:
			inset 0 0 0 1px rgba(232, 184, 75, 0.12),
			inset 0 0 32px rgba(0, 0, 0, 0.45);
	}

	.tetris-mobile-board-box::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		opacity: 0.55;
		background:
			repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 3px),
			radial-gradient(120% 80% at 50% 0%, rgba(247, 217, 139, 0.06), transparent 42%),
			radial-gradient(120% 90% at 50% 100%, rgba(0, 0, 0, 0.34), transparent 58%);
	}

	.tetris-mobile-host {
		line-height: 0;
	}

	.tetris-mobile-host :global(canvas) {
		display: block;
		image-rendering: pixelated;
		position: relative;
		z-index: 1;
	}

	.tetris-mobile-stamp {
		position: absolute;
		left: 50%;
		top: 36%;
		z-index: 4;
		pointer-events: none;
		white-space: nowrap;
		font-family: var(--tetris-font-display);
		font-size: 16px;
		color: var(--tetris-gold-hi);
		text-shadow:
			0 2px 0 #3f0707,
			0 0 18px rgba(247, 217, 139, 0.5);
		animation: tetris-mobile-stamp 0.95s ease-out forwards;
	}

	@keyframes tetris-mobile-stamp {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) rotate(-7deg) scale(1.9);
		}

		18% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(-7deg) scale(1);
		}

		75% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(-7deg) scale(1);
		}

		100% {
			opacity: 0;
			transform: translate(-50%, -60%) rotate(-7deg) scale(1.06);
		}
	}

	.tetris-mobile-stack--compact .tetris-mobile-val {
		font-size: 13px;
	}

	.tetris-mobile-stack--compact .tetris-mobile-lbl {
		font-size: 5px;
		letter-spacing: 0.09em;
	}

	.tetris-mobile-stack--ultra .tetris-mobile-val {
		font-size: 11px;
	}

	.tetris-mobile-stack--ultra .tetris-mobile-lbl {
		font-size: 5px;
		letter-spacing: 0.03em;
	}

	.tetris-mobile-stack--ultra .tetris-mobile-plaque {
		padding: 4px 3px 5px;
	}

	@media (max-height: 700px) {
		.tetris-mobile-cockpit {
			padding: 8px;
		}

		.tetris-mobile-stack {
			gap: 6px;
		}

		.tetris-mobile-tstrip {
			padding: 6px;
			gap: 5px;
		}
	}
</style>