<script lang="ts">
	import {
		debugGotoLevel,
		debugSpawnBonus,
		debugDamageBoss,
		debugToggleGodMode,
		debugCompleteLevel,
		debugKillPlayer,
		debugEnterHell,
		debugEnterSecret,
		debugToggleProfile,
		debugSetMazeScale
	} from './debugActions';

	let open = false;
	let levelInput = 1;
	let prepared = 0;
	let mazeScale = 0.8;
	let godMode = false;

	function prepareLevel(): void {
		const value = Math.floor(Number(levelInput));
		if (!Number.isFinite(value) || value < 1) {
			return;
		}
		debugGotoLevel(value);
		prepared = value;
	}

	function changeMazeScale(delta: number): void {
		const next = Math.min(1.5, Math.max(0.3, mazeScale + delta));
		mazeScale = Math.round(next * 100) / 100;
		debugSetMazeScale(mazeScale);
	}

	function run(action: () => void, event: MouseEvent): void {
		const target = event.currentTarget;
		if (target instanceof HTMLButtonElement) {
			target.blur();
		}
		action();
	}
</script>

<div class="debug">
	<button
		type="button"
		class="toggle"
		tabindex={-1}
		on:click={(event) => run(() => (open = !open), event)}
	>
		{open ? 'DEBUG ×' : 'DEBUG'}
	</button>
	{#if open}
		<div class="panel">
			<div class="row">
				<input type="number" min="1" bind:value={levelInput} />
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => run(prepareLevel, event)}
				>
					PREPARE LV
				</button>
			</div>
			{#if prepared > 0}
				<div class="note">START → LV {prepared}</div>
			{/if}
			<div class="row">
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => run(() => changeMazeScale(-0.05), event)}
				>
					MAZE -
				</button>
				<span class="note">x{mazeScale.toFixed(2)}</span>
				<button
					type="button"
					tabindex={-1}
					on:click={(event) => run(() => changeMazeScale(0.05), event)}
				>
					MAZE +
				</button>
			</div>
			<button type="button" tabindex={-1} on:click={(e) => run(debugSpawnBonus, e)}>
				SPAWN BONUS
			</button>
			<button type="button" tabindex={-1} on:click={(e) => run(debugDamageBoss, e)}>
				BOSS -250 HP
			</button>
			<button
				type="button"
				tabindex={-1}
				on:click={(e) => run(() => (godMode = debugToggleGodMode()), e)}
			>
				GOD MODE: {godMode ? 'ON' : 'OFF'}
			</button>
			<button type="button" tabindex={-1} on:click={(e) => run(debugCompleteLevel, e)}>
				COMPLETE LEVEL
			</button>
			<button type="button" tabindex={-1} on:click={(e) => run(debugKillPlayer, e)}>
				DIE
			</button>
			<button type="button" tabindex={-1} on:click={(e) => run(debugEnterHell, e)}>
				ENTER HELL
			</button>
			<button type="button" tabindex={-1} on:click={(e) => run(debugEnterSecret, e)}>
				ENTER SECRET
			</button>
			<button type="button" tabindex={-1} on:click={(e) => run(debugToggleProfile, e)}>
				TOGGLE MODE
			</button>
		</div>
	{/if}
</div>

<style>
	.debug {
		position: fixed;
		top: 8px;
		right: 8px;
		z-index: 50;
		font-family: monospace;
		font-size: 11px;
		color: #e8efff;
	}
	.toggle {
		border: 1px solid #3b4f7c;
		background: rgba(11, 19, 34, 0.9);
		color: #56d9ff;
		font-family: inherit;
		font-size: 11px;
		line-height: 1;
		padding: 6px 8px;
		cursor: pointer;
	}
	.panel {
		margin-top: 4px;
		display: grid;
		gap: 4px;
		border: 1px solid #3b4f7c;
		background: rgba(3, 5, 9, 0.92);
		padding: 8px;
		min-width: 160px;
	}
	.row {
		display: flex;
		gap: 4px;
		align-items: center;
	}
	.note {
		color: #79ff6f;
	}
	input {
		width: 56px;
		border: 1px solid #3b4f7c;
		background: #0b1322;
		color: #e8efff;
		font-family: inherit;
		font-size: 11px;
		padding: 4px;
	}
	button {
		border: 1px solid #3b4f7c;
		background: #0b1322;
		color: #e8efff;
		font-family: inherit;
		font-size: 11px;
		line-height: 1;
		padding: 6px 8px;
		cursor: pointer;
		text-align: left;
	}
	button:hover {
		border-color: #56d9ff;
		color: #56d9ff;
	}
</style>