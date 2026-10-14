<script lang="ts">
	import '../../styles/tetris.css';
	import TetrisBackdrop from './TetrisBackdrop.svelte';
	import TetrisTopbar from './TetrisTopbar.svelte';
	import TetrisHud from '../hud/TetrisHud.svelte';
	import TetrisPlayfield from './TetrisPlayfield.svelte';
	import TetrisSupplyPanel from './TetrisSupplyPanel.svelte';
	import TetrisTicker from './TetrisTicker.svelte';
	import TetrisOverlay from '../overlay/TetrisOverlay.svelte';
</script>

<svelte:head>
	<title>ТЕТРИС «ПЯТИЛЕТКА» · NEO ARCADE</title>
</svelte:head>

<div class="tetris-page">
	<TetrisBackdrop />
	<TetrisTopbar />
	<main class="tetris-page__stage">
		<div class="tetris-page__banner" aria-hidden="true">
			СТРОЙКА ВЕКА ★ КАЖДЫЙ РЯД — ШАГ К КОММУНИЗМУ ★ СТРОЙКА ВЕКА
		</div>
		<TetrisHud />
		<TetrisPlayfield />
		<TetrisSupplyPanel />
	</main>
	<TetrisTicker />
	<TetrisOverlay />
</div>

<style>
	.tetris-page {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		font-family: var(--tetris-font-body);
		color: var(--tetris-ink);
		background:
			radial-gradient(1100px 520px at 78% -10%, rgba(227, 167, 47, 0.18), transparent 60%),
			var(--tetris-red);
		overflow-x: hidden;
		overscroll-behavior: none;
		touch-action: manipulation;
	}

	.tetris-page__stage {
		position: relative;
		z-index: 2;
		flex: 1;
		display: grid;
		grid-template-columns: auto auto auto;
		justify-content: center;
		align-items: center;
		gap: 28px;
		padding: 30px 22px;
	}

	.tetris-page__banner {
		position: fixed;
		left: 10px;
		top: 50%;
		transform: translateY(-50%) rotate(180deg);
		writing-mode: vertical-rl;
		font-family: var(--tetris-font-display);
		font-size: 12px;
		letter-spacing: 0.4em;
		color: rgba(237, 227, 203, 0.45);
		pointer-events: none;
		z-index: 1;
	}

	@media (max-width: 768px) {
		.tetris-page__stage {
			display: flex;
			flex-direction: column;
			justify-content: center;
			gap: 14px;
			padding: 12px 10px;
		}
	}

	@media (max-width: 1100px) {
		.tetris-page__banner {
			display: none;
		}
	}

	@media (max-width: 980px) {
		.tetris-page__stage {
			display: flex;
			flex-direction: column;
			gap: 26px;
			padding: 20px 12px;
		}
	}
</style>
