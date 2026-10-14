<script lang="ts">
	import { onMount } from 'svelte';
	import { SimonGame } from '../core/GameMain';
	import {
		SimonDifficulty,
		SimonState,
		type SimonDifficultyId,
		type SimonPadId
	} from '../core/SimonTypes';
	import SimonBackdrop from './SimonBackdrop.svelte';
	import SimonPads from './SimonPads.svelte';
	import { SvelteSimonAdapter } from './SvelteSimonAdapter';
	import { SimonUiStore } from './simonUiStore.svelte';

	const store = new SimonUiStore();

	let game: SimonGame | null = null;
	let host = $state<HTMLDivElement | undefined>(undefined);

	const difficulties: ReadonlyArray<{ id: SimonDifficultyId; label: string }> = [
		{ id: SimonDifficulty.Easy, label: 'Легко' },
		{ id: SimonDifficulty.Normal, label: 'Норм' },
		{ id: SimonDifficulty.Hard, label: 'Сложно' }
	];

	onMount(() => {
		if (!host) return;
		const instance = new SimonGame();
		const bridge = new SvelteSimonAdapter(instance, store);
		game = instance;
		bridge.connect();
		void instance.init(host).catch((error: unknown) => {
			console.error('[Simon] init failed', error);
		});
		return () => {
			bridge.disconnect();
			instance.destroy();
			game = null;
		};
	});

	const hint = $derived.by(() => {
		switch (store.state) {
			case SimonState.Menu:
				return 'Выберите сложность и запустите обновление';
			case SimonState.ShowingPattern:
				return 'Запоминайте последовательность…';
			case SimonState.AwaitingInput:
				return store.inputLocked ? 'Приготовьтесь…' : 'Ваш ход — повторите!';
			case SimonState.RoundTransition:
				return 'Проведение документа…';
			default:
				return '';
		}
	});

	function selectDifficulty(id: SimonDifficultyId): void {
		game?.selectDifficulty(id);
	}

	function press(pad: SimonPadId): void {
		game?.pressPad(pad);
	}

	function primary(): void {
		if (!game) return;
		if (store.isGameOver) {
			game.requestRestart();
			game.requestStart();
			return;
		}
		game.requestStart();
	}
</script>

<main class="page">
	<SimonBackdrop />

	<div class="frame" bind:this={host}>
		<header class="topbar">
			<a href="/" class="exit">← меню</a>
			<span class="brand">1С:ПРЕДПРИЯТИЕ · ОБНОВЛЕНИЕ КОНФИГУРАЦИИ</span>
			<span class="stats">
				РАУНД {String(store.round).padStart(2, '0')}
				· СЧЁТ {String(store.clicksTotal).padStart(4, '0')}
			</span>
		</header>

		<section class="stage">
			{#if hint}
				<p class="hint" aria-live="polite">{hint}</p>
			{/if}

			<SimonPads {store} onPress={press} />

			<div class="actions">
				{#if store.isMenu}
					<div class="difficulty" role="radiogroup" aria-label="Сложность">
						{#each difficulties as d (d.id)}
							<button
								type="button"
								class="pill"
								data-on={store.difficulty === d.id}
								aria-pressed={store.difficulty === d.id}
								onclick={() => selectDifficulty(d.id)}
							>
								{d.label}
							</button>
						{/each}
					</div>
					<button type="button" class="cta" onclick={primary}>
						▶ НАЧАТЬ ОБНОВЛЕНИЕ
					</button>
				{:else if store.isGameOver}
					<div class="gocard">
						<p class="gocard-title">ОБНОВЛЕНИЕ ПРОВАЛЕНО</p>
						<p class="gocard-reason">{store.failureTitle}</p>
						<button type="button" class="cta" onclick={primary}>↻ ЕЩЁ РАЗ</button>
					</div>
				{/if}
			</div>
		</section>
	</div>
</main>

<style>
	.page {
		position: relative;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	.frame {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		width: min(560px, 94vw);
		min-height: 100dvh;
	}
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 12px 6px;
		font-family: Tahoma, 'Segoe UI', sans-serif;
		font-size: 9px;
		letter-spacing: 0.08em;
		color: rgba(160, 175, 200, 0.55);
		text-transform: uppercase;
	}
	.exit {
		color: rgba(160, 175, 200, 0.55);
		text-decoration: none;
		white-space: nowrap;
	}
	.exit:hover {
		color: #ffd200;
		text-decoration: underline;
	}
	.brand {
		flex: 1;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.stats {
		white-space: nowrap;
	}
	.stage {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 26px;
		padding: 10px 0 40px;
	}
	.hint {
		min-height: 1.4em;
		font-family: Tahoma, 'Segoe UI', sans-serif;
		font-size: 14px;
		letter-spacing: 0.04em;
		color: #cdd8ea;
		text-align: center;
	}
	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		min-height: 96px;
	}
	.difficulty {
		display: flex;
		gap: 8px;
	}
	.pill {
		padding: 6px 14px;
		border: 1px solid rgba(160, 175, 200, 0.35);
		background: transparent;
		color: rgba(200, 212, 232, 0.7);
		font-family: Tahoma, sans-serif;
		font-size: 11px;
		border-radius: 999px;
		cursor: pointer;
		transition: all 120ms linear;
	}
	.pill:hover {
		border-color: #ffd200;
		color: #ffd200;
	}
	.pill[data-on='true'] {
		background: rgba(255, 210, 0, 0.14);
		border-color: #ffd200;
		color: #ffd200;
		font-weight: 700;
	}
	.cta {
		padding: 14px 34px;
		border: none;
		border-radius: 10px;
		background: linear-gradient(180deg, #ffd200, #f0b400);
		color: #14100a;
		font-family: Tahoma, sans-serif;
		font-size: 15px;
		font-weight: 800;
		letter-spacing: 0.06em;
		cursor: pointer;
		box-shadow: 0 6px 22px rgba(255, 210, 0, 0.28);
		animation: cta-pulse 1.8s ease-in-out infinite;
		transition: transform 100ms steps(2);
	}
	.cta:hover {
		transform: translateY(-2px);
	}
	.cta:active {
		transform: translateY(1px) scale(0.98);
	}
	.gocard {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 20px 26px;
		border: 1px solid rgba(255, 75, 75, 0.4);
		border-radius: 12px;
		background: rgba(30, 12, 12, 0.55);
	}
	.gocard-title {
		font-family: Tahoma, sans-serif;
		font-size: 16px;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: #ff6b6b;
	}
	.gocard-reason {
		max-width: 320px;
		font-family: Tahoma, sans-serif;
		font-size: 11px;
		line-height: 1.5;
		color: rgba(230, 200, 200, 0.75);
		text-align: center;
	}
	@keyframes cta-pulse {
		0%, 100% { box-shadow: 0 6px 22px rgba(255, 210, 0, 0.28); }
		50% { box-shadow: 0 6px 34px rgba(255, 210, 0, 0.5); }
	}
	@media (prefers-reduced-motion: reduce) {
		.cta { animation: none; }
	}
	@media (max-width: 520px) {
		.brand { display: none; }
		.hint { font-size: 12px; }
	}
</style>