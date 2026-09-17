<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { games, rankLabel, statusLabel, getGameScore } from '$shared/config/games';
	import type { GameConfig } from '$shared/config/games';

	type Phase = 'beam' | 'boot' | 'screen';
	type MsgType = '' | 'good' | 'bad';

	interface BootLine {
		text: string;
		ok?: boolean;
		bar?: boolean;
		hd?: boolean;
	}

	const LOGO_COLORS = ['#FF4B4B', '#FF9E2C', '#FFD93B', '#5BE07A', '#4CC9E0', '#5C8BFF', '#C77DFF'];
	const LOGO_TEXT = 'NEO ARCADE'.split('');

	const BOOT_LINES: BootLine[] = [
		{ text: 'NEO ARCADE SYSTEM BIOS v1.02', hd: true },
		{ text: 'CHECKING SYSTEM MEMORY ... ', ok: true },
		{ text: 'LOADING SOUND SYNTH ..... ', ok: true },
		{ text: 'INITIALIZING GRAPHICS ... ', ok: true },
		{ text: '', bar: true }
	];

	let phase = $state<Phase>('beam');
	let bootLines = $state<BootLine[]>([]);
	let bootSkip = false;
	let selectedIndex = $state(0);
	let credit = $state(1);
	let message = $state<{ text: string; type: MsgType }>({ text: '', type: '' });
	let colorOffset = $state(0);
	let gameScores = $state<Record<string, string>>({});

	let messageTimer: number | undefined;
	let colorTimer: number | undefined;

	const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

	function refreshScores() {
		const scores: Record<string, string> = {};
		games.forEach((g) => {
			scores[g.id] = getGameScore(g);
		});
		gameScores = scores;
	}

	function scoreColor(game: GameConfig, isSelected: boolean): string {
		if (isSelected) return '!text-black font-semibold';
		if (game.status === 'ready') return 'text-arcade-yel';
		if (game.status === 'dev') return 'text-arcade-amb';
		return 'text-arcade-dark';
	}

	function titleColor(game: GameConfig, isSelected: boolean): string {
		if (isSelected) return '!text-black font-bold';
		if (game.status === 'ready') return 'text-white';
		if (game.status === 'dev') return 'text-[#808A98]';
		return 'text-arcade-dark';
	}

	function statusColor(game: GameConfig, isSelected: boolean): string {
		if (isSelected) return '!text-black font-bold';
		if (game.status === 'ready') return 'text-arcade-grn';
		if (game.status === 'dev') return 'text-arcade-amb';
		return 'text-arcade-dark';
	}

	function showGameInfo() {
		const g = games[selectedIndex];
		const score = gameScores[g.id] ?? getGameScore(g);
		const tail =
			g.status === 'ready'
				? `HIGH SCORE ${score}`
				: g.status === 'dev'
					? `IN DEVELOPMENT (${g.progress}%)`
					: 'COMING SOON';
		message = { text: `${g.title} · ${g.genre} · ${tail}`, type: '' };
	}

	function setMessage(text: string, type: MsgType) {
		message = { text, type };
		if (messageTimer) window.clearTimeout(messageTimer);
		if (type) {
			messageTimer = window.setTimeout(() => showGameInfo(), 2600);
		}
	}

	function enterGame() {
		const game = games[selectedIndex];
		if (game.status === 'ready' && game.route) {
			credit++;
			setMessage('COIN ACCEPTED — STARTING...', 'good');
			window.setTimeout(() => setMessage(`LOADING ${game.title} ...`, 'good'), 600);
			window.setTimeout(() => goto(game.route!), 1400);
		} else if (game.status === 'dev') {
			setMessage(`${game.title} IS UNDER CONSTRUCTION (${game.progress}%)`, 'bad');
		} else {
			setMessage('GAME NOT AVAILABLE YET', 'bad');
		}
	}

	function skipBoot() {
		if (phase === 'screen') return;
		bootSkip = true;
		phase = 'screen';
		showGameInfo();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (phase !== 'screen') {
			skipBoot();
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % games.length;
				showGameInfo();
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = (selectedIndex - 1 + games.length) % games.length;
				showGameInfo();
				break;
			case 'Home':
				e.preventDefault();
				selectedIndex = 0;
				showGameInfo();
				break;
			case 'End':
				e.preventDefault();
				selectedIndex = games.length - 1;
				showGameInfo();
				break;
			case 'Enter':
				e.preventDefault();
				enterGame();
				break;
		}
	}

	async function runBoot() {
		await sleep(1100);
		if (bootSkip) return;
		phase = 'boot';

		for (const line of BOOT_LINES) {
			if (bootSkip) break;
			await sleep(180);
			bootLines = [...bootLines, line];
		}

		await sleep(220);
		if (!bootSkip) {
			phase = 'screen';
			showGameInfo();
		}
	}

	onMount(() => {
		refreshScores();

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (reduce) {
			phase = 'screen';
			showGameInfo();
		} else {
			void runBoot();
			colorTimer = window.setInterval(() => {
				colorOffset = (colorOffset + 1) % LOGO_COLORS.length;
			}, 900);
		}

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			if (colorTimer) window.clearInterval(colorTimer);
			if (messageTimer) window.clearTimeout(messageTimer);
		};
	});
