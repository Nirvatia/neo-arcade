<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		backHref,
		backLabel = 'Back to arcade',
		children
	}: {
		title: string;
		subtitle?: string;
		backHref?: string;
		backLabel?: string;
		children: Snippet;
	} = $props();
</script>

<svelte:head>
	<title>{title} · Neo Arcade</title>
</svelte:head>

<div class="text-arcade-text min-h-dvh bg-arcade-bg">
	<a
		href="#main-content"
		class="focus:bg-arcade-accent sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded focus:px-4 focus:text-xs focus:text-black"
	>
		Skip to content
	</a>

	<div class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
		<header class="flex flex-col gap-4 border-b border-arcade-line pb-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-xs tracking-[0.25em] text-arcade-dim uppercase">Neo Arcade</p>

				{#if backHref}
					<a
						href={backHref}
						class="text-arcade-info hover:border-arcade-info inline-flex min-h-11 items-center justify-center rounded border border-arcade-line px-4 text-[11px] tracking-[0.18em] uppercase"
					>
						{backLabel}
					</a>
				{/if}
			</div>

			<div class="space-y-2">
				<h1 class="text-arcade-accent text-lg leading-snug sm:text-2xl">
					{title}
				</h1>

				{#if subtitle}
					<p class="max-w-prose text-xs leading-relaxed text-arcade-dim">
						{subtitle}
					</p>
				{/if}
			</div>
		</header>

		<main
			id="main-content"
			tabindex="-1"
			class="bg-arcade-panel flex-1 rounded border border-arcade-line p-4 sm:p-6"
		>
			{@render children()}
		</main>

		<footer
			class="border-t border-arcade-line pt-4 text-[11px] tracking-[0.25em] text-arcade-dim uppercase"
		>
			Neo Arcade cabinet
		</footer>
	</div>
</div>
