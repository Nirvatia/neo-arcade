import { GamePhase } from '../types';
import type { GameModel } from '../GameModel';
import type { GameState } from './types';

export class PausedState implements GameState {
	enter(model: GameModel): void {
		model.phase = GamePhase.PAUSED;
	}

	update(): void {}

	exit(): void {}
}