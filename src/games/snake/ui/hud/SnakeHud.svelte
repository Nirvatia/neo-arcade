<script lang="ts">
	import { snakeHudStore } from './hudStore';

	let { part = 'all' }: { part?: 'top' | 'bottom' | 'all' } = $props();

	const state = $derived($snakeHudStore);

	const widthStyle = $derived(state.width > 0 ? `width: ${state.width}px;` : '');
	const scoreText = $derived(String(state.score).padStart(6, '0'));
	const movesText = $derived(String(state.movesLeft).padStart(2, '0'));
	const movesLow = $derived(state.movesLeft > 0 && state.movesLeft <= 3);

	const zoneLabel = $derived(state.infinite ? 'Mode' : 'Zone');
	const zoneText = $derived(
		state.infinite
			? 'ENDLESS'
			: `B${state.biomeIndex + 1} · LV ${state.biomeLevel}`
	);

	const matchedCount = $derived(
		state.activeBits.reduce(
			(acc: number, bit: 0 | 1, i: number) =>
				acc + (state.targetBits[i] === bit ? 1 : 0),
			0
		)
	);

	const comboHot = $derived(state.comboMultiplier > 1);

	const targetKey = $derived(
		`${state.targetBits.length}:${state.targetBits.join('')}`
	);
	const activeKey = $derived(
		`${state.activeBits.length}:${state.activeBits.join('')}`
	);
</script>

{#if part === 'top' || part === 'all'}
	<header class="hud hud-top" style={widthStyle}>
		<section class="cell left">
			<span class="label">Score</span>
			<span class="value score">{scoreText}</span>
		</section>

		<section class="cell center">
			<span class="label">{zoneLabel}</span>
			<span class="value zone" class:endless={state.infinite}>{zoneText}</span>
		</section>

		<section class="cell right">
			<span class="label">Moves</span>
			<span class="value moves" class:low={movesLow}>{movesText}</span>
		</section>
	</header>
{/if}

{#if part === 'bottom' || part === 'all'}
	<footer class="hud hud-bottom" style={widthStyle}>
		<div class="row">
			<span class="row-label">Target</span>

			{#key targetKey}
				<div class="bits">
					{#each state.targetBits as bit, i (i)}
						<span class="bit" class:one={bit === 1} class:zero={bit === 0}>
							{bit}
						</span>
					{/each}
				</div>
			{/key}
		</div>

		<div class="row">
			<span class="row-label">Register</span>

			{#key activeKey}
				<div class="bits">
					{#each state.activeBits as bit, i (i)}
						<span
							class="bit"
							class:one={bit === 1}
							class:zero={bit === 0}
							class:match={state.targetBits[i] === bit}
						>
							{bit}
						</span>
					{/each}
				</div>
			{/key}

			<div class="row-meta">
				<span class="matched">{matchedCount}/{state.targetBits.length}</span>

				<span class="combo" class:hot={comboHot} class:blaze={state.comboMultiplier >= 4}>
					x{state.comboMultiplier}
				</span>
			</div>
		</div>
	</footer>
{/if}

<style>
	.hud {
		box-sizing: border-box;
		font-family:
			'JetBrains Mono',
			ui-monospace,
			'Cascadia Mono',
			Consolas,
			'Courier New',
			monospace;
		color: var(--hud-ink, #f4f8ff);
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;

		/* Панель без волосковой рамки: фон + мягкая тень. */
		background: rgba(6, 9, 15, 0.62);
		border-radius: 14px;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
	}

	/* ===================== TOP ===================== */
	.hud-top {
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
		padding: 12px 18px;
	}

	.cell {
		display: flex;
		flex-direction: column;
		gap: 5px;
		min-width: 84px;
	}

	.cell.left {
		align-items: flex-start;
	}

	.cell.center {
		align-items: center;
		text-align: center;
	}

	.cell.right {
		align-items: flex-end;
		text-align: right;
	}

	.label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--hud-soft, rgba(255, 255, 255, 0.55));
		line-height: 1;
	}

	.value {
		font-size: 28px;
		font-weight: 800;
		letter-spacing: 1px;
		line-height: 1;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
	}

	.value.score {
		color: var(--hud-accent, #9fe8c0);
	}

	.value.zone {
		color: var(--hud-ink, #f4f8ff);
	}

	.value.zone.endless {
		color: var(--hud-accent, #9fe8c0);
	}

	.value.moves {
		color: var(--hud-ink, #f4f8ff);
		transition: color 0.2s ease;
	}

	.value.moves.low {
		color: var(--hud-warn, #ff5c6e);
		animation: pulse 0.7s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.45;
		}
	}

	/* ===================== BOTTOM ===================== */
	.hud-bottom {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 12px;
		padding: 14px 18px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.row-label {
		width: 74px;
		flex-shrink: 0;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--hud-soft, rgba(255, 255, 255, 0.55));
	}

	.bits {
		display: flex;
		gap: 6px;
	}

	/*
	 * Биты — максимально простой вид.
	 * Только два цвета: 1 = красный, 0 = зелёный.
	 * Без рамки, без свечения, без анимации.
	 */
	.bit {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		font-size: 20px;
		font-weight: 800;
		line-height: 1;
		background: rgba(0, 0, 0, 0.2);
	}

	.bit.one {
		color: var(--hud-bit-one, #ff5a4d);
		background: rgba(255, 90, 77, 0.1);
	}

	.bit.zero {
		color: var(--hud-bit-zero, #4fe07a);
		background: rgba(78, 224, 122, 0.1);
	}

	/* Совпадение — только лёгкое изменение фона. */
	.bit.match {
		background: rgba(255, 255, 255, 0.08);
	}

	.row-meta {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.matched {
		font-size: 20px;
		font-weight: 800;
		color: var(--hud-accent, #9fe8c0);
		line-height: 1;
	}

	/* Комбо-чип без рамки и свечения. */
	.combo {
		font-size: 13px;
		font-weight: 800;
		letter-spacing: 1px;
		padding: 5px 12px;
		border-radius: 10px;
		color: var(--hud-soft, rgba(255, 255, 255, 0.55));
		background: rgba(255, 255, 255, 0.05);
		line-height: 1.2;
	}

	.combo.hot {
		color: var(--hud-accent, #9fe8c0);
		background: rgba(159, 232, 192, 0.12);
	}

	.combo.blaze {
		background: var(--hud-accent, #9fe8c0);
		color: #06121a;
	}
</style>