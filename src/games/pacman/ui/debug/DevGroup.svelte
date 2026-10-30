<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { loadDev, saveDev } from './devStorage';

	/** A foldable group of controls inside a dev window; remembers whether it is open. */
	let {
		id,
		title,
		open: initial = false,
		children
	}: { id: string; title: string; open?: boolean; children: Snippet } = $props();

	let open = $state(untrack(() => loadDev(`group.${id}`, initial)));

	function toggle(): void {
		open = !open;
		saveDev(`group.${id}`, open);
	}
</script>

<div class="group">
	<button type="button" class="title" tabindex={-1} onclick={toggle}>
		{open ? '▾' : '▸'}
		{title}
	</button>
	{#if open}
		<div class="content">{@render children()}</div>
	{/if}
</div>

<style>
	.group {
		border-top: 1px solid #1d2a44;
		padding-top: 4px;
	}
	.title {
		width: 100%;
		border: 0;
		background: none;
		color: #79ff6f;
		font: inherit;
		text-align: left;
		cursor: pointer;
		padding: 2px 0;
		letter-spacing: 1px;
	}
	.content {
		display: grid;
		gap: 4px;
		padding-top: 4px;
	}
</style>
