<script lang="ts">
	import { tetrisOverlay } from '../overlay/overlayStore.svelte.ts';
	import { getTetrisActions } from '../actions/actionsStore.svelte.ts';
	import { GamePhase, TetrisCommand } from '../../core/types';

	const phase = $derived(tetrisOverlay.phase);

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

	function moveLeft(): void {
		const actions = getTetrisActions();
		if (actions) {
			actions.press(TetrisCommand.MOVE_LEFT);
		}
	}

	function moveRight(): void {
		const actions = getTetrisActions();
		if (actions) {
			actions.press(TetrisCommand.MOVE_RIGHT);
		}
	}

	function softDrop(): void {
		const actions = getTetrisActions();
		if (actions) {
			actions.press(TetrisCommand.SOFT_DROP);
		}
	}

	function hardDrop(): void {
		const actions = getTetrisActions();
		if (actions) {
			actions.press(TetrisCommand.HARD_DROP);
		}
	}

	function rotate(): void {
		const actions = getTetrisActions();
		if (actions) {
			actions.press(TetrisCommand.ROTATE);
		}
	}

	$effect(() => {
		return () => {
			stopAction();
		};
	});

	$effect(() => {
		if (phase !== GamePhase.PLAYING) {
			stopAction();
		}
	});
</script>

<section class="tetris-mobile-controls">
	<button
		class="tetris-mobile-ctl"
		aria-label="Сброс вниз"
		onpointerdown={(e: PointerEvent) => press(e, hardDrop, 'once')}
		onpointerup={release}
		onpointercancel={release}
		onpointerleave={release}
	>
		<svg viewBox="0 0 24 24">
			<path
				d="M5 4l7 6 7-6M5 12l7 6 7-6"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	<div class="tetris-mobile-pad">
		<button
			class="tetris-mobile-ctl"
			aria-label="Влево"
			onpointerdown={(e: PointerEvent) => press(e, moveLeft, 'move')}
			onpointerup={release}
			onpointercancel={release}
			onpointerleave={release}
		>
			<svg viewBox="0 0 24 24">
				<path
					d="M15 4l-8 8 8 8"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		<button
			class="tetris-mobile-ctl"
			aria-label="Вниз"
			onpointerdown={(e: PointerEvent) => press(e, softDrop, 'soft')}
			onpointerup={release}
			onpointercancel={release}
			onpointerleave={release}
		>
			<svg viewBox="0 0 24 24">
				<path
					d="M4 9l8 8 8-8"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		<button
			class="tetris-mobile-ctl"
			aria-label="Вправо"
			onpointerdown={(e: PointerEvent) => press(e, moveRight, 'move')}
			onpointerup={release}
			onpointercancel={release}
			onpointerleave={release}
		>
			<svg viewBox="0 0 24 24">
				<path
					d="M9 4l8 8-8 8"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</div>

	<button
		class="tetris-mobile-ctl tetris-mobile-rotate"
		aria-label="Повернуть"
		onpointerdown={(e: PointerEvent) => press(e, rotate, 'once')}
		onpointerup={release}
		onpointercancel={release}
		onpointerleave={release}
	>
		<svg viewBox="0 0 24 24">
			<path
				d="M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8"
				fill="none"
				stroke="currentColor"
				stroke-width="2.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M21 3v5h-5"
				fill="none"
				stroke="currentColor"
				stroke-width="2.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>
</section>

<style>
.tetris-mobile-controls {
	flex: none;
	display: grid;
	grid-template-columns: auto auto auto;
	align-items: center;
	justify-content: center;
	gap: 20px;
	padding: 12px 16px;
	padding-bottom: calc(10px + env(safe-area-inset-bottom));
}

	.tetris-mobile-pad {
		display: grid;
		grid-template-columns: repeat(3, 58px);
		gap: 8px;
	}

	.tetris-mobile-ctl {
		display: grid;
		place-items: center;
		width: 58px;
		height: 58px;
		border-radius: 50%;
		cursor: pointer;
		color: var(--tetris-gold-hi);
		touch-action: none;
		-webkit-tap-highlight-color: transparent;
		background: radial-gradient(circle at 32% 28%, var(--tetris-red-hot), var(--tetris-red) 62%, #55090a);
		border: 2px solid rgba(232, 184, 75, 0.75);
		box-shadow:
			0 4px 0 #3a0606,
			inset 0 2px 3px rgba(255, 255, 255, 0.18);
		transition:
			transform 0.06s,
			box-shadow 0.06s,
			filter 0.06s;
	}

	.tetris-mobile-ctl svg {
		width: 22px;
		height: 22px;
	}

	.tetris-mobile-ctl:active {
		transform: translateY(3px);
		filter: brightness(0.9);
		box-shadow:
			0 1px 0 #3a0606,
			inset 0 3px 7px rgba(0, 0, 0, 0.45);
	}

	.tetris-mobile-rotate {
		width: 66px;
		height: 66px;
		color: #8f1610;
		border-color: #7a4f0e;
		background: radial-gradient(circle at 32% 28%, #ffe9ad, var(--tetris-gold) 55%, #b9862c);
		box-shadow:
			0 5px 0 #6b430c,
			inset 0 2px 3px rgba(255, 255, 255, 0.4);
	}

	.tetris-mobile-rotate svg {
		width: 27px;
		height: 27px;
	}

	.tetris-mobile-rotate:active {
		box-shadow:
			0 1px 0 #6b430c,
			inset 0 3px 7px rgba(0, 0, 0, 0.3);
	}

	@media (max-width: 359px) {
		.tetris-mobile-pad {
			grid-template-columns: repeat(3, 52px);
		}
		.tetris-mobile-ctl {
			width: 52px;
			height: 52px;
		}
		.tetris-mobile-rotate {
			width: 58px;
			height: 58px;
		}
		.tetris-mobile-controls {
			gap: 14px;
		}
	}

	@media (max-height: 660px) {
		.tetris-mobile-controls {
			padding: 9px 16px 7px;
		}
	}

	@media (max-height: 700px) {
	.tetris-mobile-controls {
		gap: 14px;
		padding: 8px 12px;
		padding-bottom: calc(7px + env(safe-area-inset-bottom));
	}

	.tetris-mobile-pad {
		grid-template-columns: repeat(3, 52px);
		gap: 6px;
	}

	.tetris-mobile-ctl {
		width: 52px;
		height: 52px;
	}

	.tetris-mobile-rotate {
		width: 58px;
		height: 58px;
	}
}
</style>