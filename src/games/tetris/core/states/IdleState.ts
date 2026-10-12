import { GamePhase } from '../types';
import type { GameModel } from '../GameModel';
import type { GameState } from './types';

export class IdleState implements GameState {
	enter(model: GameModel): void {
		model.phase = GamePhase.IDLE;
	}

	update(): void {}

	exit(): void {}
}