<script lang="ts">
	import { onMount } from 'svelte';
	import TetrisMobileHeader from './TetrisMobileHeader.svelte';
	import TetrisMobileCockpit from './TetrisMobileCockpit.svelte';
	import TetrisMobileControls from './TetrisMobileControls.svelte';
	import TetrisMobileFooter from './TetrisMobileFooter.svelte';
	import TetrisMobileOverlay from './TetrisMobileOverlay.svelte';

	onMount(() => {
		document.body.classList.add('tetris-mobile-active');
		return () => {
			document.body.classList.remove('tetris-mobile-active');
		};
	});
</script>

<div class="tetris-mobile-device">
	<TetrisMobileHeader />
	<TetrisMobileCockpit />
	<TetrisMobileControls />
	<TetrisMobileFooter />
	<TetrisMobileOverlay />
</div>

<style>
	.tetris-mobile-device {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: none;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		touch-action: manipulation;
		background:
			radial-gradient(120% 50% at 50% 0%, rgba(247, 217, 139, 0.10), transparent 38%),
			radial-gradient(90% 30% at 50% 100%, rgba(0, 0, 0, 0.34), transparent 52%),
			linear-gradient(180deg, #7c1313, #580c0c 56%, #430808);
	}

	.tetris-mobile-device::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.07;
		mix-blend-mode: multiply;
		background-image:
			repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.4) 0 1px, transparent 1px 4px),
			repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.12) 0 1px, transparent 1px 5px);
	}

	:global(body.tetris-mobile-active) {
		overflow: hidden;
		overscroll-behavior: none;
	}
</style>