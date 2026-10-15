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
		background: transparent;
		box-shadow: none;
	}
</style>