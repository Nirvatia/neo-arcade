<script lang="ts">
	import { SimonPad, type SimonPadId } from '../core/SimonTypes';
	import type { SimonUiStore } from './simonUiStore.svelte';

	interface PadDef {
		readonly id: SimonPadId;
		readonly tone: 'green' | 'blue' | 'red' | 'yellow';
		readonly key: string;
		readonly icon: string;
		readonly label: string;
		readonly note: string;
	}

	const pads: readonly PadDef[] = [
		{
			id: SimonPad.Provesti,
			tone: 'green',
			key: '1',
			icon: '✔',
			label: 'Провести',
			note: 'зелёная кнопка мечты'
		},
		{
			id: SimonPad.Zapisat,
			tone: 'blue',
			key: '2',
			icon: '💾',
			label: 'Записать',
			note: 'сохранить и не думать'
		},
		{
			id: SimonPad.Udalit,
			tone: 'red',
			key: '3',
			icon: '✖',
			label: 'Пометить на удаление',
			note: 'красная — только по приказу!'
		},
		{
			id: SimonPad.Eshche,
			tone: 'yellow',
			key: '4',
			icon: '☰',
			label: 'Ещё…',
			note: 'все остальные приказы'
		}
	];

	interface Props {
		store: SimonUiStore;
		onPress: (pad: SimonPadId) => void;
	}

	let { store, onPress }: Props = $props();
</script>

<div class="pad" data-locked={store.canInput ? 'false' : 'true'}>
	{#each pads as pad (pad.id)}
		<button
			type="button"
			class="pad-btn"
			data-tone={pad.tone}
			data-active={store.activePad === pad.id}
			disabled={!store.canInput}
			aria-label={pad.label}
			onclick={() => onPress(pad.id)}
		>
			<span class="key">{pad.key}</span>
			<span class="icon">{pad.icon}</span>
			<span class="label">{pad.label}</span>
			<small>{pad.note}</small>
		</button>
	{/each}
</div>

<style>
	.pad {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		width: min(560px, 92vw);
		flex: none;
	}

	.pad[data-locked='true'] .pad-btn {
		pointer-events: none;
		cursor: not-allowed;
	}

	.pad-btn {
		position: relative;
		min-height: 104px;
		border: 2px solid;
		border-radius: 8px;
		font-family: inherit;
		font-size: 18px;
		font-weight: bold;
		color: #fff;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		transition:
			filter 0.08s,
			transform 0.08s;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.pad-btn small {
		font-size: 11px;
		font-weight: normal;
		opacity: 0.85;
		text-align: center;
	}

	.key {
		position: absolute;
		top: 6px;
		right: 8px;
		font-size: 11px;
		background: rgba(0, 0, 0, 0.25);
		padding: 1px 6px;
		border-radius: 3px;
	}

	.icon {
		font-size: 22px;
	}

	.label {
		text-align: center;
		line-height: 1.15;
	}

	.pad-btn:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.pad-btn:active:not(:disabled) {
		transform: scale(0.98);
	}

	.pad-btn[data-active='true'] {
		filter: brightness(1.45) saturate(1.2);
		transform: scale(1.02);
		box-shadow: 0 0 18px rgba(255, 255, 255, 0.35);
	}

	.pad-btn:focus-visible {
		outline: 3px solid #ffd24d;
		outline-offset: 2px;
	}

	.pad-btn:disabled {
		cursor: not-allowed;
		filter: brightness(0.72) saturate(0.65);
	}

	[data-tone='green'] {
		background: linear-gradient(#3cb263, #2f9e4f);
		border-color: #1f7a3a;
	}

	[data-tone='blue'] {
		background: linear-gradient(#3f82d6, #2f6fbf);
		border-color: #21548f;
	}

	[data-tone='red'] {
		background: linear-gradient(#d5523f, #c0392b);
		border-color: #8f2b20;
	}

	[data-tone='yellow'] {
		background: linear-gradient(#e7ae2a, #d99a06);
		border-color: #a87605;
	}

	@media (max-width: 820px) {
		.pad-btn {
			min-height: 92px;
			font-size: 16px;
		}
	}
</style>