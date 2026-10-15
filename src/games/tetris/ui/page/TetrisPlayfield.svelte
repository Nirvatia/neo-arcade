<script lang="ts">
	import { onMount } from 'svelte';
	import { tetrisFx } from '../fx/fxStore.svelte.ts';
	import { tetrisHud } from '../hud/hudStore.svelte.ts';
	import { tetrisOverlay } from '../overlay/overlayStore.svelte.ts';
	import { GamePhase, TetrisCommand } from '../../core/types';
	import { GameMain } from '../../core/GameMain';
	import TetrisTouchControls from './TetrisTouchControls.svelte';

	let game = $state<GameMain | null>(null);
	let centerEl = $state<HTMLElement | null>(null);
	let frameEl = $state<HTMLDivElement | null>(null);
	let frameWrapEl = $state<HTMLDivElement | null>(null);
	let stageEl = $state<HTMLDivElement | null>(null);
	let touchbarEl = $state<HTMLDivElement | null>(null);
	let shaking = $state(false);
	let lastShake = 0;
	let shakeRaf = 0;
	let fitRaf = 0;
	let gestureActive = false;
	let gesturePointerId = -1;
	let gestureStartX = 0;
	let gestureStartY = 0;

	function parseMetric(value: string): number {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function fit(): void {
		if (!centerEl || !frameEl || !frameWrapEl) {
			return;
		}

		const w = frameEl.offsetWidth;
		const h = frameEl.offsetHeight;

		if (w <= 0 || h <= 0) {
			return;
		}

		const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
		const viewportHeight = window.visualViewport
			? window.visualViewport.height
			: window.innerHeight;

		const pageEl = centerEl.closest('.tetris-page');
		let chromeHeight = 0;

		if (pageEl) {
			for (const el of Array.from(pageEl.querySelectorAll('[data-tetris-chrome]'))) {
				if (el instanceof HTMLElement) {
					chromeHeight += el.offsetHeight;
				}
			}
		}

		let availW = viewportWidth - 32;
		let availH = viewportHeight - chromeHeight - 48;

		const stage = centerEl.parentElement;

		if (stage instanceof HTMLElement) {
			const styles = getComputedStyle(stage);
			const paddingTop = parseMetric(styles.paddingTop);
			const paddingBottom = parseMetric(styles.paddingBottom);
			const paddingLeft = parseMetric(styles.paddingLeft);
			const paddingRight = parseMetric(styles.paddingRight);
			const gap = parseMetric(
				styles.getPropertyValue('column-gap') ||
					styles.getPropertyValue('row-gap') ||
					styles.getPropertyValue('gap') ||
					'0'
			);

			const compact = window.matchMedia('(max-width: 980px)').matches;

			let reservedWidth = 0;
			let reservedVertical = 0;
			let visibleSides = 0;

			for (const child of Array.from(stage.children)) {
				if (!(child instanceof HTMLElement) || child === centerEl) {
					continue;
				}

				if (
					child.hasAttribute('data-tetris-chrome') ||
					child.classList.contains('tetris-page__banner')
				) {
					continue;
				}

				if (child.offsetWidth <= 0 && child.offsetHeight <= 0) {
					continue;
				}

				if (compact) {
					reservedVertical += child.offsetHeight;
				} else {
					reservedWidth += child.offsetWidth;
				}

				visibleSides += 1;
			}

			if (compact) {
				availW = stage.clientWidth - paddingLeft - paddingRight;
				availH =
					viewportHeight -
					chromeHeight -
					paddingTop -
					paddingBottom -
					reservedVertical -
					gap * visibleSides -
					24;
			} else {
				availW =
					stage.clientWidth - paddingLeft - paddingRight - reservedWidth - gap * visibleSides;
				availH = viewportHeight - chromeHeight - paddingTop - paddingBottom - 24;
			}
		}

		if (window.matchMedia('(max-width: 768px)').matches) {
			availH = Math.min(availH, viewportHeight * 0.66);
		}

		if (touchbarEl && touchbarEl.offsetHeight > 0) {
			availH -= touchbarEl.offsetHeight + 14;
		}

		availW = Math.max(160, availW);
		availH = Math.max(220, availH);

		const scale = Math.min(1, availW / w, availH / h);
		const clamped = Number.isFinite(scale) ? Math.max(0.28, scale) : 1;

		frameEl.style.transformOrigin = 'top left';
		frameEl.style.transform = `scale(${clamped})`;
		frameWrapEl.style.width = `${Math.max(1, Math.round(w * clamped))}px`;
		frameWrapEl.style.height = `${Math.max(1, Math.round(h * clamped))}px`;
	}

	$effect(() => {
		const k = tetrisFx.shake;
		if (k > lastShake) {
			lastShake = k;
			shaking = false;
			shakeRaf = requestAnimationFrame(() => {
				shaking = true;
			});
		}
		return () => {
			cancelAnimationFrame(shakeRaf);
		};
	});

	$effect(() => {
		if (!centerEl) {
			return;
		}
		const observer = new ResizeObserver(() => {
			fit();
		});
		if (centerEl.parentElement) {
			observer.observe(centerEl.parentElement);
		}
		if (touchbarEl) {
			observer.observe(touchbarEl);
		}
		return () => {
			observer.disconnect();
		};
	});

	function handleShakeEnd(e: AnimationEvent): void {
		if (e.animationName === 'tetris-field-shake') {
			shaking = false;
		}
	}

	function press(command: TetrisCommand): void {
		if (!game) {
			throw new Error('[TetrisPlayfield] Game is not initialized');
		}
		game.press(command);
	}

	function moveLeft(): void {
		press(TetrisCommand.MOVE_LEFT);
	}

	function moveRight(): void {
		press(TetrisCommand.MOVE_RIGHT);
	}

	function softDrop(): void {
		press(TetrisCommand.SOFT_DROP);
	}

	function rotate(): void {
		press(TetrisCommand.ROTATE);
	}

	function hardDrop(): void {
		press(TetrisCommand.HARD_DROP);
	}

	function holdPiece(): void {
		press(TetrisCommand.HOLD);
	}

	function togglePause(): void {
		press(TetrisCommand.TOGGLE_PAUSE);
	}

	function onWellPointerDown(e: PointerEvent): void {
		if (e.pointerType === 'mouse') {
			return;
		}
		if (tetrisOverlay.phase !== GamePhase.PLAYING) {
			return;
		}
		e.preventDefault();
		gestureActive = true;
		gesturePointerId = e.pointerId;
		gestureStartX = e.clientX;
		gestureStartY = e.clientY;
		if (e.currentTarget instanceof HTMLElement) {
			e.currentTarget.setPointerCapture(e.pointerId);
		}
	}

	function onWellPointerUp(e: PointerEvent): void {
		if (!gestureActive || e.pointerId !== gesturePointerId) {
			return;
		}
		gestureActive = false;
		const dx = e.clientX - gestureStartX;
		const dy = e.clientY - gestureStartY;
		const adx = Math.abs(dx);
		const ady = Math.abs(dy);
		const tapThreshold = 12;
		if (adx < tapThreshold && ady < tapThreshold) {
			rotate();
			return;
		}
		if (adx > ady) {
			if (dx > 0) {
				moveRight();
			} else {
				moveLeft();
			}
			return;
		}
		if (dy > 0) {
			if (ady > 72) {
				hardDrop();
			} else {
				softDrop();
			}
			return;
		}
		rotate();
	}

	function onWellPointerCancel(e: PointerEvent): void {
		if (e.pointerId === gesturePointerId) {
			gestureActive = false;
		}
	}

	onMount(() => {
		if (!stageEl) {
			return;
		}
		const g = new GameMain();
		game = g;
		void g
			.init(stageEl)
			.then(() => {
				fitRaf = requestAnimationFrame(fit);
			})
			.catch((e) => {
				console.error('[Tetris] init failed', e);
			});

		const onFit = (): void => {
			fit();
		};
		window.addEventListener('resize', onFit);
		window.addEventListener('orientationchange', onFit);
		const viewport = window.visualViewport;
		if (viewport) {
			viewport.addEventListener('resize', onFit);
		}
		return () => {
			cancelAnimationFrame(fitRaf);
			window.removeEventListener('resize', onFit);
			window.removeEventListener('orientationchange', onFit);
			if (viewport) {
				viewport.removeEventListener('resize', onFit);
			}
			g.destroy();
			game = null;
		};
	});
</script>

<section class="tetris-field" bind:this={centerEl}>
	<div class="tetris-field__box" bind:this={frameWrapEl}>
		<div class="tetris-field__frame" bind:this={frameEl}>
			<svg class="tetris-field__corner tetris-field__corner--tl" viewBox="0 0 100 100">
				<path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z" />
			</svg>
			<svg class="tetris-field__corner tetris-field__corner--tr" viewBox="0 0 100 100">
				<path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z" />
			</svg>
			<svg class="tetris-field__corner tetris-field__corner--bl" viewBox="0 0 100 100">
				<path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z" />
			</svg>
			<svg class="tetris-field__corner tetris-field__corner--br" viewBox="0 0 100 100">
				<path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z" />
			</svg>
			<div class="tetris-field__head">
				<span class="tetris-field__head-label">УЧАСТОК 10 × 20 — НЕ ЗЕВАТЬ!</span>
				<span class="tetris-field__tempo">ТЕМП ×{tetrisHud.tempo.toFixed(1)}</span>
			</div>
			<div
				class="tetris-field__well"
				class:tetris-field__well--shake={shaking}
				onanimationend={handleShakeEnd}
				onpointerdown={onWellPointerDown}
				onpointerup={onWellPointerUp}
				onpointercancel={onWellPointerCancel}
			>
				<div class="tetris-field__host" bind:this={stageEl}></div>
				{#if tetrisFx.flash}
					{#key tetrisFx.flash.key}
						<div class="tetris-field__flash tetris-field__flash--on">
							{tetrisFx.flash.text}
						</div>
					{/key}
				{/if}
				{#if tetrisFx.banner}
					{#key tetrisFx.banner.key}
						<div class="tetris-field__ribbon tetris-field__ribbon--on">
							<span>{tetrisFx.banner.text}</span>
						</div>
					{/key}
				{/if}
			</div>
		</div>
	</div>
	<div class="tetris-field__touch" bind:this={touchbarEl}>
		<TetrisTouchControls
			{moveLeft}
			{moveRight}
			{softDrop}
			{rotate}
			{hardDrop}
			{holdPiece}
			{togglePause}
		/>
	</div>
</section>

<style>
	.tetris-field {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 14px;
		min-width: 0;
	}

	.tetris-field__box {
		position: relative;
		margin: 0 auto;
	}

	.tetris-field__frame {
		position: relative;
		background: var(--tetris-ink);
		padding: 12px 12px 15px;
		border: 4px solid var(--tetris-paper);
		box-shadow:
			0 0 0 4px var(--tetris-ink),
			16px 16px 0 rgba(15, 10, 8, 0.45);
	}

	.tetris-field__head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 14px;
		color: var(--tetris-paper);
		font-family: var(--tetris-font-display);
		font-size: 11px;
		letter-spacing: 0.18em;
		padding: 0 2px 10px;
	}

	.tetris-field__tempo {
		color: var(--tetris-gold);
	}

	.tetris-field__well {
		position: relative;
		line-height: 0;
		touch-action: none;
	}

	.tetris-field__well--shake {
		animation: tetris-field-shake 0.18s linear;
	}

	.tetris-field__host {
		line-height: 0;
	}

	.tetris-field__corner {
		position: absolute;
		width: 22px;
		height: 22px;
		fill: var(--tetris-gold);
		filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.6));
	}

	.tetris-field__corner--tl {
		top: -13px;
		left: -13px;
	}

	.tetris-field__corner--tr {
		top: -13px;
		right: -13px;
	}

	.tetris-field__corner--bl {
		bottom: -13px;
		left: -13px;
	}

	.tetris-field__corner--br {
		bottom: -13px;
		right: -13px;
	}

	.tetris-field__flash {
		position: absolute;
		top: 38%;
		left: 50%;
		z-index: 12;
		pointer-events: none;
		opacity: 0;
		transform: translate(-50%, -50%) rotate(-6deg);
		font-family: var(--tetris-font-display);
		font-size: 22px;
		color: var(--tetris-paper);
		background: var(--tetris-red);
		border: 3px solid var(--tetris-ink);
		box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.5);
		padding: 8px 20px;
		white-space: nowrap;
	}

	.tetris-field__flash--on {
		animation: tetris-field-flash 1.05s ease forwards;
	}

	.tetris-field__ribbon {
		position: absolute;
		top: 22%;
		left: 0;
		right: 0;
		z-index: 11;
		display: flex;
		justify-content: center;
		pointer-events: none;
		opacity: 0;
	}

	.tetris-field__ribbon span {
		background: var(--tetris-gold);
		border: 3px solid var(--tetris-ink);
		font-family: var(--tetris-font-display);
		font-size: 19px;
		padding: 7px 24px;
		box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.45);
		transform: skewX(-8deg);
		white-space: nowrap;
	}

	.tetris-field__ribbon--on {
		opacity: 1;
	}

	.tetris-field__ribbon--on span {
		animation: tetris-field-ribbon 2.2s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
	}

	.tetris-field__touch {
		display: flex;
		touch-action: none;
		user-select: none;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.tetris-field__box {
		width: max-content;
		height: max-content;
	}

	.tetris-field__frame {
		width: max-content;
	}

	.tetris-field__host {
		width: max-content;
	}

	@keyframes tetris-field-shake {
		0%,
		100% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(-4px, 3px);
		}
		50% {
			transform: translate(3px, -3px);
		}
		75% {
			transform: translate(-2px, -2px);
		}
	}

	@keyframes tetris-field-flash {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) rotate(-6deg) scale(0.4);
		}
		14% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(-6deg) scale(1.12);
		}
		24%,
		75% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(-6deg) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -60%) rotate(-6deg) scale(1);
		}
	}

	@keyframes tetris-field-ribbon {
		0% {
			transform: translateX(-75vw) skewX(-8deg);
			opacity: 0;
		}
		12%,
		78% {
			transform: translateX(0) skewX(-8deg);
			opacity: 1;
		}
		100% {
			transform: translateX(75vw) skewX(-8deg);
			opacity: 0;
		}
	}

	@media (max-width: 900px) {
		.tetris-field__head {
			font-size: 9px;
			letter-spacing: 0.08em;
		}
	}
</style>
