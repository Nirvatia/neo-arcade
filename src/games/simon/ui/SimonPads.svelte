<script lang="ts">
	import { SimonPad, type SimonPadId } from '../core/SimonTypes';
	import type { SimonUiStore } from './SimonUiStore.svelte';

	interface PadDef {
		readonly id: SimonPadId;
		readonly tone: 'green' | 'blue' | 'red' | 'yellow';
		readonly key: string;
		readonly icon: string;
		readonly label: string;
		readonly aria: string;
	}

	const pads: readonly PadDef[] = [
		{
			id: SimonPad.Provesti,
			tone: 'green',
			key: '1',
			icon: '✔',
			label: 'ПРОВЕСТИ',
			aria: 'Провести документ'
		},
		{
			id: SimonPad.Zapisat,
			tone: 'blue',
			key: '2',
			icon: '💾',
			label: 'ЗАПИСАТЬ',
			aria: 'Записать базу'
		},
		{
			id: SimonPad.Udalit,
			tone: 'red',
			key: '3',
			icon: '✖',
			label: 'УДАЛИТЬ',
			aria: 'Пометить на удаление'
		},
		{
			id: SimonPad.Eshche,
			tone: 'yellow',
			key: '4',
			icon: '⚡',
			label: 'ЕЩЁ…',
			aria: 'Ещё'
		}
	];

	interface Props {
		store: SimonUiStore;
		onPress: (pad: SimonPadId) => void;
		breakMode?: boolean;
	}

	let { store, onPress, breakMode = false }: Props = $props();
</script>

<section
	class="panel"
	data-locked={store.canInput ? 'false' : 'true'}
	data-break={breakMode ? 'true' : 'false'}
	aria-label="Пульт управления"
