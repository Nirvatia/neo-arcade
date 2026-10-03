<script lang="ts">
	import { snakeHudStore } from './hudStore';

	export let part: 'top' | 'bottom' | 'all' = 'all';

	$: state = $snakeHudStore;
	$: widthStyle = state.width > 0 ? `width: ${state.width}px;` : '';
	$: scoreText = String(state.score).padStart(6, '0');
	$: levelText = String(state.level).padStart(2, '0');
	$: movesText = String(state.movesLeft).padStart(2, '0');
	$: targetKey = `${state.targetBits.length}:${state.targetBits.join('')}`;
	$: activeKey = `${state.activeBits.length}:${state.activeBits.join('')}`;
	$: matchedCount = state.activeBits.reduce(
		(acc: number, bit: 0 | 1, i: number) => {
			return acc + (state.targetBits[i] === bit ? 1 : 0);
		},
		0
	);
</script>

{#if part === 'top' || part === 'all'}
	<header class="snake-hud-top" style={widthStyle}>
		<section class="block">
			<span class="label">Score</span>
			<span class="value accent">{scoreText}</span>
		</section>
		<section class="block center">
			<span class="label">{state.finalMode ? 'Final' : 'Pattern'}</span>
			<span class="value">{levelText}</span>
		</section>
		<section class="block right">
			<span class="label">Moves</span>
			<span class="value">{movesText}</span>
		</section>
	</header>
{/if}

{#if part === 'bottom' || part === 'all'}
	<footer class="snake-hud-bottom" style={widthStyle}>
		<div class="row">
			<span class="label" class:final={state.finalMode}>
				{state.finalMode ? 'Final' : 'Target'}
			</span>
			{#key targetKey}
				<div class="bits">
					{#each state.targetBits as bit, i (i)}
						<span
							class="bit"
							class:b1={bit === 1}
							class:b0={bit === 0}
						>
							{bit}
						</span>
					{/each}
				</div>
			{/key}
		</div>
		<div class="row">
			<span class="label">Register</span>
			{#key activeKey}
				<div class="bits">
					{#each state.activeBits as bit, i (i)}
						<span
							class="bit"
							class:b1={bit === 1}
							class:b0={bit === 0}
							class:match={state.targetBits[i] === bit}
						>
							{bit}
						</span>
					{/each}
				</div>
			{/key}
			<div class="meta">
				<span class="match-count">
					{matchedCount}/{state.targetBits.length}
				</span>
				<span
					class="combo"
					class:hot={state.comboMultiplier > 1}
				>
					x{state.comboMultiplier}
				</span>
			</div>
		</div>
	</footer>
{/if}

<style>
	.snake-hud-top,
	.snake-hud-bottom {
		box-sizing: border-box;
		display: flex;
		gap: 20px;
		background: var(--hud-bg, #3a4a2c);
		border: 1px solid var(--hud-edge, #6a7a4c);
		border-radius: 12px;
		padding: 14px 20px;
		font-family:
			'JetBrains Mono',
			ui-monospace,
			'Cascadia Mono',
			Consolas,
			'Courier New',
			monospace;
		color: var(--hud-ink, #ffffff);
		pointer-events: none;
		box-shadow:
			0 10px 32px rgba(0, 0, 0, 0.65),
			inset 0 1px 0 rgba(255, 240, 200, 0.08);
	}

	.snake-hud-top {
		align-items: flex-end;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.snake-hud-bottom {
		flex-direction: column;
		gap: 12px;
		margin-top: 12px;
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.block.center {
		align-items: center;
	}

	.block.right {
		align-items: flex-end;
	}

	.label {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--hud-ink, #ffffff);
		opacity: 0.75;
		line-height: 1;
	}

	.label.final {
		color: var(--hud-accent, #c8a040);
		opacity: 1;
	}

	.value {
		font-size: 30px;
		font-weight: 800;
		letter-spacing: 1px;
		color: var(--hud-ink, #ffffff);
		line-height: 1;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	.value.accent {
		color: var(--hud-accent, #c8a040);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.row .label {
		width: 72px;
		flex-shrink: 0;
	}

	.bits {
		display: flex;
		gap: 6px;
	}

	.bit {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		font-weight: 800;
		line-height: 1;
		background: rgba(0, 0, 0, 0.35);
		border: 2px solid var(--hud-edge, #6a7a4c);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
	}

	.bit.b1 {
		color: var(--hud-bit-one, #ff4a3a);
		border-color: var(--hud-bit-one, #ff4a3a);
	}

	.bit.b0 {
		color: var(--hud-bit-zero, #a05aff);
		border-color: var(--hud-bit-zero, #a05aff);
	}

	.bit.match {
		box-shadow: 0 0 8px rgba(255, 255, 255, 0.25);
	}

	.meta {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.match-count {
		font-size: 24px;
		font-weight: 800;
		color: var(--hud-accent, #c8a040);
		line-height: 1;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	.combo {
		font-size: 14px;
		font-weight: 700;
		color: var(--hud-ink, #ffffff);
		border: 1px solid var(--hud-edge, #6a7a4c);
		border-radius: 10px;
		padding: 4px 12px;
		line-height: 1.2;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
	}

	.combo.hot {
		background: var(--hud-accent, #c8a040);
		color: #1e2816;
		border-color: var(--hud-accent, #c8a040);
	}
</style>