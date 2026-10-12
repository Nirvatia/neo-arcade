import type { GameModel } from '../core/GameModel';
import type { GameState } from '../core/states/types';

export class StateMachine {
	private currentState: GameState | null = null;

	constructor(private readonly model: GameModel) {}

	get state(): GameState | null {
		return this.currentState;
	}

	changeState(newState: GameState): void {
		if (this.currentState) {
			this.currentState.exit(this.model);
		}
		this.currentState = newState;
		this.currentState.enter(this.model);
	}

	update(dt: number): void {
		if (this.currentState) {
			this.currentState.update(dt, this.model, this);
		}
	}
}