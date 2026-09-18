<!-- src/shared/ui/GameStage.svelte
     Универсальная обёртка игры: масштабирование, кнопка «меню», тач-контролы,
     подсказка поворота. Подключение в +page игры:

     <GameStage
       init={(el) => { game = new MyGame(); void game.init(el); return () => game.destroy(); }}
       touch={{ direction: game.pressDirection, pause: game.togglePause, mute: game.toggleMute }}
     />
-->
<script lang="ts">
	import { onMount } from 'svelte';

	export interface TouchHandlers {
		direction?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
		pause?: () => void;
		mute?: () => void;
	}

	interface Props {
		init: (container: HTMLDivElement) => (() => void) | void;
		backHref?: string;
		touch?: TouchHandlers;
	}

	let { init, backHref = '/', touch = {} }: Props = $props();

	let container = $state<HTMLDivElement | undefined>(undefined);
	let shell = $state<HTMLDivElement | undefined>(undefined);
	let scale = $state(1);
	let portrait = $state(false);
	let rotateDismissed = $state(false);

	const coarse =
		typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
	const showRotateHint = $derived(coarse && portrait && !rotateDismissed);

	function fit() {
		if (!shell) return;
		const w = shell.offsetWidth;
		const h = shell.offsetHeight;
		if (w === 0 || h === 0) return;
		const next = Math.min(1, (window.innerWidth - 16) / w, (window.innerHeight - 16) / h);
		scale = next > 0.99 ? 1 : next;
	}

	function scheduleFit() {
		// iOS отдаёт новые размеры с задержкой после смены ориентации.
		window.setTimeout(fit, 120);
	}

	function dismissRotate() {
		rotateDismissed = true;
	}

	$effect(() => {
		if (!portrait) rotateDismissed = false;
	});

	onMount(() => {
		if (!container) return;
		const dispose = init(container) ?? undefined;

		const ro = new ResizeObserver(() => fit());
		if (shell) ro.observe(shell);
		window.addEventListener('resize', scheduleFit);
		window.addEventListener('orientationchange', scheduleFit);
		fit();

		return () => {
			ro.disconnect();
			window.removeEventListener('resize', scheduleFit);
			window.removeEventListener('orientationchange', scheduleFit);
			dispose?.();
		};
	});
</script>

<main
	class="relative flex h-dvh w-full touch-none items-center justify-center overflow-hidden bg-black select-none"
>
	<!-- Игровая колонка: кнопка назад -> контент игры (масштабируется целиком) -->
	<div
		bind:this={shell}
		class="flex flex-col items-start"
		style:transform={`scale(${scale})`}
		style:transform-origin="center center"
	>
		<a
			href={backHref}
			class="mb-2 flex items-center gap-2 border-2 border-arcade-line bg-arcade-bg/80 px-3 py-1.5 text-[10px] tracking-[0.15em] text-arcade-dim uppercase transition-colors hover:border-arcade-yel hover:text-arcade-yel focus:outline-none"
		>
			◄ MENU
		</a>
		<div bind:this={container} class="flex flex-col"></div>
	</div>

	<!-- Тач-контролы: вне масштабируемой колонки, всегда крупные -->
	{#if coarse && (touch.direction || touch.pause || touch.mute)}
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-30 pb-[calc(10px+env(safe-area-inset-bottom))]"
			aria-hidden="true"
		>
			<div class="mx-auto flex w-full max-w-[640px] items-end justify-between px-4">
				<div class="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1">
					<span></span>
					<button type="button" class="stage-btn" aria-label="Up"
						onpointerdown={(e) => { e.preventDefault(); touch.direction?.('UP'); }}>▲</button>
					<span></span>
					<button type="button" class="stage-btn" aria-label="Left"
						onpointerdown={(e) => { e.preventDefault(); touch.direction?.('LEFT'); }}>◄</button>
					<button type="button" class="stage-btn" aria-label="Pause"
						onpointerdown={(e) => { e.preventDefault(); touch.pause?.(); }}>❚❚</button>
					<button type="button" class="stage-btn" aria-label="Right"
						onpointerdown={(e) => { e.preventDefault(); touch.direction?.('RIGHT'); }}>►</button>
					<span></span>
					<button type="button" class="stage-btn" aria-label="Down"
						onpointerdown={(e) => { e.preventDefault(); touch.direction?.('DOWN'); }}>▼</button>
					<span></span>
				</div>
				<button type="button" class="stage-btn pointer-events-auto" aria-label="Mute"
					onpointerdown={(e) => { e.preventDefault(); touch.mute?.(); }}>M</button>
			</div>
		</div>
	{/if}

	<!-- Портрет на телефоне: играть в узкую полоску невозможно -->
	{#if showRotateHint}
		<button
			type="button"
			class="absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center gap-4 bg-black/80"
			onclick={dismissRotate}
			aria-label="Rotate device to play"
		>
			<div class="animate-blink-slow text-[clamp(18px,5vw,30px)] text-arcade-yel">⟳</div>
			<p class="text-[clamp(10px,2.6vw,14px)] tracking-[0.2em] text-arcade-white">
				ROTATE DEVICE TO PLAY
			</p>
			<p class="text-[8px] tracking-[0.18em] text-arcade-dim">TAP TO DISMISS</p>
		</button>
	{/if}
</main>

<style>
	.stage-btn {
		width: 52px;
		height: 52px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--color-arcade-line);
		background: rgba(5, 7, 10, 0.7);
		color: var(--color-arcade-dim);
		font-size: 12px;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
	}
	.stage-btn:active {
		border-color: var(--color-arcade-yel);
		color: var(--color-arcade-yel);
	}
</style>