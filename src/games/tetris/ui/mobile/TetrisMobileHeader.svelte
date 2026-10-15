<script lang="ts">
	import { tetrisOverlay } from '../overlay/overlayStore.svelte.ts';
	import { getTetrisActions } from '../actions/actionsStore.svelte.ts';
	import { GamePhase } from '../../core/types';

	const actions = $derived(getTetrisActions());
	const phase = $derived(tetrisOverlay.phase);

	let muted = $state(localStorage.getItem('tetris-mute') === '1');

	function togglePause(): void {
		if (actions && (phase === GamePhase.PLAYING || phase === GamePhase.PAUSED)) {
			actions.togglePause();
		}
	}

	function toggleMute(): void {
		muted = !muted;
		localStorage.setItem('tetris-mute', muted ? '1' : '0');
	}
</script>

<header class="tetris-mobile-hdr">
	<div class="tetris-mobile-emblem">
		<div class="tetris-mobile-disc">
			<svg viewBox="0 0 24 24">
				<path d="M12 1.8l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.1l7.1-.7z" />
			</svg>
		</div>
	</div>
	<div class="tetris-mobile-titles">
		<h1>ТЕТРИС</h1>
		<div class="tetris-mobile-sub">электронная стройка · модель 1984</div>
	</div>
	<div class="tetris-mobile-hdr-btns">
		<button
			class="tetris-mobile-icon-btn"
			aria-label="Звук"
			onclick={toggleMute}
		>
			{#if muted}
				<svg viewBox="0 0 24 24">
					<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
					<path
						d="M16 9l6 6M22 9l-6 6"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			{:else}
				<svg viewBox="0 0 24 24">
					<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
					<path
						d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			{/if}
		</button>
		<button
			class="tetris-mobile-icon-btn"
			aria-label="Пауза"
			onclick={togglePause}
			disabled={phase !== GamePhase.PLAYING && phase !== GamePhase.PAUSED}
		>
			<svg viewBox="0 0 24 24">
				<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" />
			</svg>
		</button>
	</div>
</header>

<style>
.tetris-mobile-hdr {
	flex: none;
	display: flex;
	align-items: center;
	gap: 11px;
	padding: 9px 14px 8px;
	padding-top: calc(9px + env(safe-area-inset-top));
	border-bottom: 1px solid rgba(232, 184, 75, 0.35);
	box-shadow: 0 2px 0 rgba(0, 0, 0, 0.28);
}

	.tetris-mobile-emblem {
		position: relative;
		width: 40px;
		height: 40px;
		flex: none;
	}

	.tetris-mobile-disc {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: radial-gradient(circle at 35% 28%, #c22a2f, #7c1114 72%);
		border: 2px solid var(--tetris-gold);
		box-shadow:
			inset 0 2px 4px rgba(255, 255, 255, 0.18),
			0 2px 6px rgba(0, 0, 0, 0.5);
	}

	.tetris-mobile-disc svg {
		width: 18px;
		height: 18px;
		fill: var(--tetris-gold-hi);
		filter: drop-shadow(0 1px 0 #3f0707);
	}

	.tetris-mobile-titles h1 {
		font-family: var(--tetris-font-display);
		font-size: 24px;
		line-height: 1;
		letter-spacing: 0.06em;
		color: var(--tetris-gold-hi);
		text-shadow:
			0 2px 0 #3f0707,
			0 0 14px rgba(247, 217, 139, 0.25);
	}

	.tetris-mobile-sub {
		margin-top: 4px;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: #f0e2c4;
	}

	.tetris-mobile-hdr-btns {
		margin-left: auto;
		display: flex;
		gap: 8px;
	}

	.tetris-mobile-icon-btn {
		width: 35px;
		height: 35px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		cursor: pointer;
		background: linear-gradient(#3d0808, #2a0505);
		border: 1.5px solid rgba(232, 184, 75, 0.6);
		color: var(--tetris-gold);
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.tetris-mobile-icon-btn:active {
		transform: translateY(1px);
		filter: brightness(0.85);
	}

	.tetris-mobile-icon-btn svg {
		width: 16px;
		height: 16px;
	}

	.tetris-mobile-icon-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-height: 660px) {
		.tetris-mobile-hdr {
			padding: 6px 14px 5px;
		}
		.tetris-mobile-emblem {
			width: 34px;
			height: 34px;
		}
		.tetris-mobile-titles h1 {
			font-size: 19px;
		}
	}

	@media (max-height: 700px) {
	.tetris-mobile-sub {
		display: none;
	}

	.tetris-mobile-emblem {
		width: 34px;
		height: 34px;
	}

	.tetris-mobile-titles h1 {
		font-size: 19px;
	}
}
</style>