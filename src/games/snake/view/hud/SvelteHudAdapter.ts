import { snakeHudStore } from '../../ui/hudStore.js';
import { createDefaultSnakeHudState } from '../../ui/SnakeHudState.js';
import type { HudAdapter, HudUpdate } from './HudAdapter.js';

export class SvelteHudAdapter implements HudAdapter {
	private width = 0;
	private lastKey = '';

	public update(state: HudUpdate): void {
		const key = this.createKey(state);

		if (key === this.lastKey) {
			return;
		}

		this.lastKey = key;

		snakeHudStore.set({
			...state,
			width: this.width
		});
	}

	public setWidth(width: number): void {
		if (this.width === width) {
			return;
		}

		this.width = width;

		snakeHudStore.update((current) => {
			return {
				...current,
				width
			};
		});
	}

	public destroy(): void {
		this.width = 0;
		this.lastKey = '';
		snakeHudStore.set(createDefaultSnakeHudState());
	}

	private createKey(state: HudUpdate): string {
		return [
			state.level,
			state.score,
			state.movesLeft,
			state.comboMultiplier,
			state.finalMode ? 1 : 0,
			state.targetBits.join(''),
			state.activeBits.join('')
		].join('|');
	}
}