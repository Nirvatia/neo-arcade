<script lang="ts">
	import { onMount } from 'svelte';
	import { SimonGame } from '../core/GameMain';
	import { SimonConsoleKind, type SimonConsoleKindId } from '../core/Events';
	import { SimonMode, SimonPadList, SimonState, type SimonPadId } from '../core/SimonTypes';
	import SimonPads from './SimonPads.svelte';
	import { SvelteSimonAdapter } from './SvelteSimonAdapter';
	import { SimonUiStore } from './simonUiStore.svelte';

	const store = new SimonUiStore();

	let game: SimonGame | null = null;
	let host: HTMLDivElement | undefined = $state(undefined);
	let consoleEl: HTMLDivElement | undefined = $state(undefined);
	let menuOpen = $state<string | null>(null);

	interface MenuItem {
		readonly label?: string;
		readonly separator?: boolean;
		readonly disabled?: boolean;
		readonly action?: () => void;
	}

	interface MenuDef {
		readonly title: string;
		readonly items: readonly MenuItem[];
	}

	function decorative(text: string): void {
		store.addLine(text, SimonConsoleKind.Info);
	}

	function selectOrders(): void {
		if (store.isMenu) {
			game?.selectMode(SimonMode.Orders);
			return;
		}

		decorative('Режим можно изменить только до начала смены.');
	}

	function selectClassic(): void {
		if (store.isMenu) {
			game?.selectMode(SimonMode.Classic);
			return;
		}

		decorative('Режим можно изменить только до начала смены.');
	}

	function restartAndStart(): void {
		if (!game) {
			return;
		}

		if (store.isGameOver) {
			game.requestRestart();
			game.requestStart();
			return;
		}

		if (store.isMenu) {
			game.requestStart();
			return;
		}

		decorative('Сначала завершите текущую смену.');
	}

	function restartToMenu(): void {
		if (!game) {
			return;
		}

		if (store.isGameOver) {
			game.requestRestart();
			return;
		}

		decorative('Завершение сеанса запрещено администратором.');
	}

	function about(): void {
		store.addLine('О программе: 1С:Предприятие 8.3 «Симон говорит».', SimonConsoleKind.Info);
		store.addLine('Версия 8.3.24.0000 (демо).', SimonConsoleKind.Info);
		store.addLine('Разработано за 15 минут, внедряется за 15 месяцев.', SimonConsoleKind.Info);
	}

	const menus: readonly MenuDef[] = [
		{
			title: 'Файл',
			items: [
				{ label: 'Новый', disabled: true },
				{ label: 'Открыть…', disabled: true },
				{ separator: true },
				{ label: 'Начать заново', action: restartAndStart },
				{ separator: true },
				{
					label: 'Выход',
					action: () =>
						decorative('Завершение сеанса запрещено администратором: идёт проведение документов.')
				}
			]
		},
		{
			title: 'Правка',
			items: [
				{ label: 'Отменить', disabled: true },
				{ label: 'Повторить', disabled: true },
				{ separator: true },
				{ label: 'Найти', disabled: true },
				{ label: 'Заменить', disabled: true }
			]
		},
		{
			title: 'Вид',
			items: [
				{ label: 'Режим «Подчинённость»', action: selectOrders },
				{ label: 'Режим «Симон»', action: selectClassic },
				{ separator: true },
				{ label: 'Настройка формы', disabled: true }
			]
		},
		{
			title: 'Инструменты',
			items: [
				{
					label: 'Обновление конфигурации',
					action: () =>
						decorative(
							'Обновление недоступно: ваша лицензия заканчивается раньше, чем выходит новый релиз.'
						)
				},
				{ label: 'Тестирование и исправление', disabled: true },
				{ label: 'Выгрузка данных', disabled: true }
			]
		},
		{
			title: 'Окно',
			items: [
				{ label: 'Все окна', disabled: true },
				{ label: 'Закрепить', disabled: true }
			]
		},
		{
			title: 'Справка',
			items: [
				{
					label: 'Содержание справки',
					action: () =>
						decorative(
							'Раздел справки не найден. Обратитесь к франчайзи. Консультация: 3 000 ₽/час.'
						)
				},
				{ label: 'О программе', action: about }
			]
		}
	];

	const navItems: ReadonlyArray<{ readonly name: string; readonly icon: string }> = [
		{ name: 'Справочники', icon: '📁' },
		{ name: 'Документы', icon: '📄' },
		{ name: 'Регистры', icon: '📊' },
		{ name: 'Отчёты', icon: '📈' },
		{ name: 'Обработки', icon: '⚙️' }
	];

	onMount(() => {
		if (!host) {
			return;
		}

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

	$effect(() => {
		const count = store.lines.length;

		if (consoleEl && count >= 0) {
			consoleEl.scrollTop = consoleEl.scrollHeight;
		}
	});

	const failureVisible = $derived(
		store.state === SimonState.FailureOrders || store.state === SimonState.FailureClassic
	);

	const orderLabel = $derived.by(() => {
		if (store.orderPad === null) {
			return '';
		}

		switch (store.orderPad) {
			case 'PROVESTI':
				return 'Провести';
			case 'ZAPISAT':
				return 'Записать';
			case 'UDALIT':
				return 'Пометить на удаление';
			case 'ESHCHE':
				return 'Ещё…';
			default:
				return '';
		}
	});

	const showSayOrder = $derived(
		store.orderSay &&
			store.orderPad !== null &&
			(store.state === SimonState.OrdersAwaiting || store.state === SimonState.OrdersIssuing)
	);

	function press(pad: SimonPadId): void {
		game?.pressPad(pad);
	}

	function start(): void {
		game?.requestStart();
	}

	function skip(): void {
		game?.skip();
	}

	function acknowledgeFailure(): void {
		game?.acknowledgeFailure();
	}

	function abortToMenu(): void {
		game?.requestRestart();
	}

	function handleModeChange(event: Event): void {
		const target = event.target;

		if (!(target instanceof HTMLSelectElement)) {
			return;
		}

		const value = target.value;

		if (value === SimonMode.Orders) {
			game?.selectMode(SimonMode.Orders);
			return;
		}

		if (value === SimonMode.Classic) {
			game?.selectMode(SimonMode.Classic);
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.repeat) {
			return;
		}

		const target = event.target;

		if (target instanceof HTMLSelectElement || target instanceof HTMLInputElement) {
			return;
		}

		if (store.isGameOver) {
			if (event.key === 'Enter') {
				event.preventDefault();
				restartAndStart();
			}

			return;
		}

		if (failureVisible) {
			if (event.key === 'Enter' || event.key === 'Escape') {
				event.preventDefault();
				acknowledgeFailure();
			}

			return;
		}

		if (event.key >= '1' && event.key <= '4') {
			const index = Number(event.key) - 1;
			const pad = SimonPadList[index];

			if (pad) {
				press(pad);
			}

			return;
		}

		if (event.key === ' ') {
			event.preventDefault();

			if (store.canSkip) {
				skip();
			}

			return;
		}

		if (event.key === 'Enter' && store.isMenu && store.canStart) {
			event.preventDefault();
			start();
		}
	}

	function toggleMenu(title: string, event: MouseEvent): void {
		event.stopPropagation();
		menuOpen = menuOpen === title ? null : title;
	}

	function closeMenu(): void {
		menuOpen = null;
	}

	function runMenu(item: MenuItem): void {
		menuOpen = null;

		if (item.action) {
			item.action();
			return;
		}

		if (item.disabled) {
			decorative(`«${item.label ?? 'Действие'}» недоступно в демо-версии.`);
		}
	}

	function lineClass(kind: SimonConsoleKindId): string {
		switch (kind) {
			case SimonConsoleKind.Ok:
				return 'ok';
			case SimonConsoleKind.Error:
				return 'err';
			case SimonConsoleKind.Command:
				return 'cmd';
			default:
				return '';
		}
	}
</script>

<svelte:window onclick={closeMenu} onkeydown={handleKeydown} />
<div class="simon-app">
	<div class="desktop" aria-hidden="true">
		<div class="desktop-icons">
			<div class="desktop-icon">
				<span>🟨</span>
				<small>1С:Предприятие</small>
			</div>
			<div class="desktop-icon">
				<span>📄</span>
				<small>Бухгалтерия</small>
			</div>
			<div class="desktop-icon">
				<span>🗄️</span>
				<small>База данных</small>
			</div>
			<div class="desktop-icon">
				<span>🧾</span>
				<small>Первичка</small>
			</div>
		</div>

		<div class="desktop-logo">1С</div>
		<div class="scanlines"></div>
		<div class="vignette"></div>

		<div class="taskbar">
			<div class="start">Пуск</div>
			<div class="task-item active">1С:Предприятие 8.3</div>
			<div class="task-item">Обновление конфигурации</div>
			<div class="tray">
				<span>RU</span>
				<span>🔊</span>
				<span>14:47</span>
			</div>
		</div>
	</div>
	<div class="window">
		<div class="titlebar">
			<div class="app-ic"></div>
			<div class="tb-title">
				1С:Предприятие 8.3 — Конфигурация «Симон говорит»
				<span>(демо-режим)</span>
			</div>
			<div class="tb-btns">
				<button
					type="button"
					class="tb-btn"
					onclick={() => decorative('Свёртывание недоступно: вы ещё не провели все документы.')}
				>
					—
				</button>
				<button
					type="button"
					class="tb-btn"
					onclick={() => decorative('Развёртывание окна недоступно: форма не масштабируется.')}
				>
					□
				</button>
				<button
					type="button"
					class="tb-btn close"
					onclick={() =>
						decorative('Невозможно закрыть окно: сеанс под наблюдением отдела кадров.')}
				>
					✕
				</button>
			</div>
		</div>

		<nav class="menubar">
			{#each menus as menu (menu.title)}
				<div class="menu" class:open={menuOpen === menu.title}>
					<div class="menu-title" onclick={(event: MouseEvent) => toggleMenu(menu.title, event)}>
						{menu.title}
					</div>
					<ul class="dropdown">
						{#each menu.items as item, index (`${menu.title}-${index}`)}
							{#if item.separator}
								<hr />
							{:else}
								<li class:dis={item.disabled} onclick={() => runMenu(item)}>
									{item.label}
								</li>
							{/if}
						{/each}
					</ul>
				</div>
			{/each}
		</nav>

		<div class="toolbar">
			<button
				type="button"
				class="tbtn"
				onclick={() => decorative('Ничего не найдено — как и в прошлом квартале.')}
			>
				🔍 Найти
			</button>
			<button
				type="button"
				class="tbtn"
				onclick={() => decorative('Проведено 0 документов из 12 458. Начните с любого.')}
			>
				📤 Провести всё
			</button>
			<button
				type="button"
				class="tbtn"
				onclick={() => decorative('Печать недоступна: принтер не подключен с 2019 года.')}
			>
				🖨 Печать
			</button>
			<span class="tsep"></span>
			<button
				type="button"
				class="tbtn"
				onclick={() => decorative('Управление звуком доступно только в платной версии.')}
			>
				🔊
			</button>
			<button type="button" class="tbtn" onclick={about}> ❓ </button>
		</div>

		<div class="main">
			<aside class="nav">
				<h4>Панель навигации</h4>
				{#each navItems as item (item.name)}
					<div
						class="nav-item"
						onclick={() =>
							decorative(`Раздел «${item.name}» доступен в полной версии конфигурации.`)}
					>
						<span class="arr">▶</span>{item.icon}
						{item.name}
					</div>
				{/each}
			</aside>

			<div class="workspace" bind:this={host}>
				<div class="form-head">
					<h1>Обработка «Симон говорит»</h1>
					<span class="ver">v8.3.24.0001 • внедрено в 2015 г., поддержка закончилась в 2016-м</span>
					<span class="spacer"></span>
					<label>
						Режим:
						<select value={store.mode} disabled={!store.isMenu} onchange={handleModeChange}>
							<option value={SimonMode.Orders}>Подчинённость («1С говорит»)</option>
							<option value={SimonMode.Classic}>Симон (классика)</option>
						</select>
					</label>
				</div>

				<div class="hud">
					<div class="cell">Проведено: <b>{store.score}</b></div>
					<div class="cell">Серия: <b>x{store.combo}</b></div>
					<div class="cell">Уровень: <b>{store.level}</b></div>
					<div class="cell">Приказ №: <b>{store.round}</b></div>
					<div class="cell">
						Нарушения:
						{#each [0, 1, 2] as index (index)}
							<span class="warn" class:lost={index >= store.lives}>⚠</span>
						{/each}
					</div>
					<div class="cell">Рекорд предприятия: <b>{store.best}</b></div>
				</div>

				<div class="console">
					<div class="console-head">
						<span>Служебные сообщения</span>
						<span>Журнал регистрации</span>
					</div>
					<div class="console-lines" bind:this={consoleEl}>
						{#each store.lines as line (line.id)}
							<div>
								<span class="t">{line.time}</span>
								<span class={lineClass(line.kind)}>{line.text}</span>
							</div>
						{/each}
					</div>
				</div>

				<div class="order">
					<div
						class="order-text"
						class:warn-text={store.isOrders &&
							!store.orderSay &&
							store.state === SimonState.OrdersAwaiting}
					>
						{#if showSayOrder}
							<span class="prefix">1С говорит:</span> нажмите «{orderLabel}»!
						{:else}
							{store.orderText}
						{/if}
					</div>
					<div class="timer">
						<i style="width: {store.timerPercent}%"></i>
					</div>
				</div>

				<SimonPads {store} onPress={press} />

				<div class="actions">
					<button type="button" class="btn primary" disabled={!store.canStart} onclick={start}>
						▶ Начать смену
					</button>

					{#if store.isOrders && !store.isMenu && !store.isGameOver}
						<button type="button" class="btn" disabled={!store.canSkip} onclick={skip}>
							⏭ Пропустить (команда не от 1С)
						</button>
					{/if}

					{#if !store.isMenu && !store.isGameOver}
						<button type="button" class="btn" onclick={abortToMenu}> ⏹ Завершить смену </button>
					{/if}

					<span class="spacer"></span>

					<span class="legend">
						<span class="ok">● цветные кнопки — игровое поле</span>
						<span class="no">— серые элементы — обёртка 1С (кликабельны, но бесполезны)</span>
					</span>
				</div>

				<div class="hint">
					<b>Как играть.</b>
					Режим «Подчинённость»: выполняйте команды, только если они начинаются с
					<b>«1С говорит»</b>. Если команда исходит не от 1С — жмите
					<b>«Пропустить»</b> (или Пробел). Неверное действие = ⚠ нарушение, три нарушения = конец
					смены. Режим «Симон»: запомните мигания кнопок и повторите последовательность. Клавиши 1–4
					— кнопки, Пробел — пропуск, Enter — начать смену.<br />
					<i>© ООО «Франчайзи-Юг». Любое совпадение с реальной 1С случайно, но проводки сойдутся.</i
					>
				</div>
			</div>
		</div>

		<div class="statusbar">
			<span>{store.statusText}</span>
			<span>Демо-версия • Лицензия: 1 рабочее место • Поддержка: бессрочно*</span>
		</div>
	</div>

	{#if failureVisible}
		<div class="overlay show">
			<div class="modal">
				<div class="modal-title">Ошибка 1С:Предприятия</div>
				<div class="modal-body">
					<div class="ic">⚠️</div>
					<div>
						{store.failureTitle}
						<br /><br />
						Осталось нарушений до увольнения: {Math.max(store.lives, 0)} из 3.
					</div>
				</div>
				<div class="modal-actions">
					<button type="button" class="mbtn primary" onclick={acknowledgeFailure}> ОК </button>
					<button type="button" class="mbtn" onclick={abortToMenu}> Завершить смену </button>
				</div>
			</div>
		</div>
	{/if}

	{#if store.isGameOver}
		<div class="overlay show">
			<div class="modal">
				<div class="modal-title info">Сеанс завершён</div>
				<div class="modal-body">
					<div class="ic">ℹ️</div>
					<div>
						Три нарушения подряд. Ваш результат —
						<b>{store.score}</b> очков («~{Math.floor(store.score / 10)} проведённых документов») — передан
						в отдел кадров и бухгалтерию.
						<br /><br />
						Рекорд предприятия: <b>{store.best}</b>.
					</div>
				</div>
				<div class="modal-actions">
					<button type="button" class="mbtn primary" onclick={restartAndStart}>
						Начать заново
					</button>
					<button type="button" class="mbtn" onclick={restartToMenu}> В меню </button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.simon-app {
		position: fixed;
		inset: 0;
		z-index: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		overflow: hidden;
		background:
			radial-gradient(900px 480px at 78% -12%, rgba(255, 210, 77, 0.16), transparent 62%),
			radial-gradient(760px 460px at 8% 112%, rgba(72, 199, 160, 0.14), transparent 60%),
			radial-gradient(1200px 700px at 50% 18%, #365f8d 0%, #224363 55%, #12263b 100%);
		font-family: Tahoma, Arial, sans-serif;
		font-size: 13px;
		color: #1b1b1b;
	}

	.simon-app::before {
		content: '';
		position: absolute;
		inset: -40px;
		pointer-events: none;
		background-image:
			linear-gradient(rgba(154, 186, 226, 0.055) 1px, transparent 1px),
			linear-gradient(90deg, rgba(154, 186, 226, 0.055) 1px, transparent 1px);
		background-size: 44px 44px;
		transform: rotate(-1.2deg);
		mask-image: radial-gradient(78% 68% at 50% 34%, #000 28%, transparent 92%);
	}

	.simon-app::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(120% 100% at 50% 42%, transparent 52%, rgba(3, 9, 17, 0.62) 100%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent 18%, rgba(0, 0, 0, 0.14) 100%);
	}
	:global(html, body) {
		width: 100%;
		height: 100%;
		margin: 0;
		overflow: hidden;
		overscroll-behavior: none;
	}

	.simon-app {
		position: fixed;
		inset: 0;
		z-index: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px 16px 64px;
		overflow: hidden;
		background: #102434;
		font-family: Tahoma, Arial, sans-serif;
		font-size: 13px;
		color: #1b1b1b;
	}
	.desktop {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		overflow: hidden;
		background:
			radial-gradient(920px 520px at 78% -10%, rgba(255, 210, 77, 0.14), transparent 62%),
			radial-gradient(760px 460px at 6% 112%, rgba(72, 199, 160, 0.12), transparent 60%),
			linear-gradient(180deg, #2b6d8d 0%, #1d536e 42%, #143c53 74%, #0e2c3f 100%);
	}

	.desktop-icons {
		position: absolute;
		top: 18px;
		left: 18px;
		display: flex;
		flex-direction: column;
		gap: 18px;
		opacity: 0.62;
	}

	.desktop-icon {
		width: 78px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		font-size: 24px;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
	}

	.desktop-icon small {
		font-size: 10px;
		line-height: 1.2;
		text-align: center;
		color: #eaf4ff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
	}

	.desktop-logo {
		position: absolute;
		right: 4vw;
		bottom: 12vh;
		font-size: min(34vw, 380px);
		font-weight: 800;
		color: rgba(255, 210, 0, 0.055);
		text-shadow: 0 0 90px rgba(255, 210, 0, 0.06);
		user-select: none;
	}

	.scanlines {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			0deg,
			rgba(255, 255, 255, 0.022) 0px,
			rgba(255, 255, 255, 0.022) 1px,
			transparent 1px,
			transparent 3px
		);
		mix-blend-mode: screen;
		opacity: 0.5;
	}

	.vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			120% 100% at 50% 42%,
			transparent 52%,
			rgba(2, 8, 14, 0.62) 100%
		);
	}

	.taskbar {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 36px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 8px;
		background: linear-gradient(#e8e8e8, #cfcfcf);
		border-top: 1px solid #8f8f8f;
		box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.22);
		font-size: 11px;
		color: #222;
	}

	.start {
		padding: 3px 12px;
		border: 1px solid #7b5d00;
		border-radius: 3px;
		background: linear-gradient(#ffe066, #f0b400);
		font-weight: 700;
		color: #5b3a00;
	}

	.task-item {
		padding: 3px 10px;
		border: 1px solid #98a0a8;
		border-radius: 3px;
		background: linear-gradient(#f8f8f8, #d8dde2);
		color: #203448;
	}

	.task-item.active {
		background: linear-gradient(#ffffff, #e7eef6);
		border-color: #5f7c9d;
		font-weight: 700;
	}

	.tray {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 3px 8px;
		border: 1px solid #a5adb5;
		border-radius: 3px;
		background: linear-gradient(#f2f2f2, #dfe2e6);
		color: #333;
	}
	.window {
		position: relative;
		z-index: 2;
		width: min(1000px, 100%);
		height: min(780px, calc(100vh - 96px));
		height: min(780px, calc(100dvh - 96px));
		min-height: 420px;
		display: flex;
		flex-direction: column;
		background: #f2f2f2;
		border: 1px solid #2b3a48;
		border-radius: 6px 6px 4px 4px;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
		overflow: hidden;
	}

	.window {
		width: min(1000px, 97vw);
		max-height: 96vh;
		display: flex;
		flex-direction: column;
		background: #f2f2f2;
		border: 1px solid #2b3a48;
		border-radius: 6px 6px 4px 4px;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
		overflow: hidden;
	}
	.workspace {
		scrollbar-gutter: stable;
		overscroll-behavior: contain;
	}

	.console-lines {
		scrollbar-gutter: stable;
		overflow-wrap: anywhere;
	}

	.statusbar {
		overflow: hidden;
	}

	.statusbar span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.titlebar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		background: linear-gradient(#5b8ec4, #3f6b9e);
		color: #fff;
		font-weight: bold;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.4);
		user-select: none;
	}

	.app-ic {
		width: 16px;
		height: 16px;
		border-radius: 3px;
		flex: none;
		background: linear-gradient(135deg, #ffd24d, #e8a200);
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
	}

	.tb-title {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tb-title span {
		font-weight: normal;
		opacity: 0.85;
	}

	.tb-btns {
		margin-left: auto;
		display: flex;
		gap: 6px;
		flex: none;
	}

	.tb-btn {
		width: 26px;
		height: 20px;
		border: 1px solid rgba(0, 0, 0, 0.35);
		border-radius: 3px;
		background: linear-gradient(#fdfdfd, #d8dee6);
		color: #223;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		cursor: pointer;
		font-family: inherit;
	}

	.tb-btn:hover {
		background: linear-gradient(#fff, #e8f1fb);
	}

	.tb-btn.close:hover {
		background: #e0392f;
		color: #fff;
	}

	.menubar {
		display: flex;
		background: #e9edf2;
		border-bottom: 1px solid #9aa5b1;
	}

	.menu {
		position: relative;
	}

	.menu-title {
		padding: 4px 12px;
		cursor: default;
		user-select: none;
	}

	.menu-title:hover,
	.menu.open .menu-title {
		background: #cfe0f2;
	}

	.dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		min-width: 240px;
		background: #fff;
		border: 1px solid #8b98a5;
		box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.25);
		display: none;
		z-index: 50;
		padding: 2px;
		margin: 0;
	}

	.menu.open .dropdown {
		display: block;
	}

	.dropdown li {
		list-style: none;
		padding: 5px 10px;
		white-space: nowrap;
	}

	.dropdown li:hover {
		background: #dbe9f8;
		cursor: pointer;
	}

	.dropdown li.dis {
		color: #9aa3ad;
		cursor: not-allowed;
	}

	.dropdown li.dis:hover {
		background: #fff;
	}

	.dropdown hr {
		border: none;
		border-top: 1px solid #e2e6ea;
		margin: 2px 4px;
	}

	.toolbar {
		display: flex;
		gap: 2px;
		padding: 4px 6px;
		align-items: center;
		background: linear-gradient(#f7f7f7, #e4e7ea);
		border-bottom: 1px solid #9aa5b1;
	}

	.tbtn {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border: 1px solid transparent;
		border-radius: 3px;
		background: transparent;
		font-family: inherit;
		font-size: 12px;
		cursor: pointer;
		color: #222;
	}

	.tbtn:hover {
		background: #e3edf8;
		border-color: #aac4de;
	}

	.tsep {
		width: 1px;
		height: 20px;
		background: #c8ced6;
		margin: 0 4px;
	}

	.main {
		flex: 1;
		display: flex;
		min-height: 0;
	}

	.nav {
		width: 230px;
		flex: none;
		background: #f7f8fa;
		border-right: 1px solid #9aa5b1;
		padding: 8px;
		overflow: auto;
	}

	.nav h4 {
		font-size: 12px;
		color: #5a6b7c;
		margin: 2px 0 6px;
	}

	.nav-item {
		display: flex;
		gap: 6px;
		align-items: center;
		padding: 4px 6px;
		border-radius: 3px;
		cursor: not-allowed;
		color: #455260;
	}

	.nav-item:hover {
		background: #eef2f6;
	}

	.nav-item .arr {
		color: #8a97a3;
		font-size: 10px;
	}

	.workspace {
		flex: 1;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		overflow: auto;
	}

	.form-head {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.form-head h1 {
		font-size: 16px;
		color: #1f3f5f;
	}

	.form-head .ver {
		color: #7a8896;
		font-size: 11px;
	}

	select,
	.btn {
		font-family: inherit;
		font-size: 12px;
	}

	select {
		padding: 3px 6px;
		border: 1px solid #9aa5b1;
		border-radius: 3px;
		background: #fff;
	}

	.spacer {
		flex: 1;
	}

	.hud {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.hud .cell {
		background: #fff;
		border: 1px solid #9aa5b1;
		border-radius: 4px;
		padding: 5px 10px;
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.hud .cell b {
		font-size: 14px;
	}

	.warn {
		color: #d35400;
	}

	.warn.lost {
		color: #c9ced4;
	}

	.console {
		background: #fff;
		border: 1px solid #9aa5b1;
		border-radius: 4px;
		flex: none;
	}

	.console-head {
		padding: 3px 8px;
		background: linear-gradient(#f4f6f8, #e7eaee);
		border-bottom: 1px solid #9aa5b1;
		font-size: 11px;
		color: #5a6b7c;
		display: flex;
		justify-content: space-between;
	}

	.console-lines {
		height: 88px;
		overflow-y: auto;
		padding: 6px 8px;
		font-size: 12px;
		line-height: 1.5;
	}

	.console-lines .t {
		color: #93a0ad;
		margin-right: 6px;
	}

	.console-lines .ok {
		color: #1e7d3c;
	}

	.console-lines .err {
		color: #b03a2e;
	}

	.console-lines .cmd {
		color: #1a4f8b;
		font-weight: bold;
	}

	.order {
		background: #fff;
		border: 1px solid #9aa5b1;
		border-radius: 4px;
		min-height: 84px;
		flex: none;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 10px 16px;
		gap: 8px;
	}

	.order-text {
		font-size: 21px;
		font-weight: bold;
		color: #243447;
		text-align: center;
		min-height: 28px;
	}

	.order-text .prefix {
		color: #1a6b1a;
	}

	.order-text.warn-text {
		color: #8a5a00;
	}

	.timer {
		height: 8px;
		background: #e5e9ee;
		border-radius: 4px;
		overflow: hidden;
	}

	.timer > i {
		display: block;
		height: 100%;
		width: 0;
		background: linear-gradient(90deg, #57c46a, #2f9e4f);
	}

	.actions {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
		flex: none;
	}

	.btn {
		padding: 8px 18px;
		border: 1px solid #8fa3b8;
		border-radius: 4px;
		background: linear-gradient(#fff, #dde5ee);
		font-size: 13px;
		font-weight: bold;
		cursor: pointer;
		color: #1f3f5f;
		font-family: inherit;
	}

	.btn:hover:not(:disabled) {
		background: linear-gradient(#fff, #cfe0f2);
	}

	.btn.primary {
		background: linear-gradient(#57a85f, #3c8a46);
		border-color: #2c6b34;
		color: #fff;
	}

	.btn.primary:hover:not(:disabled) {
		background: linear-gradient(#63b96b, #439a4e);
	}

	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.legend {
		display: flex;
		gap: 16px;
		font-size: 11px;
		color: #6a7683;
	}

	.legend .ok {
		color: #1e7d3c;
	}

	.legend .no {
		color: #9aa3ad;
	}

	.hint {
		font-size: 12px;
		color: #55606c;
		background: #eef2f6;
		border: 1px dashed #b9c4cf;
		border-radius: 4px;
		padding: 8px 10px;
		line-height: 1.6;
		flex: none;
	}

	.hint b {
		color: #1f3f5f;
	}

	.statusbar {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 4px 10px;
		background: linear-gradient(#eef1f4, #dde3e9);
		border-top: 1px solid #9aa5b1;
		font-size: 11px;
		color: #455260;
	}

	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 25, 35, 0.45);
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.overlay.show {
		display: flex;
	}

	.modal {
		width: min(450px, 92vw);
		background: #fff;
		border: 1px solid #6f7d8c;
		box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
		border-radius: 4px;
		overflow: hidden;
		animation: pop 0.18s ease-out;
	}

	.modal-title {
		padding: 8px 12px;
		font-weight: bold;
		color: #b03a2e;
		background: linear-gradient(#f6f8fa, #e9edf1);
		border-bottom: 1px solid #d5dbe1;
	}

	.modal-title.info {
		color: #1f5fa8;
	}

	.modal-body {
		padding: 16px 14px;
		display: flex;
		gap: 12px;
		align-items: flex-start;
		font-size: 13px;
		line-height: 1.55;
	}

	.modal-body .ic {
		font-size: 26px;
		line-height: 1;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 10px 12px;
		border-top: 1px solid #e4e8ec;
		background: #fafbfc;
	}

	.mbtn {
		padding: 5px 22px;
		font-family: inherit;
		font-size: 12px;
		border: 1px solid #8fa3b8;
		border-radius: 3px;
		background: linear-gradient(#fff, #e2e8ef);
		cursor: pointer;
	}

	.mbtn:hover {
		background: #dbe9f8;
	}

	.mbtn.primary {
		background: linear-gradient(#57a85f, #3c8a46);
		border-color: #2c6b34;
		color: #fff;
	}

	.window {
		position: relative;
		z-index: 1;
	}

	@keyframes pop {
		from {
			transform: scale(0.94);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	@media (max-width: 820px) {
		.nav {
			display: none;
		}

		.order-text {
			font-size: 17px;
		}
	}

		@media (max-width: 820px) {
		.nav {
			display: none;
		}

		.order-text {
			font-size: 17px;
		}

		.pad-btn {
			min-height: 92px;
		}

		.desktop-icons {
			display: none;
		}

		.simon-app {
			padding-bottom: 56px;
		}
	}

	@media (max-height: 560px) {
		.taskbar {
			display: none;
		}

		.simon-app {
			padding-bottom: 16px;
		}

		.window {
			height: min(780px, calc(100vh - 32px));
			height: min(780px, calc(100dvh - 32px));
		}
	}
</style>
