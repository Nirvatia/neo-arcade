import { setHudState } from './hudStore.svelte';
import type { PieceDefinition } from '../../config/PiecesConfig';

export interface HudUpdate {
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

export class SvelteHudAdapter {
	update(data: HudUpdate): void {
		setHudState(data);
	}
}