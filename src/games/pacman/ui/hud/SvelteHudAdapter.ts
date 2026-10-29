import type { Writable } from 'svelte/store';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import type { PacmanHudState } from './hudStore';

export class SvelteHudAdapter {
	private readonly unsubscribeHud: () => void;
	private readonly unsubscribeState: () => void;

	constructor(events: EventBus<PacmanEventMap>, store: Writable<PacmanHudState>) {
		if (!events) {
			console.error('SvelteHudAdapter.constructor', 'missing event bus');
			throw new Error('SvelteHudAdapter.constructor: missing event bus');
		}

		if (!store) {
			console.error('SvelteHudAdapter.constructor', 'missing hud store');
			throw new Error('SvelteHudAdapter.constructor: missing hud store');
		}

		this.unsubscribeHud = events.on('ui:hudChanged', (payload) => {
			store.update((state) => ({
				...state,
				score: payload.score,
				lives: payload.lives,
				dots: payload.dots,
				power: payload.power,
				mode: payload.mode,
				result: payload.result,
				level: payload.level,
				hell: payload.hell
			}));
		});

		this.unsubscribeState = events.on('ui:stateChanged', (payload) => {
			store.update((state) => ({
				...state,
				state: payload.state
			}));
		});
	}

	destroy(): void {
		this.unsubscribeHud();
		this.unsubscribeState();
	}
}
