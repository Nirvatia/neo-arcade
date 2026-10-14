<script lang="ts">
	import { SimonDifficulty, type SimonDifficultyId } from '../core/SimonTypes';
	import type { SimonUiStore } from './simonUiStore.svelte';

	interface BaseEntry {
		readonly id: SimonDifficultyId;
		readonly name: string;
		readonly path: string;
		readonly note: string;
	}

	const bases: readonly BaseEntry[] = [
		{
			id: SimonDifficulty.Easy,
			name: 'Бухгалтерия_Финальная',
			path: '\\\\SRV-1C\\BUH_FINAL',
			note: 'Плановое обновление, никого нет в офисе'
		},
		{
			id: SimonDifficulty.Normal,
			name: 'Торговля_Управление',
			path: '\\\\SRV-1C\\TRADE_MGMT',
			note: 'Обновление в ночное регламентное задание'
		},
		{
			id: SimonDifficulty.Hard,
			name: 'Зарплата_Боевая',
			path: '\\\\SRV-1C\\PAYROLL_FAIL',
			note: 'Обновление в рабочий день. Пользователи работают'
		}
	];

	interface Props {
		store: SimonUiStore;
		onSelectDifficulty: (difficulty: SimonDifficultyId) => void;
		onStart: () => void;
	}

	let { store, onSelectDifficulty, onStart }: Props = $props();
</script>

<section class="launcher" aria-label="Выбор информационной базы">
	<div class="launcher-head">
		<span class="logo" aria-hidden="true">1С</span>
		<div class="launcher-head-text">
			<span class="launcher-title">1С:Предприятие</span>
			<span class="launcher-sub">Выберите информационную базу для запуска обновления</span>
		</div>
	</div>

	<div class="base-list" role="radiogroup" aria-label="Информационные базы">
		{#each bases as base (base.id)}
			<button
				type="button"
				class="base"
				role="radio"
				aria-checked={store.difficulty === base.id}
				data-selected={store.difficulty === base.id}
				onclick={() => onSelectDifficulty(base.id)}
				ondblclick={() => {
					onSelectDifficulty(base.id);
					onStart();
				}}
			>
				<span class="base-icon" aria-hidden="true"></span>
				<span class="base-body">
					<span class="base-name">{base.name}</span>
					<span class="base-path">{base.path}</span>
				</span>
				<span class="base-note">{base.note}</span>
			</button>
		{/each}
	</div>

	<div class="launcher-actions">
		<button type="button" class="btn-primary" disabled={!store.ready} onclick={onStart}>
			Запустить
		</button>
		<button type="button" class="btn" disabled>Настроить</button>
		<button type="button" class="btn" disabled>Добавить</button>
		<button type="button" class="btn" disabled>Изменить</button>
		<button type="button" class="btn" disabled>Удалить</button>
	</div>
</section>

<style>
	.launcher {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 20px;
		font-family: Tahoma, 'Segoe UI', sans-serif;
		color: #202020;
	}

	.launcher-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.logo {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 42px;
		height: 42px;
		border-radius: 6px;
		background: linear-gradient(180deg, #ffd200, #f0b400);
		border: 1px solid #b8860b;
		color: #1a1a1a;
		font-size: 16px;
		font-weight: 800;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
	}

	.launcher-head-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.launcher-title {
		font-size: 16px;
		font-weight: 700;
		color: #0a246a;
	}

	.launcher-sub {
		font-size: 10px;
		color: #666;
	}

	.base-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px;
		border: 1px solid #b5b5b5;
		background: #fff;
	}

	.base {
		display: grid;
		grid-template-columns: 18px 1fr;
		grid-template-rows: auto auto;
		column-gap: 10px;
		align-items: center;
		padding: 8px 10px;
		border: 1px solid transparent;
		background: transparent;
		text-align: left;
		font-family: inherit;
		cursor: pointer;
	}

	.base:hover {
		background: #f2f6fb;
	}

	.base[data-selected='true'] {
		background: #cfe1f5;
		border-color: #7da7d9;
	}

	.base-icon {
		grid-row: span 2;
		width: 18px;
		height: 18px;
		border-radius: 3px;
		background: linear-gradient(180deg, #ffd200, #f0b400);
		border: 1px solid #b8860b;
	}

	.base-name {
		font-size: 12px;
		font-weight: 700;
		color: #1a1a1a;
	}

	.base-path {
		font-size: 9px;
		font-family: 'JetBrains Mono', monospace;
		color: #777;
	}

	.base-note {
		grid-column: 2;
		font-size: 9px;
		color: #888;
	}

	.launcher-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.btn-primary,
	.btn {
		padding: 7px 14px;
		border: 1px solid #7a7a7a;
		background: linear-gradient(#fdfdfd, #dcdcdc);
		box-shadow: inset 1px 1px 0 #fff;
		font-family: inherit;
		font-size: 11px;
		color: #202020;
		cursor: pointer;
	}

	.btn-primary {
		border-color: #0a246a;
		background: linear-gradient(#e8f0fa, #c6d9ef);
		color: #0a246a;
		font-weight: 700;
	}

	.btn-primary:hover:not(:disabled) {
		background: linear-gradient(#f4f9ff, #d6e6f7);
	}

	.btn:disabled {
		color: #a0a0a0;
		cursor: default;
	}

	.btn-primary:active:not(:disabled) {
		transform: translateY(1px);
	}
</style>