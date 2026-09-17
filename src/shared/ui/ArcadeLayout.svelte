<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-dvh bg-black font-px text-arcade-white">
	{@render children()}

	<!-- CRT Overlays -->
	<div class="crt-scan pointer-events-none fixed inset-0 z-20" aria-hidden="true"></div>
	<div class="crt-vig pointer-events-none fixed inset-0 z-20" aria-hidden="true"></div>
</div>
