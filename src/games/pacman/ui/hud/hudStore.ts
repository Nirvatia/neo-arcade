import { writable } from 'svelte/store';

export type PacmanHudResult = 'none' | 'win' | 'lose';

export interface PacmanHudState {
	score: number;
	lives: number;
	dots: number;
	power: number;
	result: PacmanHudResult;
}

export const pacmanHudStore = writable<PacmanHudState>({
	score: 0,
	lives: 3,
	dots: 0,
	power: 0,
	result: 'none'
});