</script>

<svelte:head>
	<title>NEO ARCADE — ATTRACT MODE</title>
</svelte:head>

<!-- ==================== CRT BEAM ==================== -->
{#if phase === 'beam'}
	<button
		type="button"
		class="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black"
		onclick={skipBoot}
		aria-label="Skip intro (press any key)"
	>
		<div
			class="h-0.5 w-full animate-beam-open bg-arcade-cyan"
			style="box-shadow: 0 0 12px #4CC9E0, 0 0 24px #4CC9E0;"
		></div>
	</button>
{/if}

<!-- ==================== BOOT SCREEN ==================== -->
{#if phase === 'boot'}
	<button
		type="button"
		class="fixed inset-0 z-40 flex cursor-pointer items-center justify-center bg-arcade-bg p-4 sm:p-6"
		onclick={skipBoot}
		aria-label="Skip boot sequence (press any key)"
	>
		<div
			class="w-full max-w-[540px] text-left text-[clamp(9px,1.8vw,11px)] leading-[2.2] text-arcade-dim"
		>
			{#each bootLines as line}
				<div class:font-bold={line.hd} class:mb-1.5={line.hd} class:text-arcade-white={line.hd}>
					{#if line.bar}
						<span class="tracking-[2px] text-arcade-cyan">■■■■■■■■■■■■■■■■</span>
						<span class="text-arcade-grn"> 100%</span>
					{:else}
						{line.text}
						{#if line.ok}<span class="text-arcade-grn">OK</span>{/if}
					{/if}
				</div>
			{/each}
		</div>
	</button>
{/if}

<!-- ==================== MAIN SCREEN ==================== -->
{#if phase === 'screen'}
	<main
		class="relative z-10 mx-auto flex min-h-dvh w-full max-w-[800px] flex-col items-center justify-between px-3 py-4 sm:px-6 sm:py-8"
	>
		<div class="my-auto w-full animate-screen-fade text-center">
			<!-- SYSTEM LINE -->
			<p class="mb-3 text-[7px] tracking-[0.25em] text-arcade-dim uppercase sm:mb-5 sm:text-[8px]">
				NEO ARCADE SYSTEM · CAB 01 · ©199X
			</p>

			<!-- LOGO -->
			<div
				class="flex flex-wrap justify-center text-[clamp(20px,5vw,38px)] leading-[1.1] font-bold tracking-[0.08em] select-none"
				aria-label="NEO ARCADE"
			>
				{#each LOGO_TEXT as char, i}
					<span
						class="inline-block"
						style:color={LOGO_COLORS[(i + colorOffset) % LOGO_COLORS.length]}
						style="text-shadow: 0 0 10px currentColor, 0 3px 0 rgba(0,0,0,.9);"
					>
						{char === ' ' ? '\u00A0' : char}
					</span>
				{/each}
			</div>

			<p
				class="mt-2 text-[clamp(8px,1.6vw,10px)] tracking-[0.3em] text-arcade-cyan uppercase sm:mt-3.5"
				style="text-shadow: 0 0 8px rgba(76,201,224,.3);"
			>
				★ SELECT GAME ★
			</p>

			<!-- TABLE CONTAINER -->
			<div
				class="mt-6 w-full overflow-x-auto border-y-2 border-arcade-line bg-arcade-bg/80 py-2 text-left sm:mt-10"
			>
				<table class="w-full min-w-[340px] table-fixed border-collapse">
					<thead>
						<tr
							class="border-b border-dashed border-arcade-line text-[8px] tracking-[0.2em] text-arcade-dim sm:text-[9px]"
						>
							<th class="w-[15%] px-3 py-3 text-left font-normal">RANK</th>
							<th class="w-[25%] px-3 py-3 text-left font-normal">SCORE</th>
							<th class="w-[40%] px-3 py-3 text-left font-normal">TITLE</th>
							<th class="w-[20%] px-3 py-3 text-right font-normal">STATUS</th>
						</tr>
					</thead>
					<tbody>
						{#each games as game, i (game.id)}
							{@const isSelected = selectedIndex === i}
							{@const score = gameScores[game.id] ?? getGameScore(game)}
							<tr
								role="button"
								tabindex="0"
								aria-selected={isSelected}
								class="cursor-pointer text-[clamp(11px,2vw,13px)] transition-colors duration-75 select-none"
								class:bg-arcade-yel={isSelected}
								onmouseenter={() => {
									selectedIndex = i;
									showGameInfo();
								}}
								onclick={() => {
									if (isSelected) enterGame();
									else {
										selectedIndex = i;
										showGameInfo();
									}
								}}
							>
								<!-- RANK (чистый номер без стрелочки) -->
								<td class="px-3 py-3 whitespace-nowrap sm:py-3.5">
									<span
										class="text-arcade-dim"
										class:!text-black={isSelected}
										class:font-bold={isSelected}
									>
										{rankLabel(i)}
									</span>
								</td>

								<!-- SCORE -->
								<td class="px-3 py-3 whitespace-nowrap sm:py-3.5">
									<span class={scoreColor(game, isSelected)}>
										{score}
									</span>
								</td>

								<!-- TITLE (со стрелочкой ► перед именем) -->
								<td class="truncate px-3 py-3 sm:py-3.5">
									<span class="{titleColor(game, isSelected)} tracking-wide">
										{game.title}
									</span>
								</td>

								<!-- STATUS -->
								<td class="px-3 py-3 text-right whitespace-nowrap sm:py-3.5">
									<span
										class="text-[0.85em] {statusColor(game, isSelected)}"
										class:animate-blink-slow={game.status === 'ready' && !isSelected}
									>
										{statusLabel(game)}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- MESSAGE HINT -->
			<p
				aria-live="polite"
				class="mt-4 min-h-[1.5em] px-2 text-[clamp(8px,1.5vw,10px)] tracking-[0.12em] text-arcade-dim uppercase sm:mt-5"
				class:text-arcade-grn={message.type === 'good'}
				class:text-arcade-amb={message.type === 'bad'}
			>
				{message.text}
			</p>

			<!-- INSERT COIN BUTTON -->
			<button
				type="button"
				class="mt-3 inline-flex cursor-pointer flex-col items-center gap-2 sm:mt-4"
				onclick={enterGame}
				aria-label="Insert coin (start selected game)"
			>
				<p
					class="animate-blink-coin text-[clamp(12px,2.8vw,18px)] font-bold tracking-[0.16em] text-arcade-yel"
					style="text-shadow: 0 0 10px rgba(255,217,59,.3);"
				>
					INSERT COIN
				</p>
				<div
					class="h-[6px] w-[36px] rounded-[1px] border-2 border-[#2A3240] bg-[#050608] sm:h-[7px] sm:w-[42px]"
					style="box-shadow: inset 0 1px 3px #000;"
					aria-hidden="true"
				></div>
			</button>

			<!-- FOOTER INFO -->
			<div
				class="mt-5 flex items-center justify-between border-t border-arcade-line pt-3 text-[8px] tracking-[0.14em] text-arcade-dim sm:mt-6 sm:text-[9px]"
			>
				<div>{games.length} GAMES INSTALLED</div>
				<div>
					CREDIT <b class="font-normal text-arcade-yel">{String(credit).padStart(2, '0')}</b>
				</div>
			</div>
		</div>
	</main>
{/if}
