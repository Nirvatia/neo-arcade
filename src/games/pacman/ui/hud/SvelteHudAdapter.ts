import type { Writable } from 'svelte/store';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import type { PacmanHudState } from './hudStore';

export class SvelteHudAdapter {
	private readonly unsubscribe: () => void;

	constructor(events: EventBus<PacmanEventMap>, store: Writable<PacmanHudState>) {
		if (!events) {
			console.error('SvelteHudAdapter.constructor', 'missing event bus');
			throw new Error('SvelteHudAdapter.constructor: missing event bus');
		}

		if (!store) {
			console.error('SvelteHudAdapter.constructor', 'missing hud store');
			throw new Error('SvelteHudAdapter.constructor: missing hud store');
		}

		this.unsubscribe = events.on('ui:hudChanged', (payload) => {
			store.set({
				score: payload.score,
				lives: payload.lives,
				dots: payload.dots,
				power: payload.power,
				result: payload.result
			});
		});
	}

	destroy(): void {
		this.unsubscribe();
	}
}