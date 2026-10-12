<script lang="ts">
	import { tetrisOverlay } from '../overlay/overlayStore.svelte.ts';
	import { GamePhase } from '../../core/types';

	interface Props {
		moveLeft: () => void;
		moveRight: () => void;
		softDrop: () => void;
		rotate: () => void;
		hardDrop: () => void;
		holdPiece: () => void;
		togglePause: () => void;
	}

	let {
		moveLeft,
		moveRight,
		softDrop,
		rotate,
		hardDrop,
		holdPiece,
		togglePause
	}: Props = $props();

	let activeAction: (() => void) | null = null;
	let activePointerId = -1;
	let repeatMode: 'none' | 'move' | 'soft' = 'none';
	let raf = 0;
	let lastTime = 0;
	let delayRemaining = 0;
	let repeatAcc = 0;
	let repeatInterval = 1;

	function tick(now: number): void {
		if (!activeAction || repeatMode === 'none') {
			return;
		}
		const dt = Math.min(100, now - lastTime);
		lastTime = now;
		if (delayRemaining > 0) {
			delayRemaining -= dt;
		} else {
			repeatAcc += dt;
			while (repeatAcc >= repeatInterval) {
				activeAction();
				repeatAcc -= repeatInterval;
			}
		}
		raf = requestAnimationFrame(tick);
	}

	function startAction(action: () => void, mode: 'once' | 'move' | 'soft'): void {
		stopAction();
		action();
		if (mode === 'once') {
			return;
		}
		activeAction = action;
		repeatMode = mode;
		delayRemaining = mode === 'soft' ? 0 : 180;
		repeatInterval = mode === 'soft' ? 55 : 75;
		repeatAcc = 0;
		lastTime = performance.now();
		raf = requestAnimationFrame(tick);
	}

	function stopAction(): void {
		if (raf) {
			cancelAnimationFrame(raf);
		}
		raf = 0;
		activeAction = null;
		activePointerId = -1;
		repeatMode = 'none';
		delayRemaining = 0;
		repeatAcc = 0;
	}

	function press(e: PointerEvent, action: () => void, mode: 'once' | 'move' | 'soft'): void {
		e.preventDefault();
		if (e.currentTarget instanceof HTMLElement) {
			e.currentTarget.setPointerCapture(e.pointerId);
		}
		startAction(action, mode);
		activePointerId = e.pointerId;
	}

	function release(e: PointerEvent): void {
		if (e.pointerId === activePointerId) {
			stopAction();
		}
	}

	$effect(() => {
		return () => {
			stopAction();
		};
	});

	$effect(() => {
		if (tetrisOverlay.phase !== GamePhase.PLAYING) {
			stopAction();
		}
	});
</script>

<div class="tetris-touch" role="group" aria-label="Сенсорное управление">
	<button
		type="button"
		class="tetris-touch__btn"
		aria-label="Влево"
		onpointerdown={(e: PointerEvent) => press(e, moveLeft, 'move')}
		onpointerup={release}
		onpointercancel={release}
		onpointerleave={release}
	>
		◀
	</button>
	<button
		type="button"
		class="tetris-touch__btn"
		aria-label="Вправо"
		onpointerdown={(e: PointerEvent) => press(e, moveRight, 'move')}
		onpointerup={release}
		onpointercancel={release}
		onpointerleave={release}
	>
		▶
	</button>
	<button
		type="button"
		class="tetris-touch__btn"
		aria-label="Мягкий сброс"
		onpointerdown={(e: PointerEvent) => press(e, softDrop, 'soft')}
		onpointerup={release}
		onpointercancel={release}
		onpointerleave={release}
	>
		▼
	</button>
	<button
		type="button"
		class="tetris-touch__btn"
		aria-label="Поворот"
		onpointerdown={(e: PointerEvent) => press(e, rotate, 'once')}
		onpointerup={release}
		onpointercancel={release}
		onpointerleave={release}
	>
		⟳
	</button>
	<button
		type="button"
		class="tetris-touch__btn"
		aria-label="Жёсткий сброс"
		onpointerdown={(e: PointerEvent) => press(e, hardDrop, 'once')}
		onpointerup={release}
		onpointercancel={release}
		onpointerleave={release}
	>
		СБРОС
	</button>
	<button
		type="button"
		class="tetris-touch__btn"
		aria-label="Склад"
		onpointerdown={(e: PointerEvent) => press(e, holdPiece, 'once')}
		onpointerup={release}
		onpointercancel={release}
		onpointerleave={release}
	>
		СКЛАД
	</button>
	<button
		type="button"
		class="tetris-touch__btn"
		aria-label="Пауза"
		onpointerdown={(e: PointerEvent) => press(e, togglePause, 'once')}
		onpointerup={release}
		onpointercancel={release}
		onpointerleave={release}
	>
		❚❚
	</button>
</div>

<style>
	.tetris-touch {
		display: none;
		gap: 10px;
		flex-wrap: wrap;
		justify-content: center;
		touch-action: none;
		user-select: none;
	}

	.tetris-touch__btn {
		font-family: var(--tetris-font-display);
		font-size: 16px;
		min-width: 56px;
		height: 56px;
		background: var(--tetris-paper);
		border: 3px solid var(--tetris-ink);
		box-shadow: 4px 4px 0 var(--tetris-ink);
		touch-action: none;
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
	}

	.tetris-touch__btn:active {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0 var(--tetris-ink);
	}

	@media (pointer: coarse), (max-width: 900px) {
		.tetris-touch {
			display: flex;
		}
	}

	@media (max-width: 640px) {
		.tetris-touch__btn {
			min-width: 52px;
			height: 52px;
			font-size: 14px;
		}
	}
</style>