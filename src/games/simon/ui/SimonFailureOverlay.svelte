<script lang="ts">
	import type { SimonUiStore } from './simonUiStore.svelte';

	interface Props {
		store: SimonUiStore;
		onRetry: () => void;
		onMenu: () => void;
	}

	let { store, onRetry, onMenu }: Props = $props();

	const faultLine = $derived(Math.max(13, store.round * 37 + store.clicksTotal + 11));

	const address = $derived(
		'0x' + ((0x1c0ffe + store.clicksTotal * 7919) >>> 0).toString(16).toUpperCase().padStart(8, '0')
	);

	function focusRetry(node: HTMLButtonElement): void {
		node.focus();
	}
	function handleKeydown(event: KeyboardEvent): void {
		if (!store.isGameOver) {
			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			onRetry();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			onMenu();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if store.isGameOver}
	<div class="crash-backdrop">
		<div class="crash" role="alertdialog" aria-modal="true" aria-labelledby="crash-title">
			<div class="crash-titlebar">
				<span id="crash-title">1С:Предприятие 8.3</span>
				<span class="crash-close" aria-hidden="true">×</span>
			</div>

			<div class="crash-body">
				<div class="crash-lead">
					<span class="crash-icon" aria-hidden="true">✕</span>
					<div class="crash-lead-text">
						<p>{'{1-2048}: Ошибка при вызове метода контекста'}</p>
						<p>(ВыполнитьШагОбновления)</p>
					</div>
				</div>

				<p class="crash-message">{store.failureTitle}</p>

				<dl class="crash-meta">
					<div>
						<dt>Раунд обновления</dt>
						<dd>{store.round}</dd>
					</div>
					<div>
						<dt>Выполнено шагов</dt>
						<dd>{store.clicksTotal}</dd>
					</div>
					<div>
						<dt>Адрес исключения</dt>
						<dd>{address}</dd>
					</div>
				</dl>

				<details class="crash-details">
					<summary>Подробно</summary>
					<pre class="crash-stack">{`{МастерОбновления(1)}.Модуль(${faultLine}):
    ВыполнитьШаг(ТекущийШаг);
{ОбновлениеКонфигурации(1)}.Модуль(${faultLine + 24}):
    ЗапуститьОбновлениеКонфигурации();
{РегламентноеЗадание.НочнойОбновлятор}.Модуль(13):
    Обновить();
{ВнешняяКомпонентаОбновления(4)}:
    Нарушена последовательность шагов.`}</pre>
				</details>

				<p class="crash-foot">
					База переведена в монопольный режим. Сохраните дамп перед обращением к администратору.
				</p>
			</div>

			<div class="crash-actions">
				<button type="button" class="crash-btn" use:focusRetry onclick={onRetry}>
					Повторить
				</button>
				<button type="button" class="crash-btn" onclick={onMenu}>В меню</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.crash-backdrop {
		position: absolute;
		inset: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		background: rgba(8, 10, 14, 0.78);
	}

	.crash {
		width: 420px;
		max-width: 100%;
		border: 1px solid #6a6a6a;
		background: #f0f0f0;
		box-shadow:
			0 12px 40px rgba(0, 0, 0, 0.7),
			inset 1px 1px 0 #fff;
		font-family: Tahoma, 'Segoe UI', sans-serif;
		color: #202020;
	}

	.crash-titlebar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 5px 8px;
		background: linear-gradient(90deg, #0a246a, #6a9bd8);
		color: #fff;
		font-size: 11px;
		font-weight: 700;
	}

	.crash-close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: 1px solid #ffffff80;
		background: #b5352c;
		font-size: 12px;
		line-height: 1;
	}

	.crash-body {
		padding: 14px;
	}

	.crash-lead {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.crash-icon {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: #b5352c;
		color: #fff;
		font-size: 17px;
		font-weight: 700;
	}

	.crash-lead-text {
		font-size: 11px;
		line-height: 1.5;
		word-break: break-word;
	}

	.crash-lead-text p {
		margin: 0;
	}

	.crash-message {
		margin: 12px 0;
		padding: 8px 10px;
		border-left: 3px solid #b5352c;
		background: #fbe9e7;
		font-size: 11px;
		line-height: 1.5;
	}

	.crash-meta {
		margin: 0 0 10px;
		padding: 8px 10px;
		border: 1px solid #c8c8c8;
		background: #fafafa;
		font-size: 10px;
	}

	.crash-meta div {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 2px 0;
	}

	.crash-meta dt {
		color: #777;
	}

	.crash-meta dd {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		color: #0a246a;
	}

	.crash-details {
		border: 1px solid #c8c8c8;
		background: #fff;
		font-size: 10px;
	}

	.crash-details summary {
		padding: 5px 8px;
		background: #e6e6e6;
		cursor: pointer;
		user-select: none;
	}

	.crash-stack {
		margin: 0;
		padding: 8px;
		overflow-x: auto;
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px;
		line-height: 1.6;
		color: #5a2020;
		white-space: pre;
	}

	.crash-foot {
		margin: 10px 0 0;
		font-size: 9px;
		line-height: 1.5;
		color: #777;
	}

	.crash-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 10px 14px;
		border-top: 1px solid #d0d0d0;
	}

	.crash-btn {
		min-width: 96px;
		padding: 6px 14px;
		border: 1px solid #9a9a9a;
		background: linear-gradient(#fdfdfd, #dedede);
		box-shadow: inset 1px 1px 0 #fff;
		font-family: inherit;
		font-size: 11px;
		color: #202020;
		cursor: pointer;
	}

	.crash-btn:hover {
		border-color: #0a246a;
	}

	.crash-btn:active {
		transform: translateY(1px);
	}

	.crash-btn:focus-visible {
		outline: 2px solid #0a246a;
		outline-offset: 2px;
	}
</style>
