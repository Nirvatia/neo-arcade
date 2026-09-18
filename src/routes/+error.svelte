<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	const status = $derived(page.status ?? 404);
	const isMissing = $derived(status === 404);
	const message = $derived((page.error?.message ?? 'UNEXPECTED KERNEL PANIC').toUpperCase());

	// Псевдо-диагностика, детерминированная от кода ошибки — чтобы экран не был статичным
	// и при этом не раздражал анимацией.
	const address = $derived(
		'0x' + ((0xf00d + status * 7919) >>> 0).toString(16).toUpperCase().padStart(8, '0')
	);
	const romHash = $derived(((status * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0'));

	function goHome() {
		void goto('/');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
			e.preventDefault();
			goHome();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>NEO ARCADE — {isMissing ? 'GAME OVER' : 'SYSTEM CRASH'} [{status}]</title>
</svelte:head>

<main
	role="alert"
	class="relative z-10 mx-auto flex min-h-dvh w-full max-w-[780px] flex-col items-center justify-center px-4 py-8 text-center"
>
	<div class="w-full animate-screen-fade">
		<p class="mb-4 text-[8px] tracking-[0.25em] text-arcade-dim">
			CRITICAL EXCEPTION · ADDRESS {address}
		</p>

		<!-- Заголовок статичен, только мягкое свечение — без прыжков и skew -->
		<div
			class="err-title mb-2 text-[clamp(28px,6vw,56px)] leading-none font-bold tracking-[0.1em] text-arcade-red"
		>
			{isMissing ? 'GAME OVER' : 'SYSTEM CRASH'}
		</div>

		<p class="text-[clamp(10px,2vw,14px)] tracking-[0.3em] text-arcade-yel">
			ERROR CODE: {status}
		</p>

		<!-- Панель без мерцания: читаемость важнее «эффекта помех» -->
		<div class="mt-8 border-y-2 border-arcade-line bg-arcade-bg/90 px-6 py-6 text-left shadow-lg">
			<div
				class="mb-4 flex justify-between border-b border-dashed border-arcade-line pb-3 text-[10px] tracking-[0.2em] text-arcade-dim"
			>
				<span>DIAGNOSTIC DUMP</span>
				<span class="animate-blink-slow text-arcade-red">FAILED</span>
			</div>
			<div class="space-y-3 font-mono text-[clamp(9px,1.6vw,12px)] leading-relaxed text-arcade-dim">
				<div class="flex justify-between">
					<span>CPU REGISTERS</span>
					<span class="text-arcade-white">EAX:00000000 · SP:{romHash.slice(0, 4)}</span>
				</div>
				<div class="flex justify-between">
					<span>SYSTEM BUS</span>
					<span class="text-arcade-grn">OK</span>
				</div>
				<div class="flex justify-between">
					<span>CART ROM #{status}</span>
					<span class="animate-blink-slow text-arcade-red">BAD CHECKSUM {romHash}</span>
				</div>
				<div class="truncate border-t border-arcade-line/40 pt-2 text-arcade-amb">
					&gt; MESSAGE: {message}
				</div>
			</div>
		</div>

		<div class="mt-10 flex justify-center">
			<button
				type="button"
				onclick={goHome}
				class="err-btn cursor-pointer border-2 border-arcade-yel bg-arcade-yel px-8 py-3.5 text-center text-[clamp(10px,1.8vw,12px)] font-bold tracking-[0.15em] text-black focus:outline-none"
			>
				INSERT COIN
			</button>
		</div>

		<p class="mt-8 text-[8px] tracking-[0.18em] text-arcade-dim">
			PRESS [ENTER] TO RETURN TO ATTRACT MODE
		</p>
	</div>
</main>

<style>
	.err-title {
		/* Мягкое неоновое свечение вместо глитч-анимации */
		text-shadow:
			0 0 8px rgba(255, 75, 75, 0.55),
			0 0 22px rgba(255, 75, 75, 0.25);
	}

	.err-btn {
		/* steps(2) даёт характерную аркадную «ступенчатую» интерполяцию */
		transition:
			transform 0.12s steps(2),
			background-color 0.12s steps(2),
			border-color 0.12s steps(2),
			color 0.12s steps(2),
			box-shadow 0.18s steps(3);
		box-shadow:
			0 0 0 rgba(255, 217, 59, 0),
			inset 0 -2px 0 rgba(0, 0, 0, 0.25);
	}
	.err-btn:hover {
		background-color: var(--color-arcade-white);
		border-color: var(--color-arcade-white);
		transform: translateY(-2px);
		box-shadow:
			0 0 18px rgba(255, 217, 59, 0.55),
			0 0 4px rgba(255, 255, 255, 0.9),
			inset 0 -2px 0 rgba(0, 0, 0, 0.25);
	}
	.err-btn:active {
		transform: translateY(1px);
		box-shadow:
			0 0 8px rgba(255, 217, 59, 0.35),
			inset 0 2px 0 rgba(0, 0, 0, 0.25);
	}
	.err-btn:focus-visible {
		outline: 2px solid var(--color-arcade-yel);
		outline-offset: 4px;
	}
</style>