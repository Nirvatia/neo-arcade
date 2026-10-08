import { writable } from 'svelte/store';
import {
	DirectorState,
	type DirectorStateType
} from '../../core/Events.js';

export interface SnakeOverlayState {
	state: DirectorStateType;
	score: number;
	isNewRecord: boolean;

	// Прогресс на момент паузы / конца игры.
	level: number;
	biomeIndex: number;
	infinite: boolean;
}

export function createOverlayState(): SnakeOverlayState {
	return {
		state: DirectorState.MENU,
		score: 0,
		isNewRecord: false,
		level: 1,
		biomeIndex: 0,
		infinite: false
	};
}

export const snakeOverlayStore = writable<SnakeOverlayState>(
	createOverlayState()
);