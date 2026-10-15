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
		gap: 16px;
		width: 100%;
		box-sizing: border-box;
		padding: 10px 14px;
		padding-bottom: calc(10px + env(safe-area-inset-bottom));
		background:
			radial-gradient(100% 80% at 50% 0%, rgba(247, 217, 139, 0.06), transparent 34%),
			linear-gradient(180deg, rgba(56, 8, 8, 0.92), rgba(30, 4, 4, 0.98));
		border-top: 1px solid rgba(232, 184, 75, 0.34);
		box-shadow:
			inset 0 1px 0 rgba(247, 217, 139, 0.12),
			0 -8px 18px rgba(0, 0, 0, 0.22);
		user-select: none;
	}

	.tetris-mobile-pad {
		display: grid;
		grid-template-columns: repeat(3, 56px);
		gap: 7px;
		padding: 8px;
		background: rgba(0, 0, 0, 0.22);
		border: 1px solid rgba(232, 184, 75, 0.18);
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.5),
			0 8px 16px rgba(0, 0, 0, 0.22);
		border-radius: 16px;
	}

	.tetris-mobile-ctl {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 12px;
		cursor: pointer;
		color: #f2d8a1;
		touch-action: none;
		-webkit-tap-highlight-color: transparent;
		background: linear-gradient(180deg, #5c0d0d, #350707);
		border: 1px solid rgba(232, 184, 75, 0.48);
		box-shadow:
			0 5px 0 #250404,
			inset 0 1px 0 rgba(247, 217, 139, 0.20),
			inset 0 -10px 16px rgba(0, 0, 0, 0.26);
		transition:
			transform 0.06s,
			box-shadow 0.06s,
			filter 0.06s;
	}

	.tetris-mobile-controls > .tetris-mobile-ctl:first-child {
		height: 74px;
		border-radius: 14px;
	}

	.tetris-mobile-ctl svg {
		width: 22px;
		height: 22px;
	}

	.tetris-mobile-ctl:active {
		transform: translateY(3px);
		filter: brightness(0.9);
		box-shadow:
			0 1px 0 #250404,
			inset 0 4px 10px rgba(0, 0, 0, 0.4);
	}

	.tetris-mobile-rotate {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		color: #4a1207;
		border-color: rgba(74, 18, 7, 0.8);
		background: radial-gradient(circle at 32% 26%, #ffedbb, var(--tetris-gold) 58%, #9a6d1c);
		box-shadow:
			0 6px 0 #5d3d0d,
			inset 0 2px 3px rgba(255, 255, 255, 0.45);
	}

	.tetris-mobile-rotate svg {
		width: 27px;
		height: 27px;
	}

	.tetris-mobile-rotate:active {
		box-shadow:
			0 1px 0 #5d3d0d,
			inset 0 3px 7px rgba(0, 0, 0, 0.3);
	}

	@media (max-width: 359px) {
		.tetris-mobile-pad {
			grid-template-columns: repeat(3, 50px);
			gap: 6px;
			padding: 7px;
		}

		.tetris-mobile-ctl {
			width: 50px;
			height: 50px;
		}

		.tetris-mobile-controls > .tetris-mobile-ctl:first-child {
			height: 68px;
		}

		.tetris-mobile-rotate {
			width: 58px;
			height: 58px;
		}

		.tetris-mobile-controls {
			gap: 12px;
		}
	}

	@media (max-height: 700px) {
		.tetris-mobile-controls {
			padding-top: 8px;
			padding-bottom: calc(8px + env(safe-area-inset-bottom));
			gap: 12px;
		}

		.tetris-mobile-pad {
			grid-template-columns: repeat(3, 52px);
			gap: 6px;
			padding: 6px;
		}

		.tetris-mobile-ctl {
			width: 52px;
			height: 52px;
		}

		.tetris-mobile-controls > .tetris-mobile-ctl:first-child {
			height: 70px;
		}

		.tetris-mobile-rotate {
			width: 60px;
			height: 60px;
		}
	}
</style>