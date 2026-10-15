<footer class="tetris-mobile-ftr">
	<span class="tetris-mobile-blink">★</span>
	слава труду · слава игре
	<span class="tetris-mobile-blink">★</span>
</footer>

<style>
	.tetris-mobile-ftr {
		flex: none;
		text-align: center;
		padding: 4px 0 calc(7px + env(safe-area-inset-bottom));
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(232, 184, 75, 0.85);
	}

	.tetris-mobile-blink {
		animation: tetris-mobile-blink 1.3s steps(2) infinite;
	}

	@keyframes tetris-mobile-blink {
		50% {
			opacity: 0.15;
		}
	}

@media (max-height: 740px) {
	.tetris-mobile-ftr {
		display: none;
	}
}
</style>