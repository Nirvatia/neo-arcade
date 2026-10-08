<script lang="ts">
	import { snakeOverlayStore } from './overlayStore.js';
	import { snakeGameActions } from '../actions/gameActionsStore.js';
	import { DirectorState } from '../../core/Events.js';

	const overlay = $derived($snakeOverlayStore);
	const actions = $derived($snakeGameActions);

	const visible = $derived(
		overlay.state === DirectorState.PAUSED ||
			overlay.state === DirectorState.GAME_OVER
	);

	const scoreText = $derived(String(overlay.score).padStart(6, '0'));

	const progressText = $derived(
		overlay.infinite
			? 'Endless Mode'
			: `Biome ${overlay.biomeIndex + 1} · Level ${overlay.level}`
	);

	function primary(): void {
		actions?.confirm();
	}

	function restart(): void {
		actions?.restart();
	}
</script>

{#if visible}
	<div class="overlay" role="dialog" aria-modal="true">
		<div class="panel">
			{#if overlay.state === DirectorState.PAUSED}
				<h2 class="title">Paused</h2>
				<p class="hint">Press Space or Enter to resume</p>
				<div class="row">
					<button type="button" class="btn primary" onclick={primary}>
						Resume
					</button>
					<button type="button" class="btn ghost" onclick={restart}>
						Restart
					</button>
				</div>
			{:else if overlay.state === DirectorState.GAME_OVER}
				<h2 class="title warn">Game Over</h2>
				<p class="score">
					<span class="score-num">{scoreText}</span>
					{#if overlay.isNewRecord}
						<span class="record">New Record</span>
					{/if}
				</p>
				<p class="progress">{progressText}</p>
				<div class="row">
					<button type="button" class="btn primary" onclick={primary}>
						Restart
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(2, 4, 10, 0.6);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		pointer-events: auto;
		z-index: 20;
		font-family:
			'JetBrains Mono',
			ui-monospace,
			'Cascadia Mono',
			Consolas,
			'Courier New',
			monospace;
	}

	.panel {
		min-width: 300px;
		max-width: min(90vw, 440px);
		padding: 30px 36px 26px;
		border-radius: 18px;
		text-align: center;
		color: var(--hud-ink, #f4f8ff);
		background: rgba(5, 8, 14, 0.88);
		border: 1px solid var(--hud-edge, rgba(255, 255, 255, 0.08));
		box-shadow:
			0 24px 70px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(255, 255, 255, 0.02) inset;
		animation: panel-in 0.22s ease;
	}

	@keyframes panel-in {
		from {
			transform: translateY(10px) scale(0.97);
			opacity: 0;
		}
		to {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
	}

	.title {
		margin: 0;
		font-size: 30px;
		line-height: 1.05;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--hud-ink, #f4f8ff);
	}

	.title.warn {
		color: var(--hud-warn, #ff5c6e);
		text-shadow: 0 0 22px rgba(255, 92, 110, 0.35);
	}

	.hint {
		margin: 14px 0 0;
		font-size: 12px;
		letter-spacing: 1px;
		text-transform: uppercase;
		color: var(--hud-soft, rgba(255, 255, 255, 0.55));
	}

	.score {
		margin: 18px 0 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.score-num {
		font-size: 34px;
		font-weight: 800;
		letter-spacing: 3px;
		color: var(--hud-accent, #9fe8c0);
		text-shadow: 0 0 24px rgba(0, 0, 0, 0.4);
	}

	.record {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		padding: 4px 12px;
		border-radius: 999px;
		color: #06121a;
		background: var(--hud-accent, #9fe8c0);
		box-shadow: 0 0 18px var(--hud-accent, #9fe8c0);
	}

	.progress {
		margin: 14px 0 0;
		font-size: 13px;
		letter-spacing: 1px;
		text-transform: uppercase;
		color: var(--hud-soft, rgba(255, 255, 255, 0.55));
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		margin-top: 24px;
	}

	.btn {
		appearance: none;
		border: 1px solid var(--hud-edge, rgba(255, 255, 255, 0.1));
		border-radius: 12px;
		padding: 11px 20px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--hud-ink, #f4f8ff);
		font: inherit;
		font-size: 14px;
		font-weight: 800;
		letter-spacing: 1px;
		text-transform: uppercase;
		cursor: pointer;
		touch-action: manipulation;
		user-select: none;
		transition:
			background 0.15s ease,
			transform 0.08s ease,
			box-shadow 0.15s ease;
	}

	.btn:hover {
		background: rgba(255, 255, 255, 0.14);
	}

	.btn:active {
		transform: translateY(1px);
	}

	.btn.primary {
		background: var(--hud-accent, #9fe8c0);
		border-color: transparent;
		color: #06121a;
		box-shadow: 0 0 22px rgba(0, 0, 0, 0.25);
	}

	.btn.primary:hover {
		box-shadow: 0 0 26px var(--hud-accent, #9fe8c0);
	}

	.btn.ghost {
		background: transparent;
		color: var(--hud-soft, rgba(255, 255, 255, 0.6));
	}
</style>