>
	<div class="panel-lights" aria-hidden="true"></div>

	<span class="plate">▸ ПУЛЬТ УПРАВЛЕНИЯ БАЗОЙ ◂</span>

	<div class="keys">
		{#each pads as pad (pad.id)}
			<button
				type="button"
				class="key"
				data-tone={pad.tone}
				data-active={store.activePad === pad.id}
				disabled={!store.canInput}
				aria-label={pad.aria}
				onclick={() => onPress(pad.id)}
			>
				<span class="num">{pad.key}</span>
				<span class="ico">{pad.icon}</span>
				<span class="lbl">{pad.label}</span>

				{#if breakMode}
					<span class="break-tag">☕ НЕ ЖМИ</span>
				{/if}
			</button>
		{/each}
	</div>

	<span class="screw tl" aria-hidden="true"></span>
	<span class="screw tr" aria-hidden="true"></span>
	<span class="screw bl" aria-hidden="true"></span>
	<span class="screw br" aria-hidden="true"></span>
</section>

<style>
	.panel {
		--deep: #0b071f;
		--yellow: #ffd21f;
		--ink: #1a1130;
		--cyan: #39e6ff;

		--font-pixel: 'Press Start 2P', monospace;
		--font-display: 'Russo One', 'Arial Black', sans-serif;
		--font-body: 'Rubik', system-ui, sans-serif;

		position: relative;
		width: min(760px, 96vw);
		margin: 0 auto;
		background: linear-gradient(180deg, #2c1f5c, #1a1140);
		border: 5px solid var(--deep);
		border-radius: 26px;
		padding: 10px 18px 18px;
		box-shadow:
			0 14px 0 rgba(0, 0, 0, 0.4),
			0 0 50px rgba(63, 139, 255, 0.12);
		transform: perspective(1100px) rotateX(4deg);
	}

	.panel-lights {
		height: 8px;
		background-image: radial-gradient(
			circle at 5px 5px,
			rgba(255, 210, 31, 0.95) 3px,
			rgba(255, 210, 31, 0.18) 4px,
			transparent 5px
		);
		background-size: 24px 8px;
		opacity: 0.8;
		animation: simon-panel-bulbs 1s steps(2) infinite;
	}

	@keyframes simon-panel-bulbs {
		0%,
		49% {
			opacity: 0.9;
		}
		50%,
		100% {
			opacity: 0.25;
		}
	}

	.plate {
		display: block;
		width: max-content;
		margin: 8px auto 12px;
		font-family: var(--font-pixel);
		font-size: 7px;
		letter-spacing: 2px;
		color: #9d8dff;
		background: #120b2e;
		border: 2px solid var(--deep);
		border-radius: 8px;
		padding: 5px 12px;
	}

	.keys {
		display: grid;
		grid-template-columns: repeat(2, minmax(112px, 176px));
		justify-content: center;
		gap: clamp(14px, 3vw, 26px);
	}

	.key {
		position: relative;
		width: 100%;
		max-width: 150px;
		aspect-ratio: 1;
		border: 0;
		border-radius: 50%;
		display: grid;
		place-items: center;
		align-content: center;
		gap: 4px;
		font-family: var(--font-display);
		font-weight: 800;
		color: #fff;
		cursor: pointer;
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.32);
		background:
			radial-gradient(
				circle at 32% 24%,
				rgba(255, 255, 255, 0.44),
				rgba(255, 255, 255, 0) 34%
			),
			linear-gradient(180deg, var(--c1), var(--c2));
		box-shadow:
			0 14px 0 var(--ce),
			0 26px 34px rgba(0, 0, 0, 0.42),
			inset 0 8px 8px rgba(255, 255, 255, 0.28),
			inset 0 -14px 20px rgba(0, 0, 0, 0.24);
		transition:
			transform 0.07s ease,
			box-shadow 0.07s ease,
			filter 0.16s ease;
	}

	.key::before {
		content: '';
		position: absolute;
		left: 20%;
		right: 20%;
		top: 11%;
		height: 24%;
		border-radius: 999px;
		background: linear-gradient(
			rgba(255, 255, 255, 0.46),
			rgba(255, 255, 255, 0)
		);
		pointer-events: none;
	}

	.key::after {
		content: '';
		position: absolute;
		inset: 9px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.22);
		box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.12);
		pointer-events: none;
	}

	.key:hover:not(:disabled) {
		transform: translateY(-3px) scale(1.015);
		filter: brightness(1.08) saturate(1.08);
	}

	.key:active:not(:disabled),
	.key[data-active='true'] {
		transform: translateY(9px);
		box-shadow:
			0 4px 0 var(--ce),
			0 12px 16px rgba(0, 0, 0, 0.35),
			inset 0 4px 6px rgba(255, 255, 255, 0.18);
	}

	.key:disabled {
		cursor: not-allowed;
	}

	.key:focus-visible {
		outline: 4px dashed #fff;
		outline-offset: 4px;
	}

	.num {
		position: absolute;
		top: 8px;
		right: 12px;
		font-family: var(--font-pixel);
		font-size: 8px;
		line-height: 1;
		padding: 3px 6px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.25);
	}

	.ico {
		font-size: clamp(22px, 3.8vh, 34px);
		line-height: 1;
	}

	.lbl {
		font-size: clamp(13px, 1.9vw, 18px);
		letter-spacing: 0.04em;
		line-height: 1.1;
		text-align: center;
		padding: 0 8px;
	}

	.key[data-tone='green'] {
		--c1: #67f07a;
		--c2: #1c9c40;
		--ce: #0b5f24;
	}

	.key[data-tone='blue'] {
		--c1: #63a6ff;
		--c2: #2f6fe0;
		--ce: #173e93;
	}

	.key[data-tone='red'] {
		--c1: #ff6a5e;
		--c2: #e02f2f;
		--ce: #8f1414;
	}

	.key[data-tone='yellow'] {
		--c1: #ffd94d;
		--c2: #ffab1f;
		--ce: #a86a00;
		color: #4a2c00;
		text-shadow: 0 2px 0 rgba(255, 255, 255, 0.35);
	}

	.key[data-tone='yellow'] .num {
		background: rgba(255, 255, 255, 0.35);
		color: #4a2c00;
	}

	.panel[data-locked='true'] .key:not([data-active='true']) {
		filter: saturate(0.65) brightness(0.78);
	}

	.panel[data-break='true'] .key {
		filter: saturate(0.35) brightness(0.6);
	}

	.break-tag {
		position: absolute;
		left: 50%;
		bottom: 6px;
		transform: translateX(-50%) rotate(-4deg);
		font-family: var(--font-body);
		font-weight: 800;
		font-size: 10px;
		line-height: 1;
		background: var(--yellow);
		color: var(--ink);
		border: 3px solid var(--ink);
		border-radius: 8px;
		padding: 2px 6px;
		box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.4);
		pointer-events: none;
	}

	.screw {
		position: absolute;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #cfc8ff, #5a4d9e);
		box-shadow: inset 0 -2px 2px rgba(0, 0, 0, 0.6);
		pointer-events: none;
	}

	.screw.tl {
		top: 10px;
		left: 12px;
	}

	.screw.tr {
		top: 10px;
		right: 12px;
	}

	.screw.bl {
		bottom: 10px;
		left: 12px;
	}

	.screw.br {
		bottom: 10px;
		right: 12px;
	}

	@media (max-width: 760px) {
		.panel {
			transform: none;
			padding: 8px 12px 14px;
		}

		.keys {
			grid-template-columns: repeat(2, minmax(88px, 1fr));
			gap: 12px;
		}

		.key {
			max-width: 118px;
		}

		.ico {
			font-size: 20px;
		}

		.lbl {
			font-size: 11px;
		}

		.num {
			top: 6px;
			right: 8px;
		}
	}
</style>