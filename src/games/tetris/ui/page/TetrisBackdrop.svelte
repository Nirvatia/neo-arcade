<div class="tetris-backdrop__rays" aria-hidden="true"></div>
<svg class="tetris-backdrop__star" viewBox="0 0 100 100" aria-hidden="true">
	<path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z" />
</svg>
<div class="tetris-backdrop__grain" aria-hidden="true"></div>

<style>
	.tetris-backdrop__rays {
		position: fixed;
		inset: -45vmax;
		z-index: 0;
		pointer-events: none;
		background: repeating-conic-gradient(
			from 0deg,
			rgba(0, 0, 0, 0.09) 0 5deg,
			transparent 5deg 11deg
		);
		animation: tetris-backdrop-spin 170s linear infinite;
	}

	.tetris-backdrop__star {
		position: fixed;
		right: -14vmin;
		top: 14vh;
		width: 62vmin;
		z-index: 0;
		opacity: 0.13;
		pointer-events: none;
		animation: tetris-backdrop-spin 110s linear infinite reverse;
	}

	.tetris-backdrop__star path {
		fill: none;
		stroke: var(--tetris-paper);
		stroke-width: 2.4;
	}

	.tetris-backdrop__grain {
		position: fixed;
		inset: 0;
		z-index: 70;
		pointer-events: none;
		opacity: 0.07;
		mix-blend-mode: multiply;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
	}

	@keyframes tetris-backdrop-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tetris-backdrop__rays,
		.tetris-backdrop__star {
			animation: none;
		}
	}
</style>