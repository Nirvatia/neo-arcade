import type { HudAdapter, HudUpdate } from './HudAdapter.js';
import { snakeHudStore } from './hudStore.js';
import { createDefaultSnakeHudState } from './SnakeHudState.js';

export class SvelteHudAdapter implements HudAdapter {
	private width = 0;
	private lastBiomeIndex = -1;
	private lastBiomeLevel = -1;
	private lastInfinite = false;
	private lastScore = -1;
	private lastMovesLeft = -1;
	private lastCombo = -1;
	private lastTargetKey = '';
	private lastActiveKey = '';

	public update(state: HudUpdate): void {
		if (this.isSame(state)) {
			return;
		}
		this.cacheState(state);
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
		this.resetCache();
		snakeHudStore.set(createDefaultSnakeHudState());
	}

	private isSame(state: HudUpdate): boolean {
		return (
			state.biomeIndex === this.lastBiomeIndex &&
			state.biomeLevel === this.lastBiomeLevel &&
			state.infinite === this.lastInfinite &&
			state.score === this.lastScore &&
			state.movesLeft === this.lastMovesLeft &&
			state.comboMultiplier === this.lastCombo &&
			state.targetKey === this.lastTargetKey &&
			state.activeKey === this.lastActiveKey
		);
	}

	private cacheState(state: HudUpdate): void {
		this.lastBiomeIndex = state.biomeIndex;
		this.lastBiomeLevel = state.biomeLevel;
		this.lastInfinite = state.infinite;
		this.lastScore = state.score;
		this.lastMovesLeft = state.movesLeft;
		this.lastCombo = state.comboMultiplier;
		this.lastTargetKey = state.targetKey;
		this.lastActiveKey = state.activeKey;
	}

	private resetCache(): void {
		this.lastBiomeIndex = -1;
		this.lastBiomeLevel = -1;
		this.lastInfinite = false;
		this.lastScore = -1;
		this.lastMovesLeft = -1;
		this.lastCombo = -1;
		this.lastTargetKey = '';
		this.lastActiveKey = '';
	}
}