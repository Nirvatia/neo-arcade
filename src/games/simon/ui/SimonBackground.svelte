<div class="simon-background" aria-hidden="true">
	<div class="bg-grid"></div>
	<div class="bg-glow"></div>

	<div class="doodles">
		<div class="doodle paper hide-860" style="left: 2.5%; top: 16%;">
			<h4>НАКЛАДНАЯ №42</h4>
			<div class="lines"></div>
			<div class="stamp">ОПЛАЧЕНО</div>
		</div>

		<div class="doodle paper hide-1180" style="right: 3%; bottom: 9%; --r: 8deg; animation-delay: -3s;">
			<h4>АКТ ССЫК-3</h4>
			<div class="lines"></div>
			<div class="stamp stamp-blue">СРОЧНО!</div>
		</div>

		<div class="doodle sticky sticky-yellow hide-860" style="left: 15%; top: 6%; animation-delay: -1s;">
			почини принтер!!1
		</div>

		<div class="doodle sticky sticky-pink hide-1180" style="right: 16%; top: 12%; animation-delay: -2.4s;">
			пароль: 123456
		</div>

		<div class="doodle sticky sticky-green hide-1180" style="left: 5%; bottom: 22%; animation-delay: -4s;">
			дедлайн БЫЛ вчера
		</div>

		<div class="doodle sticky sticky-yellow hide-860" style="right: 26%; bottom: 6%; --r: -8deg; animation-delay: -5s;">
			НЕ УДАЛЯТЬ!!!
		</div>

		<div class="doodle db hide-1180" style="left: 6%; bottom: 5%;">
			<div class="db-lid"></div>
			<div class="db-body">
				<b>БАЗА 1С</b>
				<small>v8.3 НЕ ТРОГАТЬ</small>
			</div>
			<span class="crack">⚡</span>
		</div>

		<div class="doodle coffee hide-1180" style="right: 5%; top: 30%;">
			<svg width="102" height="90" viewBox="0 0 102 90">
				<g class="steam">
					<path d="M39 24 q5 -7 0 -14" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7" />
					<path d="M56 24 q-5 -7 0 -14" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7" />
				</g>

				<path d="M76 42 q18 6 0 22" fill="none" stroke="#1b1235" stroke-width="7" />
				<rect x="16" y="33" width="60" height="44" rx="10" fill="#fff" stroke="#1b1235" stroke-width="6" />
				<path d="M22 43 h48" stroke="#8b5a2b" stroke-width="7" stroke-linecap="round" />
				<text x="46" y="68" text-anchor="middle" font-size="14" fill="#e8352b" font-family="Russo One, sans-serif">1С</text>
			</svg>
			<small>кофе = жизнь</small>
		</div>

		<div class="doodle errwin hide-1180" style="left: 14%; bottom: 34%; animation-delay: -2s;">
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

		<div class="doodle errwin hide-860" style="right: 9%; top: 56%; --r: -5deg; animation-delay: -4s;">
			<div class="bar">
				БАЗА ЗАВИСЛА
				<i>✖</i>
			</div>
			<div class="txt">Подождите… или нет.</div>
			<div class="btns">
				<span>Подождать</span>
				<span>Подождать</span>
			</div>
		</div>

		<div class="doodle neon hide-860" style="left: 38%; top: 3%;">
			ООО «РОМАШКА»
		</div>

		<div class="doodle duck hide-1180" style="right: 32%; bottom: 20%;">
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

		<span class="doodle codebit hide-1180" style="right: 20%; top: 24%; animation-delay: -6s;">
			Запрос.Выполнить();
		</span>

		<span class="doodle codebit hide-860" style="left: 8%; top: 44%; animation-delay: -3s;">
			&amp;НаКлиентеНаСервере
		</span>

		<span class="doodle codebit hide-1180" style="right: 38%; top: 8%; animation-delay: -9s;">
			// TODO: починить потом
		</span>
	</div>
</div>

<style>
	.simon-background {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.bg-grid,
	.bg-glow,
	.doodles {
		position: absolute;
		inset: 0;
	}

	.bg-grid {
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
		background-size: 46px 46px;
		opacity: 0.8;
	}

	.bg-glow {
		background:
			radial-gradient(1000px 620px at 76% -8%, rgba(255, 140, 60, 0.16), transparent 60%),
			radial-gradient(880px 620px at 6% 104%, rgba(57, 230, 255, 0.12), transparent 62%),
			radial-gradient(900px 700px at 94% 92%, rgba(255, 95, 162, 0.13), transparent 55%);
	}

	.doodles {
		z-index: 1;
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
		font-family: 'Press Start 2P', monospace;
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
		font-family: 'Caveat', cursive;
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
		background: linear-gradient(
			90deg,
			#5b46c9,
			#8f7bff 42%,
			#5b46c9
		);
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
		font-family: 'Russo One', 'Arial Black', sans-serif;
		font-size: 15px;
		text-shadow: 2px 2px 0 #1b1235;
	}

	.db-body small {
		font-family: 'Press Start 2P', monospace;
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
		font-family: 'Caveat', cursive;
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
		font-size: 11px;
		letter-spacing: 0.18em;
		color: #ff5fa2;
		border: 3px solid #ff5fa2;
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
		font-family: 'Press Start 2P', monospace;
		font-size: 6px;
		letter-spacing: 0.16em;
		color: #ffe9a0;
		margin-top: 4px;
	}

	.codebit {
		font-family: 'Press Start 2P', monospace;
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

	.hide-1180,
	.hide-860 {
		display: block;
	}

	@media (max-width: 1180px) {
		.hide-1180 {
			display: none;
		}
	}

	@media (max-width: 860px) {
		.hide-860 {
			display: none;
		}
	}
</style>