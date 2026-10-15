import type { SimonGame } from '../core/GameMain';
import { SimonEvent } from '../core/Events';
import type { SimonUiStore } from './simonUiStore.svelte';

export class SvelteSimonAdapter {
	private readonly game: SimonGame;
	private readonly store: SimonUiStore;
	private readonly disposers: Array<() => void> = [];

	constructor(game: SimonGame, store: SimonUiStore) {
		this.game = game;
		this.store = store;
	}

	connect(): void {
		this.disposers.push(
			this.game.on(SimonEvent.UiSync, (snapshot) => {
				this.store.apply(snapshot);
			})
		);

		this.disposers.push(
			this.game.on(SimonEvent.ConsoleMessageReceived, (payload) => {
				this.store.addLine(payload.text, payload.kind);
			})
		);

		this.store.apply(this.game.uiSnapshot);
		this.store.bootIfNeeded();
	}

	disconnect(): void {
		for (const dispose of this.disposers) {
			dispose();
		}

		this.disposers.length = 0;
		this.store.reset();
	}
}