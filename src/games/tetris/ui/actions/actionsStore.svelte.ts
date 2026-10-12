// src/games/tetris/ui/actions/actionsStore.svelte.ts

export interface TetrisActions {
	start: () => void;
	togglePause: () => void;
}

let _actions = $state<TetrisActions | null>(null);

export function getTetrisActions(): TetrisActions | null {
	return _actions;
}

export function setTetrisActions(actions: TetrisActions | null): void {
	_actions = actions;
}