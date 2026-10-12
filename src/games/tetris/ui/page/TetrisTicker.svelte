<script lang="ts">
	const tickerPhrases = [
		'СЛАВА ТРУДУ',
		'ПЯТИЛЕТКУ — В ЧЕТЫРЕ ГОДА',
		'ДОГНАТЬ И ПЕРЕГНАТЬ',
		'НЕ ЗЕВАЙ — УКЛАДЫВАЙ',
		'КАЖДЫЙ РЯД — ШАГ К КОММУНИЗМУ',
		'ИСКУССТВО ПРИНАДЛЕЖИТ НАРОДУ',
		'ТЕТРИС — ГИМНАСТИКА УМА',
		'ВСЁ ДЛЯ ЧЕЛОВЕКА, ВСЁ ВО ИМЯ ЧЕЛОВЕКА'
	];
	const halves = [0, 1];
</script>

<footer class="tetris-ticker" aria-hidden="true" data-tetris-chrome>
	<div class="tetris-ticker__track">
		{#each halves as half}
			<span class="tetris-ticker__chunk">
				{#each tickerPhrases as phrase}
					<span class="tetris-ticker__phrase">{phrase}</span>
					<span class="tetris-ticker__star">★</span>
				{/each}
			</span>
		{/each}
	</div>
</footer>

<style>
	.tetris-ticker {
		position: relative;
		z-index: 5;
		background: var(--tetris-ink);
		color: var(--tetris-paper);
		overflow: hidden;
		border-top: 4px solid var(--tetris-gold);
	}

	.tetris-ticker__track {
		display: inline-flex;
		white-space: nowrap;
		padding: 11px 0;
		font-family: var(--tetris-font-display);
		font-size: 14px;
		letter-spacing: 0.14em;
		animation: tetris-ticker-scroll 32s linear infinite;
		will-change: transform;
	}

	.tetris-ticker__chunk {
		display: inline-flex;
		align-items: center;
	}

	.tetris-ticker__star {
		color: var(--tetris-gold);
		margin: 0 22px;
	}

	@keyframes tetris-ticker-scroll {
		to {
			transform: translateX(-50%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tetris-ticker__track {
			animation: none;
		}
	}
</style>