<script lang="ts">
	import { tetrisOverlay } from './overlayStore.svelte';
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
	<div class="tetris-overlay tetris-overlay--start">
		<svg class="tetris-overlay__star" viewBox="0 0 100 100" aria-hidden="true">
			<path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z" />
		</svg>
		<div class="tetris-overlay__poster">
			<span class="tetris-stamp tetris-stamp--gold tetris-overlay__poster-stamp">
				Одобрено худсоветом
			</span>
			<p class="tetris-overlay__kicker">Главстройпром представляет</p>
			<h1 class="tetris-overlay__title">
				<span class="tetris-overlay__title-main">ТЕТРИС</span>
				<span class="tetris-overlay__title-sub">«ПЯТИЛЕТКА»</span>
			</h1>
			<p class="tetris-overlay__subtitle">
				Строим коммунизм — ряд за рядом. Без перекуров и брака.
			</p>
			<button type="button" class="tetris-btn tetris-btn--accent tetris-btn--large" onclick={handleStart}>
				Взяться за работу ▸
			</button>
			<div class="tetris-overlay__note">
				<h4 class="tetris-overlay__note-title">ПАМЯТКА СТРОИТЕЛЯ</h4>
				<div class="tetris-overlay__keys">
					<b>← →</b><span>движение по участку</span>
					<b>↓</b><span>мягкий сброс (+1 очко за клетку)</span>
					<b>ПРОБЕЛ</b><span>жёсткий сброс (+2 очка за клетку)</span>
					<b>↑ / X</b><span>поворот вправо</span>
					<b>Z</b><span>поворот влево</span>
					<b>C</b><span>отложить фигуру на склад</span>
					<b>P · ESC</b><span>перерыв</span>
					<b>R</b><span>новая смена</span>
				</div>
			</div>
			<p class="tetris-overlay__fineprint">
				Труд освобождает от скуки · каждая пятилетка быстрее предыдущей
			</p>
		</div>
	</div>
{:else if phase === GamePhase.PAUSED}
	<div class="tetris-overlay">
		<div class="tetris-overlay__card">
			<h2 class="tetris-overlay__card-title">Перерыв</h2>
			<p class="tetris-overlay__card-text">
				Профсоюз велел отдохнуть. Чай, баранки, тишина. Кирпичи подождут.
			</p>
			<div class="tetris-overlay__keys tetris-overlay__keys--spaced">
				<b>← →</b><span>движение</span>
				<b>ПРОБЕЛ</b><span>жёсткий сброс</span>
				<b>↑ / Z</b><span>повороты</span>
				<b>C</b><span>склад</span>
			</div>
			<div class="tetris-overlay__actions">
				<button type="button" class="tetris-btn tetris-btn--accent" onclick={handleTogglePause}>
					Продолжить [P]
				</button>
				<button type="button" class="tetris-btn" onclick={handleStart}>Новая смена [R]</button>
			</div>
		</div>
	</div>
{:else if phase === GamePhase.GAMEOVER}
	<div class="tetris-overlay">
		<div class="tetris-overlay__card">
			{#if isRecord}
				<span class="tetris-stamp tetris-overlay__card-stamp">Рекорд бригады!</span>
			{/if}
			<p class="tetris-overlay__kicker tetris-overlay__kicker--dark">Сводка по смене</p>
			<h2 class="tetris-overlay__card-title">{gameOverTitle}</h2>
			<p class="tetris-overlay__card-text">{gameOverSub}</p>
			<div class="tetris-overlay__stats">
				<div class="tetris-overlay__stat">
					<span class="tetris-overlay__stat-label">Очки труда</span>
					<span class="tetris-overlay__stat-value">{score}</span>
				</div>
				<div class="tetris-overlay__stat">
					<span class="tetris-overlay__stat-label">Рядов</span>
					<span class="tetris-overlay__stat-value">{tetrisOverlay.lines}</span>
				</div>
				<div class="tetris-overlay__stat">
					<span class="tetris-overlay__stat-label">Пятилетка</span>
					<span class="tetris-overlay__stat-value">{tetrisOverlay.level}</span>
				</div>
			</div>
			<div class="tetris-overlay__actions">
				<button type="button" class="tetris-btn tetris-btn--accent" onclick={handleStart}>
					Новая смена [Enter]
				</button>
				<a href="/" class="tetris-btn">В начало</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.tetris-overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		padding: 26px;
		padding-bottom: calc(26px + env(safe-area-inset-bottom));
		background: rgba(22, 11, 8, 0.84);
		overflow: auto;
	}

	.tetris-overlay__card,
	.tetris-overlay__poster {
		margin: auto;
	}

	.tetris-overlay__card {
		position: relative;
		background: var(--tetris-paper);
		border: 4px solid var(--tetris-ink);
		box-shadow: 14px 14px 0 rgba(0, 0, 0, 0.5);
		padding: 36px 42px;
		max-width: 580px;
		width: 100%;
		transform: rotate(-0.6deg);
	}

	.tetris-overlay__card-title {
		font-family: var(--tetris-font-display);
		font-size: clamp(34px, 6vw, 52px);
		color: var(--tetris-red);
		text-transform: uppercase;
		line-height: 1;
		text-shadow: 3px 3px 0 rgba(23, 18, 16, 0.14);
	}

	.tetris-overlay__card-text {
		margin: 10px 0 22px;
		font-size: 15px;
		opacity: 0.8;
		font-weight: 500;
	}

	.tetris-overlay__card-stamp {
		position: absolute;
		top: -20px;
		right: -16px;
		font-size: 15px;
		background: var(--tetris-paper);
	}

	.tetris-overlay__stats {
		display: flex;
		border: 3px solid var(--tetris-ink);
		margin: 4px 0 26px;
	}

	.tetris-overlay__stat {
		flex: 1;
		padding: 12px 8px;
		text-align: center;
		border-right: 3px solid var(--tetris-ink);
	}

	.tetris-overlay__stat:last-child {
		border-right: 0;
	}

	.tetris-overlay__stat-label {
		display: block;
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		opacity: 0.7;
		margin-bottom: 4px;
	}

	.tetris-overlay__stat-value {
		font-family: var(--tetris-font-display);
		font-size: 26px;
	}

	.tetris-overlay__actions {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
	}

	.tetris-overlay__keys {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 7px 18px;
		font-size: 14px;
		font-weight: 500;
	}

	.tetris-overlay__keys--spaced {
		margin-bottom: 26px;
	}

	.tetris-overlay__keys b {
		font-family: var(--tetris-font-display);
		font-size: 11px;
		background: var(--tetris-ink);
		color: var(--tetris-paper);
		padding: 3px 9px;
		white-space: nowrap;
		align-self: center;
	}

	.tetris-overlay__kicker {
		font-family: var(--tetris-font-display);
		font-size: 13px;
		letter-spacing: 0.4em;
		text-transform: uppercase;
		color: var(--tetris-paper);
		opacity: 0.9;
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 20px;
	}

	.tetris-overlay__kicker::before {
		content: '';
		width: 54px;
		height: 3px;
		background: var(--tetris-gold);
	}

	.tetris-overlay__kicker--dark {
		color: var(--tetris-ink);
		opacity: 0.6;
		margin-bottom: 8px;
	}

	.tetris-overlay--start {
		background:
			radial-gradient(900px 480px at 80% 8%, rgba(227, 167, 47, 0.28), transparent 62%),
			linear-gradient(108deg, var(--tetris-red) 0 57%, var(--tetris-red-deep) 57% 100%);
	}

	.tetris-overlay--start::before {
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

	.tetris-overlay__star {
		position: fixed;
		right: 3%;
		top: 7%;
		width: min(300px, 27vw);
		fill: var(--tetris-gold);
		stroke: var(--tetris-ink);
		stroke-width: 2.5;
		filter: drop-shadow(9px 9px 0 rgba(0, 0, 0, 0.35));
		pointer-events: none;
		animation: tetris-overlay-spin 46s linear infinite;
	}

	.tetris-overlay__poster {
		position: relative;
		max-width: 940px;
		padding: 7vh 30px 50px;
	}

	.tetris-overlay__poster-stamp {
		position: absolute;
		top: 2vh;
		right: 30px;
		font-size: 16px;
	}

	.tetris-overlay__title-main {
		display: block;
		font-family: var(--tetris-font-display);
		font-size: clamp(68px, 12.5vw, 164px);
		line-height: 0.9;
		color: var(--tetris-paper);
		letter-spacing: 0.02em;
		text-shadow:
			7px 7px 0 var(--tetris-ink),
			15px 15px 0 rgba(0, 0, 0, 0.25);
	}

	.tetris-overlay__title-sub {
		display: inline-block;
		font-family: var(--tetris-font-display);
		font-size: clamp(22px, 3.8vw, 42px);
		background: var(--tetris-gold);
		color: var(--tetris-ink);
		padding: 4px 20px;
		border: 3px solid var(--tetris-ink);
		box-shadow: 6px 6px 0 var(--tetris-ink);
		transform: rotate(-2.5deg);
		margin-top: 18px;
	}

	.tetris-overlay__subtitle {
		color: var(--tetris-paper);
		font-size: clamp(14px, 1.9vw, 19px);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 500;
		margin: 22px 0 30px;
	}

	.tetris-overlay__note {
		margin-top: 34px;
		background: var(--tetris-paper);
		border: 3px solid var(--tetris-ink);
		box-shadow: 10px 10px 0 rgba(0, 0, 0, 0.35);
		padding: 20px 24px;
		max-width: 580px;
		transform: rotate(-1deg);
	}

	.tetris-overlay__note-title {
		font-family: var(--tetris-font-display);
		color: var(--tetris-red);
		letter-spacing: 0.22em;
		font-size: 14px;
		margin-bottom: 12px;
	}

	.tetris-overlay__fineprint {
		margin-top: 30px;
		color: rgba(237, 227, 203, 0.55);
		font-size: 11px;
		letter-spacing: 0.28em;
		text-transform: uppercase;
	}

	@keyframes tetris-overlay-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 1000px) {
		.tetris-overlay__star {
			opacity: 0.35;
		}
	}

	@media (max-width: 900px) {
		.tetris-overlay {
			padding: 18px 14px;
			padding-bottom: calc(18px + env(safe-area-inset-bottom));
		}
		.tetris-overlay__card {
			padding: 24px 20px;
		}
		.tetris-overlay__poster {
			padding: 24px 16px 36px;
		}
		.tetris-overlay__note {
			padding: 14px 16px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tetris-overlay__star {
			animation: none;
		}
	}
</style>