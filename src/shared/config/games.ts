// src/shared/config/games.ts
import { getSavedScore } from '../utils/scoreStore';

export interface GameConfig {
	id: string;
	title: string;
	genre: string;
	status: 'ready' | 'dev' | 'soon';
	progress?: number;
	route?: string;
	defaultScore?: number | string;
}

export const games: GameConfig[] = [
	{
		id: 'snake',
		title: 'SNAKE',
		genre: 'PUZZLE',
		status: 'ready',
		route: '/games/snake',
		defaultScore: 0
	},
	{ id: 'pacman', title: 'PAC-MAN', genre: 'MAZE', status: 'soon', defaultScore: 0 },
	{ id: 'tetris', title: 'TETRIS', genre: 'PUZZLE', status: 'soon', defaultScore: 0 },
	{ id: 'simon-says', title: 'SIMON SAYS', genre: 'PUZZLE', status: 'soon', defaultScore: 0 }
];

export function rankLabel(index: number): string {
	const ranks = ['1ST', '2ND', '3RD'];
	return ranks[index] ?? `${index + 1}TH`;
}

export function statusLabel(game: GameConfig): string {
	if (game.status === 'ready') return 'PLAY';
	if (game.status === 'dev') return `DEV ${game.progress ?? 0}%`;
	return 'SOON';
}

export function getGameScore(game: GameConfig): string {
	if (game.status === 'soon') return '------';
	return getSavedScore(game.id, game.defaultScore ?? '000000');
}
