// src/games/tetris/ui/overlay/overlayStore.svelte.ts
import { GamePhase } from '../../core/types';
import type { GamePhase as GamePhaseType } from '../../core/types';

export interface TetrisOverlayState {
    phase: GamePhaseType;
    score: number;
    lines: number;
    level: number;
}

export const tetrisOverlay = $state<TetrisOverlayState>({
    phase: GamePhase.IDLE,
    score: 0,
    lines: 0,
    level: 1
});

export function setOverlayState(patch: Partial<TetrisOverlayState>): void {
    Object.assign(tetrisOverlay, patch);
}