<script lang="ts">
	import { SimonDifficulty, type SimonDifficultyId } from '../core/SimonTypes';
	import type { SimonUiStore } from './simonUiStore.svelte';

	interface Props {
		store: SimonUiStore;
		onSelectDifficulty: (difficulty: SimonDifficultyId) => void;
		onStart: () => void;
	}

	let { store, onSelectDifficulty, onStart }: Props = $props();

	const modes: ReadonlyArray<{ id: SimonDifficultyId; label: string; note: string }> = [
		{ id: SimonDifficulty.Easy, label: 'Легко', note: 'Плановое обновление в выходные' },
		{ id: SimonDifficulty.Normal, label: 'Нормально', note: 'Обновление в ночное регламентное задание' },
		{ id: SimonDifficulty.Hard, label: 'Сложно', note: 'Обновление в рабочий день. Удачи.' }
	];

	function padded(value: number, length: number): string {
		const safe = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
		return String(safe).padStart(length, '0');
	}
</script>

<div class="hud">
	<div class="hud-stats">
		<span>Раунд <b>{padded(store.round, 2)}</b></span>
		<span>Кликов <b>{padded(store.clicksTotal, 4)}</b></span>
	</div>

	<fieldset class="modes" disabled={!store.isMenu}>
		<legend>Режим обновления</legend>
		<div class="modes-row">
			{#each modes as mode (mode.id)}
				<button
					type="button"
					class="mode"
					data-selected={store.difficulty === mode.id}
					aria-pressed={store.difficulty === mode.id}
					onclick={() => onSelectDifficulty(mode.id)}
				>
					{mode.label}
				</button>
			{/each}
		</div>
		<p class="mode-note">{modes.find((mode) => mode.id === store.difficulty)?.note ?? ''}</p>
	</fieldset>

	<button
		type="button"
		class="start"
		disabled={!store.isMenu || !store.ready}
		onclick={onStart}
	>
		{store.isMenu ? 'Начать обновление' : 'Обновление выполняется…'}
	</button>
</div>

<style>
	.hud {
		width: 380px;
		max-width: calc(100vw - 48px);
		font-family: Tahoma, 'Segoe UI', sans-serif;
		color: #202020;
	}

	.hud-stats {
		display: flex;
		justify-content: space-between;
		padding: 8px 10px;
		border: 1px solid #b5b5b5;
		background: #fafafa;
		font-size: 11px;
	}

	.hud-stats b {
		margin-left: 6px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		color: #0a246a;
	}

	.modes {
		margin: 10px 0;
		padding: 8px 10px;
		border: 1px solid #c0c0c0;
	}

	.modes legend {
		padding: 0 4px;
		font-size: 10px;
		color: #555;
	}

	.modes-row {
		display: flex;
		gap: 6px;
	}

	.mode {
		flex: 1;
		padding: 6px 4px;
		border: 1px solid #a0a0a0;
		background: #e8e8e8;
		box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #bdbdbd;
		font-family: inherit;
		font-size: 11px;
		color: #333;
		cursor: pointer;
	}

	.mode[data-selected='true'] {
		border-color: #0a246a;
		background: #d6e6f7;
		color: #0a246a;
		font-weight: 700;
		box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.2);
	}

	.mode:disabled {
		cursor: default;
		opacity: 0.65;
	}

	.mode-note {
		margin-top: 6px;
		font-size: 9px;
		color: #777;
	}

	.start {
		width: 100%;
		padding: 9px 12px;
		border: 1px solid #7a7a7a;
		background: linear-gradient(#fdfdfd, #dcdcdc);
		box-shadow: inset 1px 1px 0 #fff;
		font-family: inherit;
		font-size: 12px;
		font-weight: 700;
		color: #123a63;
		cursor: pointer;
	}

	.start:hover:not(:disabled) {
		border-color: #0a246a;
		background: linear-gradient(#ffffff, #e8f0fa);
	}

	.start:active:not(:disabled) {
		transform: translateY(1px);
	}

	.start:disabled {
		cursor: default;
		color: #999;
	}
</style>