import { saveScore } from '$shared/utils/scoreStore';
import { GamePhase } from '../types';
import type { GameModel } from '../GameModel';
import type { GameState } from './types';

export class GameOverState implements GameState {
	enter(model: GameModel): void {
		model.phase = GamePhase.GAMEOVER;
		model.queue.current = null;
		model.clearingRows = [];
		saveScore('tetris', model.score.score);
	}

	update(): void {}

	exit(): void {}
}