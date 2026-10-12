import { GamePhase } from '../types';
import { LineClearSystem } from '../../systems/LineClearSystem';
import { PlayingState } from './PlayingState';
import type { GameModel } from '../GameModel';
import type { StateMachine } from '../../engine/StateMachine';
import type { GameState } from './types';

export class ClearingState implements GameState {
	private lineClearSystem = new LineClearSystem();

	enter(model: GameModel): void {
		model.phase = GamePhase.CLEARING;
	}

	update(dt: number, model: GameModel, sm: StateMachine): void {
		const cleared = this.lineClearSystem.update(dt, model);
		if (cleared) {
			sm.changeState(new PlayingState());
		}
	}

	exit(): void {}
}