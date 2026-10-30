<script lang="ts">
	/** A life: Pac-Man's wedge, or Ms. Pac-Man's with her bow. */
	let { ms = false, size = 18 }: { ms?: boolean; size?: number } = $props();
</script>

<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
	<path d="M12 12 L22 6.5 A11 11 0 1 0 22 17.5 Z" fill={ms ? '#ff5fa2' : '#ffd23f'} />
	{#if ms}
		<path d="M6 3 L2 1 L3 6 Z M6 3 L10 1 L9 6 Z" fill="#ff2f6d" stroke="#fff" stroke-width="0.6" />
		<circle cx="6" cy="3.6" r="1.4" fill="#fff" />
	{/if}
</svg>
