<script lang="ts">
	import { tetrisOverlay } from '../overlay/overlayStore.svelte';
	import { getTetrisActions } from '../actions/actionsStore.svelte';
	import { GamePhase } from '../../core/types';

	const phase = $derived(tetrisOverlay.phase);
	const score = $derived(String(tetrisOverlay.score).padStart(6, '0'));
	const actions = $derived(getTetrisActions());

	function handleStart(): void {
		if (actions) {
			actions.start();
		}
	}

	function handleTogglePause(): void {
		if (actions) {
			actions.togglePause();
		}
	}

	const isRecord = $derived(tetrisOverlay.score > 0);
	const gameOverTitle = $derived(
		tetrisOverlay.lines >= 40 ? 'План перевыполнен!' : 'Смена окончена'
	);
	const gameOverSub = $derived(
		tetrisOverlay.lines >= 40
			? 'Таких бригадиров поискать. Доска почёта обновлена.'
			: 'Шахта затихла. Завтра — снова в забой.'
	);
</script>

{#if phase === GamePhase.IDLE}
	<div class="tetris-mobile-overlay tetris-mobile-overlay--start">
		<svg class="tetris-mobile-overlay__star" viewBox="0 0 100 100" aria-hidden="true">
			<path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z" />
		</svg>
		<div class="tetris-mobile-overlay__poster">
			<span class="tetris-stamp tetris-stamp--gold tetris-mobile-overlay__poster-stamp">
				Одобрено худсоветом
			</span>
			<p class="tetris-mobile-overlay__kicker">Главстройпром представляет</p>
			<h1 class="tetris-mobile-overlay__title">
				<span class="tetris-mobile-overlay__title-main">ТЕТРИС</span>
				<span class="tetris-mobile-overlay__title-sub">«ПЯТИЛЕТКА»</span>
			</h1>
			<p class="tetris-mobile-overlay__subtitle">
				Строим коммунизм — ряд за рядом. Без перекуров и брака.
			</p>
			<button
				type="button"
				class="tetris-btn tetris-btn--accent tetris-btn--large"
				onclick={handleStart}
			>
				Взяться за работу ▸
			</button>
			<p class="tetris-mobile-overlay__fineprint">
				Труд освобождает от скуки · каждая пятилетка быстрее предыдущей
			</p>
		</div>
	</div>
{:else if phase === GamePhase.PAUSED}
	<div class="tetris-mobile-overlay">
		<div class="tetris-mobile-overlay__card">
			<h2 class="tetris-mobile-overlay__card-title">Перерыв</h2>
			<p class="tetris-mobile-overlay__card-text">
				Профсоюз велел отдохнуть. Чай, баранки, тишина.
			</p>
			<div class="tetris-mobile-overlay__actions">
				<button
					type="button"
					class="tetris-btn tetris-btn--accent"
					onclick={handleTogglePause}
				>
					Продолжить
				</button>
				<button type="button" class="tetris-btn" onclick={handleStart}>
					Новая смена
				</button>
			</div>
		</div>
	</div>
{:else if phase === GamePhase.GAMEOVER}
	<div class="tetris-mobile-overlay">
		<div class="tetris-mobile-overlay__card">
			{#if isRecord}
				<span class="tetris-stamp tetris-mobile-overlay__card-stamp">Рекорд бригады!</span>
			{/if}
			<p class="tetris-mobile-overlay__kicker tetris-mobile-overlay__kicker--dark">
				Сводка по смене
			</p>
			<h2 class="tetris-mobile-overlay__card-title">{gameOverTitle}</h2>
			<p class="tetris-mobile-overlay__card-text">{gameOverSub}</p>
			<div class="tetris-mobile-overlay__stats">
				<div class="tetris-mobile-overlay__stat">
					<span class="tetris-mobile-overlay__stat-label">Очки</span>
					<span class="tetris-mobile-overlay__stat-value">{score}</span>
				</div>
				<div class="tetris-mobile-overlay__stat">
					<span class="tetris-mobile-overlay__stat-label">Рядов</span>
					<span class="tetris-mobile-overlay__stat-value">{tetrisOverlay.lines}</span>
				</div>
				<div class="tetris-mobile-overlay__stat">
					<span class="tetris-mobile-overlay__stat-label">Пятилетка</span>
					<span class="tetris-mobile-overlay__stat-value">{tetrisOverlay.level}</span>
				</div>
			</div>
			<div class="tetris-mobile-overlay__actions">
				<button
					type="button"
					class="tetris-btn tetris-btn--accent"
					onclick={handleStart}
				>
					Новая смена
				</button>
				<a href="/" class="tetris-btn">В начало</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.tetris-mobile-overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		padding: 26px;
		padding-bottom: calc(26px + env(safe-area-inset-bottom));
		background: rgba(22, 11, 8, 0.84);
		overflow: auto;
	}

	.tetris-mobile-overlay__card,
	.tetris-mobile-overlay__poster {
		margin: auto;
	}

	.tetris-mobile-overlay__card {
		position: relative;
		background: var(--tetris-paper);
		border: 4px solid var(--tetris-ink);
		box-shadow: 14px 14px 0 rgba(0, 0, 0, 0.5);
		padding: 36px 42px;
		max-width: 580px;
		width: 100%;
		transform: rotate(-0.6deg);
	}

	.tetris-mobile-overlay__card-title {
		font-family: var(--tetris-font-display);
		font-size: clamp(28px, 5vw, 42px);
		color: var(--tetris-red);
		text-transform: uppercase;
		line-height: 1;
		text-shadow: 3px 3px 0 rgba(23, 18, 16, 0.14);
	}

	.tetris-mobile-overlay__card-text {
		margin: 10px 0 22px;
		font-size: 14px;
		opacity: 0.8;
		font-weight: 500;
	}

	.tetris-mobile-overlay__card-stamp {
		position: absolute;
		top: -20px;
		right: -16px;
		font-size: 14px;
		background: var(--tetris-paper);
	}

	.tetris-mobile-overlay__stats {
		display: flex;
		border: 3px solid var(--tetris-ink);
		margin: 4px 0 26px;
	}

	.tetris-mobile-overlay__stat {
		flex: 1;
		padding: 12px 8px;
		text-align: center;
		border-right: 3px solid var(--tetris-ink);
	}

	.tetris-mobile-overlay__stat:last-child {
		border-right: 0;
	}

	.tetris-mobile-overlay__stat-label {
		display: block;
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		opacity: 0.7;
		margin-bottom: 4px;
	}

	.tetris-mobile-overlay__stat-value {
		font-family: var(--tetris-font-display);
		font-size: 22px;
	}

	.tetris-mobile-overlay__actions {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
	}

	.tetris-mobile-overlay__kicker {
		font-family: var(--tetris-font-display);
		font-size: 12px;
		letter-spacing: 0.4em;
		text-transform: uppercase;
		color: var(--tetris-paper);
		opacity: 0.9;
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 20px;
	}

	.tetris-mobile-overlay__kicker::before {
		content: '';
		width: 40px;
		height: 3px;
		background: var(--tetris-gold);
	}

	.tetris-mobile-overlay__kicker--dark {
		color: var(--tetris-ink);
		opacity: 0.6;
		margin-bottom: 8px;
	}

	.tetris-mobile-overlay--start {
		background:
			radial-gradient(900px 480px at 80% 8%, rgba(227, 167, 47, 0.28), transparent 62%),
			linear-gradient(108deg, var(--tetris-red) 0 57%, var(--tetris-red-deep) 57% 100%);
	}

	.tetris-mobile-overlay--start::before {
		content: '';
		position: fixed;
		left: -10%;
		bottom: -6%;
		width: 120%;
		height: 16%;
		background: rgba(237, 227, 203, 0.14);
		transform: rotate(-4deg);
		pointer-events: none;
	}

	.tetris-mobile-overlay__star {
		position: fixed;
		right: 3%;
		top: 7%;
		width: min(200px, 20vw);
		fill: var(--tetris-gold);
		stroke: var(--tetris-ink);
		stroke-width: 2.5;
		filter: drop-shadow(9px 9px 0 rgba(0, 0, 0, 0.35));
		pointer-events: none;
		animation: tetris-mobile-overlay-spin 46s linear infinite;
	}

	.tetris-mobile-overlay__poster {
		position: relative;
		max-width: 700px;
		padding: 6vh 30px 40px;
		text-align: center;
	}

	.tetris-mobile-overlay__poster-stamp {
		position: absolute;
		top: 2vh;
		right: 30px;
		font-size: 14px;
	}

	.tetris-mobile-overlay__title-main {
		display: block;
		font-family: var(--tetris-font-display);
		font-size: clamp(48px, 10vw, 120px);
		line-height: 0.9;
		color: var(--tetris-paper);
		letter-spacing: 0.02em;
		text-shadow:
			7px 7px 0 var(--tetris-ink),
			15px 15px 0 rgba(0, 0, 0, 0.25);
	}

	.tetris-mobile-overlay__title-sub {
		display: inline-block;
		font-family: var(--tetris-font-display);
		font-size: clamp(18px, 3vw, 32px);
		background: var(--tetris-gold);
		color: var(--tetris-ink);
		padding: 4px 16px;
		border: 3px solid var(--tetris-ink);
		box-shadow: 6px 6px 0 var(--tetris-ink);
		transform: rotate(-2.5deg);
		margin-top: 18px;
	}

	.tetris-mobile-overlay__subtitle {
		color: var(--tetris-paper);
		font-size: clamp(13px, 1.7vw, 17px);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 500;
		margin: 22px 0 30px;
	}

	.tetris-mobile-overlay__fineprint {
		margin-top: 30px;
		color: rgba(237, 227, 203, 0.55);
		font-size: 10px;
		letter-spacing: 0.28em;
		text-transform: uppercase;
	}

	@keyframes tetris-mobile-overlay-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.tetris-mobile-overlay__star {
			width: min(120px, 15vw);
		}
		.tetris-mobile-overlay__poster {
			padding: 4vh 20px 30px;
		}
		.tetris-mobile-overlay__card {
			padding: 24px 20px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tetris-mobile-overlay__star {
			animation: none;
		}
	}
</style>