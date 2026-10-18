<script lang="ts">
	import { onMount } from 'svelte';
	import { SimonGame } from '../core/GameMain';
	import { SimonEvent } from '../core/Events';
	import { SimonMode, SimonState, type SimonPadId } from '../core/SimonTypes';
	import SimonPads from './SimonPads.svelte';
	import { SvelteSimonAdapter } from './SvelteSimonAdapter';
	import { SimonUiStore } from './SimonUiStore.svelte';

	type MascotMood =
		| 'normal'
		| 'happy'
		| 'shock'
		| 'angry'
		| 'coffee'
		| 'shout';

	type LotteryKind = 'life' | 'bonus500' | 'bonus200' | null;

	interface FxPop {
		readonly id: number;
		readonly text: string;
		readonly cls: string;
		readonly offset: number;
	}

	interface BannerFx {
		readonly id: number;
		readonly title: string;
		readonly sub: string;
	}

	interface OrderAcceptedFx {
		readonly round: number;
		readonly scoreDelta: number;
		readonly message: string;
		readonly crit?: boolean;
		readonly break?: boolean;
		readonly lottery?: LotteryKind;
	}

	interface VisualExtras {
		mascotMood?: MascotMood;
		bossTag?: string;
		flavorText?: string;
		isBreak?: boolean;
		ordersInLevel?: number;
		ordersPerLevel?: number;
		pipCount?: number;
		comboHot?: boolean;
	}

	const store = new SimonUiStore();
	const ui = store as SimonUiStore & VisualExtras;

	let game: SimonGame | null = null;
	let host: HTMLDivElement | undefined = $state(undefined);

	let shakeOn = $state(false);
	let flashOn = $state(false);

	let pops = $state<FxPop[]>([]);
	let banner = $state<BannerFx | null>(null);

	let nextFxId = 1;
	let levelSeen = $state(1);
	let lastLives = $state(3);
	let burstIndex = $state(-1);

	let bannerTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		if (!host) {
			return;
		}

		const instance = new SimonGame();
		const bridge = new SvelteSimonAdapter(instance, store);

		game = instance;
		bridge.connect();

		const unsubAccepted = instance.on(SimonEvent.OrderAccepted, (raw) => {
			const payload = raw as OrderAcceptedFx;

			spawnPop(`+${payload.scoreDelta}`, payload.crit ? 'crit' : '');

			if (payload.crit) {
				spawnPop('КРИТ!', 'crit', 46);
			}

			if (payload.break) {
				spawnPop('☕ ПЕРЕКУР ЗАСЧИТАН', 'life', 20);
			}

			if (payload.lottery === 'life') {
				spawnPop('ИЗ «ЕЩЁ…» ВЫПАЛО: +1 ЖИЗНЬ ❤', 'life', 72);
			}

			if (payload.lottery === 'bonus500') {
				spawnPop('+500! ПРЕМИЯ ИЗ КУБЫШКИ', 'crit', 72);
			}

			if (payload.lottery === 'bonus200') {
				spawnPop('+200 БОНУС', '', 72);
			}
		});

		const unsubRejected = instance.on(SimonEvent.OrderRejected, () => {
			triggerBad();
			spawnPop('ОШИБКА!', 'bad', 28);
		});

		void instance.init(host).catch((error: unknown) => {
			console.error('[Simon] init failed', error);
		});

		return () => {
			unsubAccepted();
			unsubRejected();
			bridge.disconnect();
			instance.destroy();
			game = null;

			if (bannerTimer) {
				clearTimeout(bannerTimer);
			}
		};
	});

	$effect(() => {
		const level = store.level;

		if (level > levelSeen) {
			showBanner(`УРОВЕНЬ ${level}!`, 'приказы становятся бодрее');
		}

		if (level !== levelSeen) {
			levelSeen = level;
		}
	});

	$effect(() => {
		const lives = store.lives;

		if (lives < lastLives) {
			burstIndex = lives;

			setTimeout(() => {
				burstIndex = -1;
			}, 520);
		}

		if (lives !== lastLives) {
			lastLives = lives;
		}
	});

	const failureVisible = $derived(
		store.state === SimonState.FailureOrders ||
			store.state === SimonState.FailureClassic
	);

	const isMenu = $derived(store.state === SimonState.Menu);
	const isGameOver = $derived(store.state === SimonState.GameOver);
	const isOrders = $derived(store.mode === SimonMode.Orders);

	const fallbackMascotMood = $derived.by((): MascotMood => {
		if (failureVisible) {
			return 'angry';
		}

		if (isGameOver) {
			return 'shock';
		}

		if (isMenu) {
			return 'happy';
		}

		if (
			store.state === SimonState.OrdersFeedback ||
			store.state === SimonState.RoundTransition
		) {
			return 'happy';
		}

		if (
			store.state === SimonState.OrdersAwaiting ||
			store.state === SimonState.AwaitingInput
		) {
			return 'shout';
		}

		return 'normal';
	});

	const mascotMood = $derived(ui.mascotMood ?? fallbackMascotMood);

	const fallbackBossTag = $derived.by((): string => {
		if (failureVisible) {
			return 'ОШИБКА СМЕНЫ';
		}

		if (isGameOver) {
			return 'БАЗА УПАЛА';
		}

		if (isMenu) {
			return '1С ГОВОРИТ';
		}

		if (isOrders) {
			if (store.state === SimonState.OrdersAwaiting) {
				return store.orderSay ? '1С ПРИКАЗЫВАЕТ' : 'ПОСТОРОННИЙ ПРИКАЗ';
			}

			if (store.state === SimonState.OrdersFeedback) {
				return 'ДОКУМЕНТ ПРОВЕДЁН';
			}

			return 'ОЖИДАНИЕ';
		}

		if (store.state === SimonState.AwaitingInput) {
			return 'СИМОН ГОВОРИТ';
		}

		if (store.state === SimonState.RoundTransition) {
			return 'ПАКЕТ ПРОВЕДЁН';
		}

		return 'СИМОН ГОВОРИТ';
	});

	const bossTag = $derived(ui.bossTag ?? fallbackBossTag);

	const fallbackFlavorText = $derived.by((): string => {
		if (isMenu) {
			return 'база сама себя не проведёт…';
		}

		if (failureVisible) {
			return 'три нарушения — и смена окончена';
		}

		if (isGameOver) {
			return 'смена окончена';
		}

		if (isOrders && store.state === SimonState.OrdersAwaiting && !store.orderSay) {
			return 'это не от 1С — лучше пропустить';
		}

		if (store.state === SimonState.AwaitingInput) {
			return 'твой ход';
		}

		return '';
	});

	const flavorText = $derived(ui.flavorText ?? fallbackFlavorText);

	const isBreak = $derived(ui.isBreak ?? false);

	const ordersPerLevel = $derived(ui.ordersPerLevel ?? 7);

	const fallbackPipCount = $derived(
		Math.max(0, (Math.max(1, store.round) - 1) % ordersPerLevel)
	);

	const pipCount = $derived(ui.pipCount ?? fallbackPipCount);

	const pips = $derived(
		Array.from({ length: ordersPerLevel }, (_, index) => index < pipCount)
	);

	const comboHot = $derived(ui.comboHot ?? store.combo >= 5);

	const canSkip = $derived(
		isOrders && store.state === SimonState.OrdersAwaiting && !isBreak
	);

	const showSkip = $derived(isOrders && !isMenu && !isGameOver && !isBreak);
	const showAbort = $derived(!isMenu && !isGameOver);

	const newRecord = $derived(
		store.isGameOver && store.score > 0 && store.score >= store.best
	);

	const rank = $derived.by(() => {
		if (store.score >= 15000) {
			return {
				name: 'ГУРУ 1С',
				quip: 'О тебе слагают легенды в курилке.'
			};
		}

		if (store.score >= 10000) {
			return {
				name: 'АРХИТЕКТОР ХАОСА',
				quip: 'Конфигурация боится тебя.'
			};
		}

		if (store.score >= 6000) {
			return {
				name: 'ВЕДУЩИЙ ПОГРОМИСТ',
				quip: 'Главбух смотрит с уважением.'
			};
		}

		if (store.score >= 2500) {
			return {
				name: 'ПРОГРОМИСТ',
				quip: 'База жива. Пока.'
			};
		}

		return {
			name: 'КУРСАНТ 1С',
			quip: 'Тебе доверили только скрепки.'
		};
	});

	function spawnPop(text: string, cls = '', offset = 0): void {
		const id = nextFxId++;

		pops = [...pops, { id, text, cls, offset }];

		setTimeout(() => {
			pops = pops.filter((pop) => pop.id !== id);
		}, 950);
	}

	function showBanner(title: string, sub: string): void {
		if (bannerTimer) {
			clearTimeout(bannerTimer);
		}

		banner = {
			id: nextFxId++,
			title,
			sub
		};

		bannerTimer = setTimeout(() => {
			banner = null;
		}, 1200);
	}

	function triggerBad(): void {
		flashOn = true;
		shakeOn = true;

		setTimeout(() => {
			flashOn = false;
		}, 140);

		setTimeout(() => {
			shakeOn = false;
		}, 420);
	}

	function press(pad: SimonPadId): void {
		game?.pressPad(pad);
	}

	function startOrders(): void {
		game?.requestStartMode(SimonMode.Orders);
	}

	function startClassic(): void {
		game?.requestStartMode(SimonMode.Classic);
	}

	function skip(): void {
		game?.skip();
	}

	function acknowledgeFailure(): void {
		game?.acknowledgeFailure();
	}

	function restartToMenu(): void {
		game?.requestRestart();
	}

	function restartAndStart(): void {
		if (!game) {
			return;
		}

		game.requestRestart();
		game.requestStart();
	}
