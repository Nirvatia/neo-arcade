<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let status = $derived(page.status ?? 404);
	let errorMsg = $derived(page.error?.message ?? 'SYSTEM HARDWARE ERROR');

	function handleContinue() {
		goto('/');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === 'Space') {
			handleContinue();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>NEO ARCADE — SYSTEM CRASH [{status}]</title>
</svelte:head>

<main
	class="relative z-10 mx-auto flex min-h-dvh w-full max-w-[780px] flex-col items-center justify-center px-4 py-8 text-center"
>
	<div class="w-full animate-screen-fade">
		<!-- SUB HEADER -->
		<p class="mb-4 text-[8px] tracking-[0.25em] text-arcade-dim">
			CRITICAL EXCEPTION · ADDRESS 0x00404FF
		</p>

		<!-- ERROR TITLE -->
		<div
			class="text-arcade-red mb-2 animate-pulse text-[clamp(28px,6vw,56px)] leading-none font-bold tracking-[0.1em]"
		>
			{#if status === 404}
				GAME OVER
			{:else}
				SYSTEM CRASH
			{/if}
		</div>

		<p class="text-[clamp(10px,2vw,14px)] tracking-[0.3em] text-arcade-yel">
			ERROR CODE: {status}
		</p>

		<!-- DIAGNOSTICS TABLE -->
		<div class="mt-8 border-y-2 border-arcade-line bg-arcade-bg/90 px-6 py-6 text-left shadow-lg">
			<div
				class="mb-4 flex justify-between border-b border-dashed border-arcade-line pb-3 text-[10px] tracking-[0.2em] text-arcade-dim"
			>
				<span>DIAGNOSTIC DUMP</span>
				<span class="text-arcade-red">FAILED</span>
			</div>

			<div class="space-y-3 font-mono text-[clamp(9px,1.6vw,12px)] leading-relaxed text-arcade-dim">
				<div class="flex justify-between">
					<span>CPU REGISTERS</span>
					<span class="text-arcade-white">EAX:00000000</span>
				</div>
				<div class="flex justify-between">
					<span>SYSTEM BUS</span>
					<span class="text-arcade-grn">OK</span>
				</div>
				<div class="flex justify-between">
					<span>ROM TEST #{status}</span>
					<span class="text-arcade-red animate-blink-slow">BAD CHECKSUM</span>
				</div>
				<div class="truncate border-t border-arcade-line/40 pt-2 text-arcade-amb">
					&gt; MESSAGE: {errorMsg.toUpperCase()}
				</div>
			</div>
		</div>

		<!-- ACTION BUTTON -->
		<div class="mt-10 flex justify-center">
			<button
				type="button"
				onclick={handleContinue}
				class="cursor-pointer border-2 border-arcade-yel bg-arcade-yel px-8 py-3.5 text-center text-[clamp(10px,1.8vw,12px)] font-bold tracking-[0.15em] text-black transition-transform hover:bg-yellow-300 focus:outline-none active:scale-95"
			>
				INSERT COIN
			</button>
		</div>

		<!-- FOOTER HINT -->
		<p class="mt-8 text-[8px] tracking-[0.18em] text-arcade-dim">
			PRESS [ENTER] TO RETURN TO ATTRACT MODE
		</p>
	</div>
</main>
