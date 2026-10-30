<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import type { DebugController, DebugWatch } from '../../core/debug/DebugController';
	import type { PacmanDebugChannel } from '../../core/Events';
	import DevWindow from './DevWindow.svelte';
	import DevGroup from './DevGroup.svelte';
	import { clearDevLog, DEV_CHANNELS, devLog, devLogText, type DevLogLine } from './devLog';
	import { loadDev, saveDev } from './devStorage';

	/** The dev log: live timers on top, the event stream below, filtered by channel. */
	let { dev }: { dev: DebugController } = $props();

	const COLORS: Record<PacmanDebugChannel, string> = {
		damage: '#ff7a7a',
		debuff: '#d59bff',
		boss: '#ffb454',
		state: '#56d9ff',
		spawn: '#79ff6f',
		input: '#9aa7c2'
	};

	let all = $state<readonly DevLogLine[]>([]);
	let shown = $state<readonly DevLogLine[]>([]);
	let watches = $state<DebugWatch[]>([]);
	let enabled = $state<Record<PacmanDebugChannel, boolean>>(
		loadDev('log.channels', {
			damage: true,
			debuff: true,
			boss: true,
			state: true,
			spawn: true,
			input: false
		})
	);
	let query = $state('');
	let paused = $state(false);
	let list: HTMLDivElement | undefined = $state();
	let frame = 0;

	const unsub = devLog.subscribe((value) => (all = value));

	function poll(): void {
		watches = dev.watches();
		frame = requestAnimationFrame(poll);
	}
	frame = requestAnimationFrame(poll);

	onDestroy(() => {
		unsub();
		cancelAnimationFrame(frame);
	});

	// the visible lines: frozen while paused, filtered by channel and text
	$effect(() => {
		if (paused) {
			return;
		}
		const q = query.trim().toLowerCase();
		shown = all.filter(
			(l) =>
				enabled[l.channel] && (!q || l.text.toLowerCase().includes(q) || l.gameState.includes(q))
		);
		tick().then(() => list?.scrollTo({ top: list.scrollHeight }));
	});

	function toggle(channel: PacmanDebugChannel): void {
		enabled = { ...enabled, [channel]: !enabled[channel] };
		saveDev('log.channels', enabled);
	}

	function copy(): void {
		navigator.clipboard?.writeText(devLogText(shown)).catch(() => {});
	}

	const fmt = (w: DebugWatch) =>
		w.unit === '%'
			? `${w.value.toFixed(0)} %`
			: w.unit === 's'
				? `${w.value.toFixed(2)} s`
				: `${w.value}`;
</script>

<DevWindow id="log" title="DEV · log" x={Math.max(8, window.innerWidth - 380)} y={44} width={370}>
	<DevGroup id="watch" title="WATCH" open>
		<table>
			<tbody>
				{#each watches as w (w.group + w.label)}
					<tr class:idle={w.value <= 0}>
						<td class="g">{w.group}</td>
						<td>{w.label}</td>
						<td class="v">{fmt(w)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</DevGroup>

	<DevGroup id="stream" title="LOG" open>
		<div class="row wrap">
			{#each DEV_CHANNELS as channel (channel)}
				<button
					type="button"
					tabindex={-1}
					class="chip"
					class:off={!enabled[channel]}
					style:--c={COLORS[channel]}
					onclick={() => toggle(channel)}>{channel}</button
				>
			{/each}
		</div>
		<div class="row">
			<input type="search" placeholder="filter…" bind:value={query} />
			<button type="button" tabindex={-1} class:on={paused} onclick={() => (paused = !paused)}
				>{paused ? 'Resume' : 'Hold'}</button
			>
			<button type="button" tabindex={-1} onclick={clearDevLog}>Clear</button>
			<button type="button" tabindex={-1} onclick={copy}>Copy</button>
		</div>
		<div class="list" bind:this={list}>
			{#each shown as line (line.id)}
				<div class="line">
					<span class="t">{line.at.toFixed(2)}</span>
					<span class="c" style:color={COLORS[line.channel]}>{line.channel}</span>
					<span class="x">{line.text}</span>
					{#if line.value !== undefined}<span class="n">{line.value}</span>{/if}
				</div>
			{:else}
				<div class="empty">nothing yet</div>
			{/each}
		</div>
		<div class="foot">{shown.length} / {all.length} lines</div>
	</DevGroup>
</DevWindow>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
	}
	td {
		padding: 1px 4px 1px 0;
		white-space: nowrap;
	}
	td.g {
		color: #6b7a99;
	}
	td.v {
		text-align: right;
		color: #fff;
		font-variant-numeric: tabular-nums;
	}
	tr.idle td {
		opacity: 0.45;
	}
	.row {
		display: flex;
		gap: 4px;
		align-items: center;
	}
	.wrap {
		flex-wrap: wrap;
	}
	input {
		flex: 1;
		min-width: 0;
		border: 1px solid #3b4f7c;
		background: #0b1322;
		color: #e8efff;
		font: inherit;
		padding: 3px;
	}
	button {
		border: 1px solid #3b4f7c;
		background: #0b1322;
		color: #e8efff;
		font: inherit;
		line-height: 1;
		padding: 5px 6px;
		cursor: pointer;
	}
	button:hover,
	button.on {
		border-color: #56d9ff;
		color: #56d9ff;
	}
	.chip {
		border-color: var(--c);
		color: var(--c);
	}
	.chip.off {
		opacity: 0.35;
	}
	.list {
		height: 240px;
		overflow: auto;
		border: 1px solid #1d2a44;
		padding: 3px;
		background: rgba(0, 0, 0, 0.35);
	}
	.line {
		display: flex;
		gap: 6px;
		white-space: nowrap;
	}
	.t {
		color: #556380;
		font-variant-numeric: tabular-nums;
	}
	.c {
		width: 44px;
		flex: none;
	}
	.x {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.n {
		color: #fff;
		margin-left: auto;
	}
	.empty,
	.foot {
		color: #556380;
	}
</style>
