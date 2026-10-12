import type { GameModel } from '../GameModel';
import type { StateMachine } from '../../engine/StateMachine';

export interface GameState {
	enter(model: GameModel): void;
	update(dt: number, model: GameModel, sm: StateMachine): void;
	exit(model: GameModel): void;
}