<div class="simon-ticker" aria-hidden="true">
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
</div>

<style>
	.simon-ticker {
		flex: none;
		overflow: hidden;
		background: #120b2e;
		border: 3px solid #0b071f;
		border-radius: 12px;
		padding: 6px 0;
		box-shadow: 0 5px 0 rgba(0, 0, 0, 0.3);
	}

	.ticker-track {
		display: flex;
		width: max-content;
		animation: simon-marquee 28s linear infinite;
		font-family: 'Press Start 2P', monospace;
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

	@media (prefers-reduced-motion: reduce) {
		.ticker-track {
			animation: none;
		}
	}
</style>