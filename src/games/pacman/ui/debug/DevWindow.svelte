<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { loadDev, saveDev } from './devStorage';

	/** A floating dev window: drag it by its title, fold it to the title bar. */
	let {
		id,
		title,
		x = 8,
		y = 48,
		width = 230,
		children
	}: {
		id: string;
		title: string;
		x?: number;
		y?: number;
		width?: number;
		children: Snippet;
	} = $props();

	// the props only seed the first position; after that the window remembers its own
	const saved = untrack(() => loadDev(`window.${id}`, { x, y, folded: false }));
	let left = $state(saved.x);
	let top = $state(saved.y);
	let folded = $state(saved.folded);
	let drag: { dx: number; dy: number } | null = null;

	function keepOnScreen(): void {
		left = Math.min(Math.max(0, left), Math.max(0, window.innerWidth - 60));
		top = Math.min(Math.max(0, top), Math.max(0, window.innerHeight - 24));
	}

	function down(event: PointerEvent): void {
		if ((event.target as HTMLElement).closest('button')) {
			return;
		}
		drag = { dx: event.clientX - left, dy: event.clientY - top };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent): void {
		if (!drag) {
			return;
		}
		left = event.clientX - drag.dx;
		top = event.clientY - drag.dy;
		keepOnScreen();
	}

	function up(): void {
		if (drag) {
			drag = null;
			saveDev(`window.${id}`, { x: left, y: top, folded });
		}
	}

	function fold(): void {
		folded = !folded;
		saveDev(`window.${id}`, { x: left, y: top, folded });
	}

	$effect(() => {
		keepOnScreen();
	});
</script>

<section class="win" style:left="{left}px" style:top="{top}px" style:width="{width}px">
	<header
		role="group"
		aria-label={title}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
	>
		<span>{title}</span>
		<button type="button" tabindex={-1} onclick={fold} aria-label={folded ? 'Unfold' : 'Fold'}>
			{folded ? '▸' : '▾'}
		</button>
	</header>
	{#if !folded}
		<div class="body">{@render children()}</div>
	{/if}
</section>

<style>
	.win {
		position: fixed;
		z-index: 60;
		font-family: monospace;
		font-size: 11px;
		color: #e8efff;
		border: 1px solid #3b4f7c;
		background: rgba(3, 5, 9, 0.92);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
		max-height: calc(100vh - 16px);
		display: flex;
		flex-direction: column;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 4px 6px;
		background: #0b1322;
		color: #56d9ff;
		cursor: grab;
		user-select: none;
		touch-action: none;
	}
	header button {
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 0 2px;
	}
	.body {
		overflow: auto;
		padding: 6px;
		display: grid;
		gap: 6px;
	}
</style>
