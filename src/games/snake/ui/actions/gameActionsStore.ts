import { writable } from 'svelte/store';

export interface SnakeGameActions {
	direction(dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): void;
	confirm(): void;
	pauseToggle(): void;
	restart(): void;
	mute(): void;
}

export const snakeGameActions = writable<SnakeGameActions | null>(null);