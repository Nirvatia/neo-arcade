<header class="tetris-topbar" data-tetris-chrome>
	<div class="tetris-topbar__logo">
		<svg class="tetris-topbar__logo-icon" viewBox="0 0 100 100" aria-hidden="true">
			<path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z" />
		</svg>
		<span class="tetris-topbar__logo-text">ТЕТРИС <em>«ПЯТИЛЕТКА»</em></span>
	</div>
	<div class="tetris-topbar__actions">
		<a href="/" class="tetris-chip">◄ В АРКАДУ</a>
	</div>
</header>

<style>
	.tetris-topbar {
		position: relative;
		z-index: 5;
		background: var(--tetris-ink);
		color: var(--tetris-paper);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 10px 20px;
		border-bottom: 4px solid var(--tetris-gold);
	}

	.tetris-topbar__logo {
		display: flex;
		align-items: center;
		gap: 12px;
		font-family: var(--tetris-font-display);
		font-size: 17px;
		letter-spacing: 0.08em;
	}

	.tetris-topbar__logo-icon {
		width: 26px;
		height: 26px;
		fill: var(--tetris-red);
		stroke: var(--tetris-paper);
		stroke-width: 3;
	}

	.tetris-topbar__logo-text em {
		font-style: normal;
		color: var(--tetris-gold);
	}

	.tetris-topbar__actions {
		display: flex;
		gap: 10px;
	}

	@media (max-width: 640px) {
		.tetris-topbar {
			padding: 8px 12px;
		}
		.tetris-topbar__logo {
			font-size: 14px;
		}
	}
</style>