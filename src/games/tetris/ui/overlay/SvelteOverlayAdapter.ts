// src/games/tetris/ui/overlay/SvelteOverlayAdapter.ts
import { setOverlayState } from './overlayStore.svelte.ts';
import { setTetrisActions } from '../actions/actionsStore.svelte.ts';
import type { GamePhase } from '../../core/types';

export interface OverlayUpdate {
	phase: GamePhase;
	score: number;
	lines: number;
	level: number;
}

export interface OverlayActions {
	start: () => void;
	togglePause: () => void;
}

export class SvelteOverlayAdapter {
	update(data: OverlayUpdate): void {
		setOverlayState(data);
	}

	setActions(actions: OverlayActions): void {
		setTetrisActions(actions);
	}

	clearActions(): void {
		setTetrisActions(null);
	}
}