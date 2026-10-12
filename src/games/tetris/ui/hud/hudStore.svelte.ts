import type { PieceDefinition } from '../../config/PiecesConfig';

export interface TetrisHudState {
	score: number;
	lines: number;
	level: number;
	highScore: number;
	nextQueue: (PieceDefinition | null)[];
	heldPiece: PieceDefinition | null;
	holdUsed: boolean;
	planProgress: number;
	tempo: number;
	hall: number[];
}

export const tetrisHud = $state<TetrisHudState>({
	score: 0,
	lines: 0,
	level: 1,
	highScore: 0,
	nextQueue: [],
	heldPiece: null,
	holdUsed: false,
	planProgress: 0,
	tempo: 1,
	hall: []
});

export function setHudState(patch: Partial<TetrisHudState>): void {
	Object.assign(tetrisHud, patch);
}