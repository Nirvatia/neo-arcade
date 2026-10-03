import { writable } from 'svelte/store';
import { createDefaultSnakeHudState, type SnakeHudState } from './SnakeHudState.js';

export const snakeHudStore = writable<SnakeHudState>(
	createDefaultSnakeHudState()
);