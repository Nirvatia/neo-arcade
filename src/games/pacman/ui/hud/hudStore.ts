import { writable } from 'svelte/store';
import type { PacmanProfile, PacmanStateName } from '../../core/Events';

export type PacmanHudResult = 'none' | 'win' | 'lose';

export interface PacmanHudState {
	score: number;
	lives: number;
	dots: number;
	power: number;
	mode: PacmanProfile;
	result: PacmanHudResult;
	state: PacmanStateName;
}

export const pacmanHudStore = writable<PacmanHudState>({
	score: 0,
	lives: 3,
	dots: 0,
	power: 0,
	mode: 'pacman',
	result: 'none',
	state: 'menu'
});