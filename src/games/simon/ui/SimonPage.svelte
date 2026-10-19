<script lang="ts">
	import { onMount } from 'svelte';
	import { SimonGame } from '../core/GameMain';
	import { SimonEvent } from '../core/Events';
	import { SimonMode, SimonState, type SimonPadId } from '../core/SimonTypes';
	import SimonBackground from './SimonBackground.svelte';
	import SimonMascot from './SimonMascot.svelte';
	import SimonPads from './SimonPads.svelte';
	import SimonTicker from './SimonTicker.svelte';
	import { SvelteSimonAdapter } from './SvelteSimonAdapter';
	import { SimonUiStore } from './SimonUiStore.svelte';

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

	const store = new SimonUiStore();

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

		const unsubAccepted = instance.on(SimonEvent.OrderAccepted, (payload) => {
			spawnPop(`+${payload.scoreDelta}`, payload.crit ? 'crit' : '');

			if (payload.crit) {
				spawnPop('КРИТ!', 'crit', 46);
			}

			if (payload['break']) {
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

		const onKey = (event: KeyboardEvent): void => {
			if (event.code !== 'KeyM' || event.repeat) {
				return;
			}
			event.preventDefault();
			toggleMute();
		};

		window.addEventListener('keydown', onKey);

		void instance.init(host).catch((error: unknown) => {
			console.error('[SimonPage] init failed', error);
		});

		return () => {
			window.removeEventListener('keydown', onKey);
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
	const isPaused = $derived(store.state === SimonState.Paused);
	const isOrders = $derived(store.mode === SimonMode.Orders);
	const mascotMood = $derived(store.mascotMood);
	const bossTag = $derived(store.bossTag);
	const flavorText = $derived(store.flavorText);
	const isBreak = $derived(store.isBreak);
	const ordersPerLevel = $derived(store.ordersPerLevel);
	const pipCount = $derived(store.pipCount);
	const pips = $derived(
		Array.from({ length: ordersPerLevel }, (_, index) => index < pipCount)
	);
	const comboHot = $derived(store.comboHot);
	const muted = $derived(store.muted);
	const canSkip = $derived(
		isOrders &&
			store.state === SimonState.OrdersAwaiting &&
			!isBreak &&
			!isPaused
	);
	const showSkip = $derived(
		isOrders && !isMenu && !isGameOver && !isBreak && !isPaused
	);
	const showAbort = $derived(!isMenu && !isGameOver && !isPaused);
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

	function toggleMute(): void {
		game?.toggleMute();
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

	function resume(): void {
		game?.resume();
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
	<SimonBackground />

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

			<div class="chip sound-chip">
				<span class="chip-label">ЗВУК</span>
				<button
					type="button"
					class="sound-btn"
					class:off={muted}
					aria-pressed={muted}
					title="Звук (M)"
					onclick={toggleMute}
				>
					{muted ? '🔇' : '🔊'}
				</button>
			</div>
		</section>

		<section class="stage">
			<div class="stage-row">
				<SimonMascot mood={mascotMood} />

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

		<SimonTicker />
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
					<li>⌨️ Клавиши 1–4 работают. ESC — пауза, M — звук. 3 жизни — и смена окончена.</li>
				</ul>

				<div class="card-actions">
					<button type="button" class="bigbtn green" onclick={startOrders}>
						▶ ПРИКАЗЫ
					</button>
					<button type="button" class="bigbtn blue" onclick={startClassic}>
						🧠 КЛАССИКА
					</button>
					<button type="button" class="bigbtn dark" onclick={toggleMute}>
						{muted ? '🔇 ЗВУК ВЫКЛ' : '🔊 ЗВУК ВКЛ'}
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
				<h2>БАЗА УПАЛА 💥</h2>
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
						<span class="stat-label">ЛУЧШЕЕ КОМБО</span>
						<b>×{store.bestCombo}</b>
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

	{#if isPaused}
		<div class="overlay">
			<div class="card">
				<h2>ПАУЗА</h2>
				<p class="tag">1С ПЕРЕЗАГРУЖАЕТСЯ… ПОДОЖДИТЕ</p>

				<div class="card-actions">
					<button type="button" class="bigbtn green" onclick={resume}>
						▶ ПРОДОЛЖИТЬ
					</button>
					<button type="button" class="bigbtn blue" onclick={restartToMenu}>
						МЕНЮ
					</button>
					<button type="button" class="bigbtn dark" onclick={toggleMute}>
						{muted ? '🔇 ЗВУК ВЫКЛ' : '🔊 ЗВУК ВКЛ'}
					</button>
				</div>

				<p class="hint">ESC — ПАУЗА / ПРОДОЛЖИТЬ ★ M — ЗВУК</p>
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
		user-select: none;
		background: linear-gradient(180deg, #1c1246, #130b2e 58%, #0d0822);
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

	.scan,
	.vig,
	.flash {
		position: absolute;
		inset: 0;
		pointer-events: none;
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

	.sound-chip {
		min-width: 74px;
	}

	.sound-btn {
		border: 0;
		padding: 0;
		background: transparent;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.4));
		transition:
			transform 0.06s,
			filter 0.15s,
			opacity 0.15s;
	}

	.sound-btn:hover {
		filter: brightness(1.18) drop-shadow(0 2px 0 rgba(0, 0, 0, 0.4));
	}

	.sound-btn:active {
		transform: translateY(2px);
	}

	.sound-btn.off {
		opacity: 0.55;
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
		max-height: 94dvh;
		overflow: auto;
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

	.bigbtn.dark {
		background: linear-gradient(#4a3a86, #2a1d5c);
		box-shadow:
			0 10px 0 #150e33,
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

		.sound-chip {
			min-width: 62px;
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