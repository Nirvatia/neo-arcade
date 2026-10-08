<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-dvh bg-black font-px text-arcade-white">
	{@render children()}
</div>