</script>

<div class="simon-arcade" class:shake={shakeOn}>
	<div class="bg-grid" aria-hidden="true"></div>

	<div class="doodles" aria-hidden="true">
		<div class="doodle paper hide-m" style="left: 2.5%; top: 16%;">
			<h4>НАКЛАДНАЯ №42</h4>
			<div class="lines"></div>
			<div class="stamp">ОПЛАЧЕНО</div>
		</div>

		<div
			class="doodle paper hide-l"
			style="right: 3%; bottom: 9%; --r: 8deg; animation-delay: -3s;"
		>
			<h4>АКТ ССЫК-3</h4>
			<div class="lines"></div>
			<div class="stamp stamp-blue">СРОЧНО!</div>
		</div>

		<div class="doodle sticky sticky-yellow hide-m" style="left: 15%; top: 6%; animation-delay: -1s;">
			почини принтер!!1
		</div>

		<div class="doodle sticky sticky-pink hide-l" style="right: 16%; top: 12%; animation-delay: -2.4s;">
			пароль: 123456
		</div>

		<div class="doodle sticky sticky-green hide-l" style="left: 5%; bottom: 22%; animation-delay: -4s;">
			дедлайн БЫЛ вчера
		</div>

		<div class="doodle db hide-l" style="left: 6%; bottom: 5%;">
			<div class="db-lid"></div>
			<div class="db-body">
				<b>БАЗА 1С</b>
				<small>v8.3 НЕ ТРОГАТЬ</small>
			</div>
			<span class="crack">⚡</span>
		</div>

		<div class="doodle coffee hide-l" style="right: 5%; top: 30%;">
			<svg width="102" height="90" viewBox="0 0 102 90">
				<g class="steam">
					<path
						d="M39 24 q5 -7 0 -14"
						stroke="#fff"
						stroke-width="4"
						fill="none"
						stroke-linecap="round"
						opacity=".7"
					/>
					<path
						d="M56 24 q-5 -7 0 -14"
						stroke="#fff"
						stroke-width="4"
						fill="none"
						stroke-linecap="round"
						opacity=".7"
					/>
				</g>

				<path d="M76 42 q18 6 0 22" fill="none" stroke="#1b1235" stroke-width="7" />
				<rect x="16" y="33" width="60" height="44" rx="10" fill="#fff" stroke="#1b1235" stroke-width="6" />
				<path d="M22 43 h48" stroke="#8b5a2b" stroke-width="7" stroke-linecap="round" />
				<text
					x="46"
					y="68"
					text-anchor="middle"
					font-size="14"
					fill="#e8352b"
					font-family="Russo One, sans-serif"
				>
					1С
				</text>
			</svg>
			<small>кофе = жизнь</small>
		</div>

		<div class="doodle errwin hide-l" style="left: 14%; bottom: 34%; animation-delay: -2s;">
			<div class="bar">
				ОШИБКА 0x1C
				<i>✖</i>
			</div>
			<div class="txt">
				Что-то пошло не так.<br />
				Как всегда, впрочем.
			</div>
			<div class="btns">
				<span>Закрыть</span>
				<span>Закрыть всё</span>
			</div>
		</div>

		<div class="doodle neon hide-m" style="left: 38%; top: 3%;">
			ООО «РОМАШКА»
		</div>

		<div class="doodle duck hide-l" style="right: 32%; bottom: 20%;">
			<svg width="58" height="52" viewBox="0 0 64 56">
				<ellipse cx="30" cy="40" rx="24" ry="14" fill="#ffd21f" stroke="#1b1235" stroke-width="5" />
				<circle cx="46" cy="20" r="13" fill="#ffd21f" stroke="#1b1235" stroke-width="5" />
				<path d="M58 20 h9 l-9 6 z" fill="#ff8c1a" stroke="#1b1235" stroke-width="4" stroke-linejoin="round" />
				<circle cx="49" cy="17" r="2.4" fill="#1b1235" />
			</svg>
			<small>ОТЛАДЧИК</small>
		</div>

		<span class="doodle codebit" style="left: 28%; bottom: 12%;">
			Если Правда Тогда КонецЕсли;
		</span>

		<span class="doodle codebit hide-l" style="right: 20%; top: 24%; animation-delay: -6s;">
			Запрос.Выполнить();
		</span>

		<span class="doodle codebit hide-m" style="left: 8%; top: 44%; animation-delay: -3s;">
			&amp;НаКлиентеНаСервере
		</span>
	</div>

	<div class="game-shell" bind:this={host}>
		<header class="marquee">
			<div class="lights" aria-hidden="true"></div>

			<div class="title-row">
				<span class="star">★</span>
				<h1>1С: <em>ПОГРОМИСТ</em></h1>
				<span class="star">★</span>
			</div>

			<p class="subtitle">
				СИМОН ГОВОРИТ: ПОГРОМИСТА ★ АРКАДНЫЙ РЕЖИМ ★ СМЕНА №8
			</p>

			<div class="lights" aria-hidden="true"></div>
		</header>

		<section class="hud" aria-label="Игровые показатели">
			<div class="chip score">
				<span class="chip-label">ОЧКИ</span>
				<b>{store.score}</b>
			</div>

			<div class="chip combo" class:hot={comboHot}>
				<span class="chip-label">КОМБО</span>
				<b>
					×{store.combo}
					{#if comboHot}
						<span class="flame">🔥</span>
					{/if}
				</b>
			</div>

			<div class="chip">
				<span class="chip-label">УРОВЕНЬ</span>
				<b>{store.level}</b>

				{#if isOrders}
					<div class="pips">
						{#each pips as lit, index (index)}
							<i class:on={lit}></i>
						{/each}
					</div>
				{/if}
			</div>

			<div class="chip">
				<span class="chip-label">ПРИКАЗ</span>
				<b>№{String(store.round).padStart(4, '0')}</b>
			</div>

			<div class="chip">
				<span class="chip-label">РЕКОРД</span>
				<b>{store.best}</b>
			</div>

			<div class="chip lives-chip">
				<span class="chip-label">ЖИЗНИ</span>
				<div class="lives">
					{#each [0, 1, 2] as index (index)}
						<svg
							class="heart"
							class:lost={index >= store.lives}
							class:burst={index === burstIndex}
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								d="M12 21s-8-5.3-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.7-8 11-8 11z"
							/>
						</svg>
					{/each}
				</div>
			</div>
		</section>

		<section class="stage">
			<div class="stage-row">
				<div class="mascot-box" data-mood={mascotMood}>
					<svg class="mascot" viewBox="0 0 200 210" aria-hidden="true">
						<rect
							x="20"
							y="20"
							width="160"
							height="170"
							rx="34"
							fill="#ffd21f"
							stroke="#1a1130"
							stroke-width="8"
						/>

						<path
							d="M38 42 q62 -18 124 0"
							stroke="rgba(255,255,255,0.5)"
							stroke-width="8"
							fill="none"
							stroke-linecap="round"
						/>

						<text x="100" y="80" text-anchor="middle" class="logo">1С</text>

						<g class="eye-open">
							<ellipse cx="70" cy="115" rx="18" ry="21" fill="#fff" stroke="#1a1130" stroke-width="5" />
							<ellipse cx="130" cy="115" rx="18" ry="21" fill="#fff" stroke="#1a1130" stroke-width="5" />

							<circle cx="74" cy="119" r="7" fill="#1a1130" />
							<circle cx="126" cy="119" r="7" fill="#1a1130" />

							<circle cx="77" cy="115" r="2.2" fill="#fff" />
							<circle cx="129" cy="115" r="2.2" fill="#fff" />
						</g>

						<g class="eye-happy">
							<path
								d="M54 116 q16 -18 32 0"
								stroke="#1a1130"
								stroke-width="6"
								fill="none"
								stroke-linecap="round"
							/>
							<path
								d="M114 116 q16 -18 32 0"
								stroke="#1a1130"
								stroke-width="6"
								fill="none"
								stroke-linecap="round"
							/>
						</g>

						<g class="eye-shock">
							<circle cx="70" cy="115" r="20" fill="#fff" stroke="#1a1130" stroke-width="5" />
							<circle cx="130" cy="115" r="20" fill="#fff" stroke="#1a1130" stroke-width="5" />

							<circle cx="70" cy="115" r="4.5" fill="#1a1130" />
							<circle cx="130" cy="115" r="4.5" fill="#1a1130" />
						</g>

						<g class="brows">
							<path d="M48 94 l40 12" stroke="#1a1130" stroke-width="7" stroke-linecap="round" />
							<path d="M152 94 l-40 12" stroke="#1a1130" stroke-width="7" stroke-linecap="round" />
						</g>

						<g class="mouth-smile">
							<path
								d="M76 158 q24 18 48 0"
								fill="none"
								stroke="#1a1130"
								stroke-width="6"
								stroke-linecap="round"
							/>
						</g>

						<g class="mouth-shout">
							<ellipse cx="100" cy="164" rx="18" ry="13" fill="#7c1220" stroke="#1a1130" stroke-width="5" />
							<ellipse cx="100" cy="170" rx="9" ry="4" fill="#ff6b6b" />
						</g>

						<g class="mouth-grit">
							<rect x="78" y="154" width="44" height="14" rx="5" fill="#fff" stroke="#1a1130" stroke-width="5" />
							<path d="M78 161 h44 M92 154 v14 M106 154 v14" stroke="#1a1130" stroke-width="3" />
						</g>

						<g class="coffee-cup">
							<path class="steam" d="M92 142 q4 -6 0 -12" />
							<path class="steam steam-2" d="M108 142 q-4 -6 0 -12" />

							<rect x="82" y="148" width="38" height="28" rx="7" fill="#fff" stroke="#1a1130" stroke-width="5" />
							<path d="M120 154 q13 3 0 15" fill="none" stroke="#1a1130" stroke-width="5" />
						</g>
					</svg>
				</div>

				<div class="speech">
					<span class="boss-tag">
						{bossTag}
					</span>

					<div class="order-text">
						{store.orderText || 'Ожидание приказа…'}
					</div>

					{#if flavorText}
						<div class="order-flavor">
							{flavorText}
						</div>
					{/if}

					<div class="timer">
						<i
							class:low={store.timerPercent <= 28}
							class:mid={store.timerPercent > 28 && store.timerPercent <= 55}
							style="width: {store.timerPercent}%"
						></i>
					</div>
				</div>
			</div>

			{#each pops as pop (pop.id)}
				<div class="pop-fx {pop.cls}" style="top: calc(38% - {pop.offset}px);">
					{pop.text}
				</div>
			{/each}
		</section>

		<section class="controls">
			<SimonPads {store} onPress={press} breakMode={isBreak} />

			<div class="actions">
				{#if showSkip}
					<button
						type="button"
						class="btn ghost"
						disabled={!canSkip}
						onclick={skip}
					>
						⏭ Пропустить
					</button>
				{/if}

				{#if showAbort}
					<button type="button" class="btn danger" onclick={restartToMenu}>
						⏹ В меню
					</button>
				{/if}
			</div>
		</section>

		<footer class="ticker" aria-hidden="true">
			<div class="ticker-track">
				<span>
					СРОЧНО: база снова легла отдохнуть ★ обновление конфигурации перенесено на никогда ★
					кофе закончился в 14:45 ★ найдена кнопка «сделать хорошо» — НЕ НАЖИМАТЬ ★
					главбух требует отчёт ещё вчера ★ резиновая утка признана лучшим отладчиком года ★
					клиент «ничего не менял» ★
				</span>

				<span>
					СРОЧНО: база снова легла отдохнуть ★ обновление конфигурации перенесено на никогда ★
					кофе закончился в 14:45 ★ найдена кнопка «сделать хорошо» — НЕ НАЖИМАТЬ ★
					главбух требует отчёт ещё вчера ★ резиновая утка признана лучшим отладчиком года ★
					клиент «ничего не менял» ★
				</span>
			</div>
		</footer>
	</div>

	<div class="scan" aria-hidden="true"></div>
	<div class="vig" aria-hidden="true"></div>
	<div class="flash" class:on={flashOn} aria-hidden="true"></div>

	{#if banner}
		<div class="banner" aria-hidden="true">
			<h2>{banner.title}</h2>
			<p>{banner.sub}</p>
		</div>
	{/if}

	{#if isMenu}
		<div class="overlay">
			<div class="card">
				<h2>1С: ПОГРОМИСТ</h2>
				<p class="tag">СИМОН ГОВОРИТ: ПОГРОМИСТА</p>

				<ul class="rules">
					<li>🗣️ 1С раздаёт приказы — жми нужную кнопку, пока не сгорел таймер.</li>
					<li>☕ Приказ «ПЕРЕКУР» — не жми ничего. Просто дыши.</li>
					<li>⚡ Кнопка «ЕЩЁ…» — лотерея: может выпасть жизнь или премия.</li>
					<li>🔥 Комбо растёт — очки множатся до ×5. Быстрый ответ = КРИТ!</li>
					<li>⌨️ Клавиши 1–4 тоже работают. 3 жизни — и смена окончена.</li>
				</ul>

				<div class="card-actions">
					<button type="button" class="bigbtn green" onclick={startOrders}>
						▶ ПРИКАЗЫ
					</button>

					<button type="button" class="bigbtn blue" onclick={startClassic}>
						🧠 КЛАССИКА
					</button>
				</div>

				<p class="hint">ИЛИ ЖМИ ENTER ★ МОНЕТКА УЖЕ В АВТОМАТЕ</p>
			</div>
		</div>
	{/if}

	{#if failureVisible}
		<div class="overlay">
			<div class="card error">
				<h2>ОШИБКА СМЕНЫ</h2>
				<p class="text">{store.failureTitle}</p>
				<p class="text">
					Осталось нарушений до увольнения: {Math.max(store.lives, 0)} из 3.
				</p>

				<div class="card-actions">
					<button type="button" class="bigbtn green" onclick={acknowledgeFailure}>
						ОК
					</button>

					<button type="button" class="bigbtn red" onclick={restartToMenu}>
						ЗАВЕРШИТЬ СМЕНУ
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if isGameOver}
		<div class="overlay">
			<div class="card error">
				<h2>БАЗА УПААЛА 💥</h2>
				<p class="tag">СМЕНА ОКОНЧЕНА</p>

				{#if newRecord}
					<div class="newrec">★ НОВЫЙ РЕКОРД! ★</div>
				{/if}

				<div class="final-score">
					{store.score}
				</div>

				<div class="stats">
					<div>
						<span class="stat-label">УРОВЕНЬ</span>
						<b>{store.level}</b>
					</div>

					<div>
						<span class="stat-label">КОМБО</span>
						<b>×{store.combo}</b>
					</div>

					<div>
						<span class="stat-label">РЕКОРД</span>
						<b>{store.best}</b>
					</div>
				</div>

				<div class="rank">
					{rank.name}
				</div>

				<div class="rank-quip">
					{rank.quip}
				</div>

				<div class="card-actions">
					<button type="button" class="bigbtn green" onclick={restartAndStart}>
						↻ ЕЩЁ РАЗ
					</button>

					<button type="button" class="bigbtn blue" onclick={restartToMenu}>
						МЕНЮ
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(html, body) {
		width: 100%;
		height: 100%;
		margin: 0;
		overflow: hidden;
		overscroll-behavior: none;
	}

	.simon-arcade {
		--ink: #1a1130;
		--deep: #0b071f;
		--yellow: #ffd21f;
		--red: #ff4757;
		--green: #2ed573;
		--blue: #3f8cff;
		--cyan: #39e6ff;
		--pink: #ff5fa2;
		--orange: #ffab1f;

		--font-display: 'Russo One', 'Arial Black', sans-serif;
		--font-body: 'Rubik', system-ui, sans-serif;
		--font-pixel: 'Press Start 2P', monospace;
		--font-hand: 'Caveat', cursive;

		position: fixed;
		inset: 0;
		overflow: hidden;
		color: #fff;
		font-family: var(--font-body);
		background:
			radial-gradient(1000px 620px at 76% -8%, rgba(255, 140, 60, 0.16), transparent 60%),
			radial-gradient(880px 620px at 6% 104%, rgba(57, 230, 255, 0.12), transparent 62%),
			radial-gradient(900px 700px at 94% 92%, rgba(255, 95, 162, 0.13), transparent 55%),
			linear-gradient(180deg, #1c1246, #130b2e 58%, #0d0822);
	}

	.simon-arcade.shake {
		animation: simon-shake 0.4s;
	}

	@keyframes simon-shake {
		0%,
		100% {
			transform: translate(0, 0);
		}
		15% {
			transform: translate(-10px, 3px);
		}
		30% {
			transform: translate(9px, -4px);
		}
		45% {
			transform: translate(-7px, 2px);
		}
		60% {
			transform: translate(6px, -2px);
		}
		80% {
			transform: translate(-3px, 1px);
		}
	}

	.bg-grid,
	.doodles,
	.scan,
	.vig,
	.flash {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.bg-grid {
		z-index: 0;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
		background-size: 46px 46px;
		opacity: 0.8;
	}

	.doodles {
		z-index: 1;
		overflow: hidden;
	}

	.scan {
		z-index: 3;
		opacity: 0.28;
		background: repeating-linear-gradient(
			0deg,
			rgba(0, 0, 0, 0.08) 0 2px,
			transparent 2px 4px
		);
	}

	.vig {
		z-index: 3;
		box-shadow: inset 0 0 190px rgba(5, 2, 20, 0.88);
	}

	.flash {
		z-index: 40;
		opacity: 0;
		transition: opacity 0.35s;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(255, 60, 60, 0.45),
			rgba(255, 0, 60, 0.15) 70%
		);
	}

	.flash.on {
		opacity: 1;
		transition: opacity 0s;
	}

	.doodle {
		position: absolute;
		filter: drop-shadow(5px 7px 0 rgba(0, 0, 0, 0.26));
		animation: simon-bob 7s ease-in-out infinite;
	}

	@keyframes simon-bob {
		0%,
		100% {
			transform: translateY(0) rotate(var(--r, 0deg));
		}
		50% {
			transform: translateY(-12px) rotate(var(--r, 0deg));
		}
	}

	.paper {
		width: 132px;
		height: 170px;
		background: #fff8e8;
		border: 4px solid #1b1235;
		border-radius: 8px;
		padding: 12px;
		--r: -8deg;
	}

	.paper h4 {
		font-family: var(--font-pixel);
		font-size: 7px;
		letter-spacing: 0.12em;
		color: #5b4bb0;
	}

	.paper .lines {
		margin-top: 8px;
		height: 84px;
		background: repeating-linear-gradient(
			180deg,
			#cdc5ee 0 2px,
			transparent 2px 11px
		);
	}

	.paper .stamp {
		position: absolute;
		right: 8px;
		bottom: 10px;
		width: 56px;
		height: 56px;
		border: 4px solid #e8352b;
		border-radius: 50%;
		color: #e8352b;
		display: grid;
		place-items: center;
		font-size: 9px;
		font-weight: 900;
		transform: rotate(-18deg);
		opacity: 0.88;
	}

	.paper .stamp-blue {
		border-color: #1f7ae0;
		color: #1f7ae0;
	}

	.sticky {
		width: 88px;
		height: 88px;
		border: 3px solid #1b1235;
		border-radius: 6px;
		display: grid;
		place-items: center;
		padding: 8px;
		font-family: var(--font-hand);
		font-size: 20px;
		line-height: 1;
		color: #3a2c10;
		text-align: center;
	}

	.sticky-yellow {
		background: #ffe95e;
		--r: 6deg;
	}

	.sticky-pink {
		background: #ff9ad5;
		--r: -6deg;
		color: #5c1030;
	}

	.sticky-green {
		background: #7ef0c1;
		--r: 4deg;
		color: #0c4a30;
	}

	.db {
		width: 104px;
		--r: 4deg;
	}

	.db-lid {
		width: 104px;
		height: 32px;
		background: #8f7bff;
		border: 4px solid #1b1235;
		border-radius: 50%;
	}

	.db-body {
		width: 104px;
		height: 88px;
		margin-top: -16px;
		background: linear-gradient(90deg, #5b46c9, #8f7bff 42%, #5b46c9);
		border: 4px solid #1b1235;
		border-radius: 0 0 52px 52px / 0 0 32px 32px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		color: #fff;
	}

	.db-body b {
		font-family: var(--font-display);
		font-size: 15px;
		text-shadow: 2px 2px 0 #1b1235;
	}

	.db-body small {
		font-family: var(--font-pixel);
		font-size: 6px;
		color: #ddd6ff;
	}

	.db .crack {
		position: absolute;
		left: 18px;
		top: 52px;
		font-size: 20px;
		transform: rotate(18deg);
	}

	.coffee {
		width: 102px;
		--r: -4deg;
	}

	.coffee svg {
		display: block;
		overflow: visible;
	}

	.steam path {
		animation: simon-steam 2.5s ease-in-out infinite;
	}

	.steam path:nth-child(2) {
		animation-delay: 1.1s;
	}

	@keyframes simon-steam {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		30% {
			opacity: 0.85;
		}
		100% {
			transform: translateY(-15px);
			opacity: 0;
		}
	}

	.coffee small {
		display: block;
		text-align: center;
		font-family: var(--font-hand);
		font-size: 18px;
		color: #ffd9b0;
		margin-top: 2px;
	}

	.errwin {
		width: 205px;
		background: #f4f2ff;
		border: 4px solid #1b1235;
		border-radius: 10px;
		overflow: hidden;
		--r: 2deg;
		font-size: 11px;
	}

	.errwin .bar {
		background: linear-gradient(90deg, #ff5252, #d21f3c);
		padding: 5px 8px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #fff;
		font-weight: 800;
		border-bottom: 4px solid #1b1235;
	}

	.errwin .bar i {
		font-style: normal;
		width: 18px;
		height: 18px;
		border-radius: 5px;
		background: #fff;
		color: #d21f3c;
		border: 2px solid #1b1235;
		display: grid;
		place-items: center;
		font-size: 10px;
		font-weight: 900;
	}

	.errwin .txt {
		padding: 8px;
		color: #2a2150;
		font-weight: 600;
	}

	.errwin .btns {
		display: flex;
		gap: 6px;
		padding: 0 8px 10px;
	}

	.errwin .btns span {
		flex: 1;
		text-align: center;
		background: #fff;
		border: 3px solid #1b1235;
		border-radius: 8px;
		padding: 3px 4px;
		font-size: 9px;
		font-weight: 800;
		color: #2a2150;
		box-shadow: 0 3px 0 #1b1235;
	}

	.neon {
		font-family: var(--font-pixel);
		font-size: 11px;
		letter-spacing: 0.18em;
		color: var(--pink);
		border: 3px solid var(--pink);
		border-radius: 12px;
		padding: 10px 14px;
		text-shadow: 0 0 8px rgba(255, 95, 162, 0.8);
		box-shadow:
			0 0 14px rgba(255, 95, 162, 0.5),
			inset 0 0 12px rgba(255, 95, 162, 0.28);
		animation: simon-neon 5s linear infinite;
		--r: -2deg;
	}

	@keyframes simon-neon {
		0%,
		86%,
		92%,
		100% {
			opacity: 1;
		}
		88%,
		90% {
			opacity: 0.35;
		}
	}

	.duck {
		--r: -5deg;
	}

	.duck small {
		display: block;
		text-align: center;
		font-family: var(--font-pixel);
		font-size: 6px;
		letter-spacing: 0.16em;
		color: #ffe9a0;
		margin-top: 4px;
	}

	.codebit {
		font-family: var(--font-pixel);
		font-size: 9px;
		color: rgba(180, 200, 255, 0.18);
		animation: simon-drift 16s ease-in-out infinite;
		--r: 0deg;
	}

	@keyframes simon-drift {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-26px);
		}
	}

	.hide-l,
	.hide-m {
		display: block;
	}

	@media (max-width: 1180px) {
		.hide-l {
			display: none;
		}
	}

	@media (max-width: 860px) {
		.hide-m {
			display: none;
		}
	}

	.game-shell {
		position: relative;
		z-index: 2;
		min-height: 100dvh;
		width: min(1120px, 96vw);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px 8px;
	}

	.marquee {
		flex: none;
		background: linear-gradient(180deg, rgba(46, 29, 99, 0.92), rgba(22, 12, 52, 0.92));
		border: 4px solid var(--deep);
		border-radius: 18px;
		padding: 8px 14px 10px;
		text-align: center;
		box-shadow:
			0 10px 0 rgba(0, 0, 0, 0.25),
			0 0 44px rgba(255, 210, 31, 0.08);
	}

	.lights {
		height: 10px;
		background-image: radial-gradient(
			circle at 5px 5px,
			rgba(255, 210, 31, 0.95) 3px,
			rgba(255, 210, 31, 0.18) 4px,
			transparent 5px
		);
		background-size: 26px 10px;
		filter: drop-shadow(0 0 4px rgba(255, 210, 31, 0.55));
		animation: simon-bulb 1s steps(2) infinite;
	}

	@keyframes simon-bulb {
		0%,
		49% {
			opacity: 1;
		}
		50%,
		100% {
			opacity: 0.22;
		}
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		margin-top: 6px;
	}

	.title-row h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(28px, 5vw, 54px);
		line-height: 1;
		letter-spacing: 0.04em;
		color: var(--yellow);
		transform: rotate(-1deg);
		text-shadow:
			0 3px 0 #e8352b,
			0 6px 0 rgba(0, 0, 0, 0.35),
			0 0 26px rgba(255, 210, 31, 0.35);
	}

	.title-row em {
		font-style: normal;
		color: #fff;
	}

	.star {
		color: var(--yellow);
		font-size: clamp(16px, 2.5vw, 28px);
		text-shadow: 0 0 12px rgba(255, 210, 31, 0.75);
		animation: simon-spin 6s linear infinite;
	}

	.title-row .star:last-child {
		animation-direction: reverse;
	}

	@keyframes simon-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.subtitle {
		margin: 7px 0 4px;
		font-family: var(--font-pixel);
		font-size: clamp(7px, 1.1vw, 10px);
		letter-spacing: 2px;
		color: var(--cyan);
		text-shadow: 0 0 10px rgba(57, 230, 255, 0.7);
	}

	.hud {
		flex: none;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: stretch;
		gap: 8px;
	}

	.chip {
		min-width: 92px;
		padding: 7px 10px;
		border-radius: 14px;
		background: rgba(13, 8, 34, 0.82);
		border: 2px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 6px 0 rgba(0, 0, 0, 0.26);
		display: grid;
		justify-items: center;
		gap: 3px;
	}

	.chip-label {
		font-family: var(--font-pixel);
		font-size: 7px;
		letter-spacing: 1px;
		color: #8fd8ff;
	}

	.chip b {
		font-family: var(--font-display);
		font-size: clamp(16px, 2vw, 22px);
		line-height: 1;
	}

	.chip.score b {
		font-family: var(--font-pixel);
		font-size: clamp(12px, 1.5vw, 16px);
		color: var(--yellow);
		text-shadow: 0 0 10px rgba(255, 210, 31, 0.55);
	}

	.chip.combo b {
		color: var(--orange);
	}

	.chip.combo.hot b {
		color: #ff5230;
		animation: simon-hot-pulse 0.45s ease-in-out infinite;
	}

	.flame {
		display: inline-block;
		animation: simon-hot-pulse 0.3s infinite;
	}

	@keyframes simon-hot-pulse {
		50% {
			transform: scale(1.18);
		}
	}

	.pips {
		display: flex;
		gap: 3px;
		margin-top: 3px;
	}

	.pips i {
		width: 7px;
		height: 7px;
		border-radius: 2px;
		background: #332a63;
		box-shadow: inset 0 0 0 1px #0b071f;
	}

	.pips i.on {
		background: var(--cyan);
		box-shadow: 0 0 6px var(--cyan);
	}

	.lives {
		display: flex;
		gap: 4px;
		padding-top: 2px;
	}

	.heart {
		width: 24px;
		height: 22px;
	}

	.heart path {
		fill: #ff4d6d;
		stroke: #7c0f2b;
		stroke-width: 2;
	}

	.heart.lost path {
		fill: #3a3356;
		stroke: #241d45;
	}

	.heart.burst {
		animation: simon-heart-burst 0.5s;
	}

	@keyframes simon-heart-burst {
		0% {
			transform: scale(1);
		}
		30% {
			transform: scale(1.6) rotate(-14deg);
		}
		100% {
			transform: scale(1);
		}
	}

	.stage {
		flex: 1;
		min-height: 220px;
		position: relative;
		display: grid;
		place-items: center;
		padding: 8px 0;
	}

	.stage-row {
		width: min(920px, 96vw);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: clamp(14px, 3vw, 34px);
	}

	.mascot-box {
		flex: none;
		width: clamp(110px, 19vh, 180px);
		animation: simon-mascot-bob 3.2s ease-in-out infinite;
		filter: drop-shadow(7px 8px 0 rgba(0, 0, 0, 0.28));
	}

	.mascot {
		display: block;
		width: 100%;
		height: auto;
	}

	.logo {
		font-family: var(--font-display);
		font-size: 36px;
		fill: #e8352b;
		stroke: #fff;
		stroke-width: 1.2px;
		paint-order: stroke;
	}

	.mascot g {
		transition: opacity 0.15s;
	}

	.eye-happy,
	.eye-shock,
	.brows,
	.mouth-shout,
	.mouth-grit,
	.coffee-cup {
		opacity: 0;
	}

	.eye-open {
		animation: simon-mascot-blink 4.2s infinite;
		transform-box: fill-box;
		transform-origin: center;
	}

	@keyframes simon-mascot-blink {
		0%,
		93%,
		100% {
			transform: scaleY(1);
		}
		95.5% {
			transform: scaleY(0.12);
		}
	}

	.mascot-box[data-mood='normal'] .eye-open,
	.mascot-box[data-mood='shout'] .eye-open {
		opacity: 1;
	}

	.mascot-box[data-mood='normal'] .mouth-smile,
	.mascot-box[data-mood='happy'] .mouth-smile {
		opacity: 1;
	}

	.mascot-box[data-mood='happy'] .eye-open {
		opacity: 0;
	}

	.mascot-box[data-mood='happy'] .eye-happy {
		opacity: 1;
	}

	.mascot-box[data-mood='shout'] .mouth-smile {
		opacity: 0;
	}

	.mascot-box[data-mood='shout'] .mouth-shout {
		opacity: 1;
	}

	.mascot-box[data-mood='shock'] .eye-open {
		opacity: 0;
	}

	.mascot-box[data-mood='shock'] .eye-shock {
		opacity: 1;
	}

	.mascot-box[data-mood='shock'] .mouth-smile {
		opacity: 0;
	}

	.mascot-box[data-mood='shock'] .mouth-shout {
		opacity: 1;
	}

	.mascot-box[data-mood='angry'] .brows {
		opacity: 1;
	}

	.mascot-box[data-mood='angry'] .mouth-smile {
		opacity: 0;
	}

	.mascot-box[data-mood='angry'] .mouth-grit {
		opacity: 1;
	}

	.mascot-box[data-mood='coffee'] .eye-open {
		opacity: 0;
	}

	.mascot-box[data-mood='coffee'] .eye-happy {
		opacity: 1;
	}

	.mascot-box[data-mood='coffee'] .mouth-smile {
		opacity: 0;
	}

	.mascot-box[data-mood='coffee'] .coffee-cup {
		opacity: 1;
	}

	.coffee-cup .steam {
		fill: none;
		stroke: #fff;
		stroke-width: 3.5;
		stroke-linecap: round;
		opacity: 0.85;
		animation: simon-mascot-steam 2.2s ease-in-out infinite;
	}

	.coffee-cup .steam-2 {
		animation-delay: 1s;
	}

	@keyframes simon-mascot-steam {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		30% {
			opacity: 0.85;
		}
		100% {
			transform: translateY(-12px);
			opacity: 0;
		}
	}

	@keyframes simon-mascot-bob {
		0%,
		100% {
			transform: translateY(0) rotate(-2deg);
		}
		50% {
			transform: translateY(-8px) rotate(2deg);
		}
	}

	.speech {
		position: relative;
		flex: 1;
		min-width: 0;
		max-width: 660px;
		background: #fffdf2;
		color: var(--ink);
		border: 5px solid #14102e;
		border-radius: 26px;
		padding: 16px 18px;
		box-shadow: 9px 9px 0 rgba(0, 0, 0, 0.3);
	}

	.speech::before {
		content: '';
		position: absolute;
		left: -22px;
		top: 46px;
		width: 24px;
		height: 24px;
		background: #fffdf2;
		border-left: 5px solid #14102e;
		border-bottom: 5px solid #14102e;
		transform: rotate(45deg);
	}

	.boss-tag {
		display: inline-block;
		font-family: var(--font-display);
		font-size: clamp(11px, 1.4vw, 15px);
		letter-spacing: 1px;
		background: #e8352b;
		color: #fff;
		padding: 4px 12px;
		border-radius: 8px;
		transform: rotate(-2deg);
		box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.25);
	}

	.order-text {
		margin: 10px 0 12px;
		font-family: var(--font-display);
		font-size: clamp(20px, 3vw, 34px);
		line-height: 1.18;
	}

	.order-flavor {
		margin-top: 4px;
		font-family: var(--font-hand);
		font-size: clamp(16px, 1.9vw, 22px);
		color: #7a5f2c;
		transform: rotate(-0.6deg);
	}

	.timer {
		height: 16px;
		background: #241a4d;
		border: 3px solid #14102e;
		border-radius: 10px;
		overflow: hidden;
	}

	.timer i {
		position: relative;
		display: block;
		height: 100%;
		width: 100%;
		border-radius: 6px;
		background: var(--green);
		transition: width 0.08s linear;
		overflow: hidden;
	}

	.timer i::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 6px;
		background: repeating-linear-gradient(
			45deg,
			rgba(255, 255, 255, 0.25) 0 8px,
			transparent 8px 16px
		);
		animation: simon-stripe 0.7s linear infinite;
	}

	@keyframes simon-stripe {
		to {
			background-position: 22px 0;
		}
	}

	.timer i.mid {
		background: #ffb020;
	}

	.timer i.low {
		background: var(--red);
		animation: simon-timer-pulse 0.3s infinite;
	}

	@keyframes simon-timer-pulse {
		50% {
			filter: brightness(1.7);
		}
	}

	.pop-fx {
		position: absolute;
		left: 50%;
		z-index: 30;
		transform: translateX(-50%);
		font-family: var(--font-display);
		font-size: 24px;
		color: var(--yellow);
		pointer-events: none;
		white-space: nowrap;
		text-shadow:
			0 3px 0 rgba(0, 0, 0, 0.55),
			0 0 16px rgba(255, 210, 31, 0.5);
		animation: simon-pop-rise 0.95s ease-out forwards;
	}

	.pop-fx.crit {
		color: #fff;
		font-size: 32px;
		text-shadow:
			0 3px 0 #e8352b,
			0 0 20px #ff4757;
	}

	.pop-fx.life {
		color: #ff8fa8;
	}

	.pop-fx.bad {
		color: #ff6a5e;
	}

	@keyframes simon-pop-rise {
		0% {
			opacity: 0;
			transform: translate(-50%, 0) scale(0.6);
		}
		25% {
			opacity: 1;
			transform: translate(-50%, -40px) scale(1.1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -140px) scale(1);
		}
	}

	.controls {
		flex: none;
		display: grid;
		justify-items: center;
		gap: 18px;
		padding-bottom: clamp(56px, 14vh, 150px);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
	}

	.btn {
		border: 0;
		border-radius: 14px;
		padding: 10px 16px;
		font-family: inherit;
		font-size: 14px;
		font-weight: 700;
		color: #fff;
		cursor: pointer;
		background: linear-gradient(#63a6ff, #2f6fe0);
		box-shadow: 0 7px 0 #173e93;
		transition:
			transform 0.06s,
			box-shadow 0.06s,
			filter 0.15s;
	}

	.btn:hover:not(:disabled) {
		filter: brightness(1.08);
	}

	.btn:active:not(:disabled) {
		transform: translateY(4px);
		box-shadow: 0 3px 0 #173e93;
	}

	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.btn.ghost {
		background: linear-gradient(#63a6ff, #2f6fe0);
		box-shadow: 0 7px 0 #173e93;
	}

	.btn.danger {
		background: linear-gradient(#ff6a5e, #e02f2f);
		box-shadow: 0 7px 0 #8f1414;
	}

	.ticker {
		flex: none;
		overflow: hidden;
		background: #120b2e;
		border: 3px solid var(--deep);
		border-radius: 12px;
		padding: 6px 0;
		box-shadow: 0 5px 0 rgba(0, 0, 0, 0.3);
	}

	.ticker-track {
		display: flex;
		width: max-content;
		animation: simon-marquee 28s linear infinite;
		font-family: var(--font-pixel);
		font-size: 8px;
		color: #8fd8ff;
		letter-spacing: 1px;
	}

	.ticker-track span {
		padding-right: 42px;
		white-space: nowrap;
	}

	@keyframes simon-marquee {
		to {
			transform: translateX(-50%);
		}
	}

	.banner {
		position: fixed;
		inset: 0;
		z-index: 55;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		animation: simon-banner 1.1s ease forwards;
	}

	.banner h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(40px, 8vw, 84px);
		color: var(--yellow);
		text-shadow:
			0 4px 0 #e8352b,
			0 8px 0 rgba(0, 0, 0, 0.4),
			0 0 40px rgba(255, 210, 31, 0.7);
	}

	.banner p {
		margin-top: 10px;
		font-family: var(--font-pixel);
		font-size: clamp(8px, 1.4vw, 12px);
		color: var(--cyan);
		text-shadow: 0 0 10px var(--cyan);
	}

	@keyframes simon-banner {
		0% {
			opacity: 0;
			transform: scale(0.5);
		}
		18% {
			opacity: 1;
			transform: scale(1.1);
		}
		30% {
			transform: scale(1);
		}
		80% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: scale(1.06);
		}
	}

	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		place-items: center;
		padding: 16px;
		background: rgba(6, 3, 20, 0.78);
		backdrop-filter: blur(4px);
	}

	.card {
		width: min(640px, 94vw);
		background: linear-gradient(180deg, #2b1d5e, #160e34);
		border: 3px solid #080416;
		border-radius: 24px;
		padding: 22px;
		text-align: center;
		box-shadow:
			0 18px 0 rgba(0, 0, 0, 0.32),
			0 0 60px rgba(255, 210, 31, 0.08);
	}

	.card h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(28px, 4.5vw, 44px);
		line-height: 1.05;
		color: var(--yellow);
		text-shadow:
			0 3px 0 #e8352b,
			0 6px 0 rgba(0, 0, 0, 0.35);
	}

	.card.error h2 {
		color: #ff6a5e;
		text-shadow:
			0 3px 0 #7c0f2b,
			0 6px 0 rgba(0, 0, 0, 0.35);
	}

	.tag {
		margin: 8px 0 12px;
		font-family: var(--font-pixel);
		font-size: 9px;
		letter-spacing: 2px;
		color: var(--cyan);
	}

	.rules {
		margin: 0 auto 18px;
		max-width: 460px;
		display: flex;
		flex-direction: column;
		gap: 9px;
		padding: 0;
		text-align: left;
	}

	.rules li {
		list-style: none;
		font-size: clamp(13px, 1.6vw, 16px);
		font-weight: 600;
		color: #e8e4ff;
		background: #120b2e;
		border: 3px solid var(--deep);
		border-radius: 12px;
		padding: 8px 12px;
		box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
	}

	.text {
		margin: 0 auto 14px;
		max-width: 52ch;
		line-height: 1.5;
		color: #e8e4ff;
	}

	.card-actions {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 12px;
	}

	.bigbtn {
		border: 0;
		border-radius: 18px;
		padding: 13px 24px;
		font-family: var(--font-display);
		font-size: 18px;
		letter-spacing: 0.03em;
		color: #fff;
		cursor: pointer;
		transition:
			transform 0.06s,
			filter 0.15s;
	}

	.bigbtn:hover {
		filter: brightness(1.08);
	}

	.bigbtn:active {
		transform: translateY(5px);
	}

	.bigbtn.green {
		background: linear-gradient(#5ce96f, #1fae3f);
		box-shadow:
			0 10px 0 #0e6b24,
			0 18px 26px rgba(0, 0, 0, 0.35);
	}

	.bigbtn.blue {
		background: linear-gradient(#63a6ff, #2f6fe0);
		box-shadow:
			0 10px 0 #173e93,
			0 18px 26px rgba(0, 0, 0, 0.35);
	}

	.bigbtn.red {
		background: linear-gradient(#ff6a5e, #e02f2f);
		box-shadow:
			0 10px 0 #8f1414,
			0 18px 26px rgba(0, 0, 0, 0.35);
	}

	.hint {
		margin-top: 14px;
		font-family: var(--font-pixel);
		font-size: 8px;
		color: #9d8dff;
		letter-spacing: 1px;
	}

	.newrec {
		display: inline-block;
		font-family: var(--font-display);
		font-size: 14px;
		background: var(--yellow);
		color: var(--ink);
		padding: 4px 12px;
		border-radius: 8px;
		transform: rotate(-2deg);
		box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.4);
		animation: simon-hot-pulse 0.5s infinite;
		margin-bottom: 6px;
	}

	.final-score {
		font-family: var(--font-pixel);
		font-size: clamp(20px, 3.4vw, 32px);
		color: var(--yellow);
		margin: 12px 0 4px;
		text-shadow: 0 0 16px rgba(255, 210, 31, 0.6);
	}

	.stats {
		display: flex;
		gap: 10px;
		justify-content: center;
		flex-wrap: wrap;
		margin: 14px 0;
	}

	.stats div {
		background: #120b2e;
		border: 3px solid var(--deep);
		border-radius: 12px;
		padding: 8px 14px;
		min-width: 104px;
	}

	.stat-label {
		display: block;
		font-family: var(--font-pixel);
		font-size: 6px;
		color: #8fd8ff;
		letter-spacing: 1px;
		margin-bottom: 5px;
	}

	.stats b {
		font-family: var(--font-display);
		font-size: 18px;
	}

	.rank {
		font-family: var(--font-display);
		font-size: clamp(18px, 3vw, 26px);
		color: var(--cyan);
		text-shadow: 0 0 14px rgba(57, 230, 255, 0.6);
		margin-top: 4px;
	}

	.rank-quip {
		font-family: var(--font-hand);
		font-size: 22px;
		color: #ffd9b0;
		margin: 4px 0 12px;
	}

	@media (max-width: 760px) {
		.stage-row {
			flex-direction: column;
			gap: 10px;
		}

		.speech {
			width: 100%;
			max-width: none;
		}

		.speech::before {
			display: none;
		}

		.controls {
			padding-bottom: clamp(48px, 12vh, 110px);
		}

		.chip {
			min-width: 76px;
			padding: 5px 8px;
		}

		.order-text {
			font-size: clamp(18px, 4.4vw, 26px);
		}
	}

	@media (max-height: 700px) {
		.controls {
			padding-bottom: clamp(36px, 8vh, 84px);
		}

		.stage {
			min-height: 160px;
		}
	}
</style>