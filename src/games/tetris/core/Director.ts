import { StateMachine } from '../engine/StateMachine';
import { ClearingState } from './states/ClearingState';
import { IdleState } from './states/IdleState';
import { PausedState } from './states/PausedState';
import { PlayingState } from './states/PlayingState';
import { GamePhase } from './types';
import type { GameModel } from './GameModel';

export class Director {
	private readonly sm: StateMachine;
	private resumeToClearing = false;

	constructor(private readonly model: GameModel) {
		this.sm = new StateMachine(model);
		this.sm.changeState(new IdleState());
	}

	start(): void {
		if (this.model.phase === GamePhase.PLAYING || this.model.phase === GamePhase.CLEARING) {
			return;
		}
		this.model.reset();
		this.sm.changeState(new PlayingState());
	}

	togglePause(): void {
		if (this.model.phase === GamePhase.PLAYING || this.model.phase === GamePhase.CLEARING) {
			this.resumeToClearing = this.model.phase === GamePhase.CLEARING;
			this.sm.changeState(new PausedState());
			return;
		}
		if (this.model.phase === GamePhase.PAUSED) {
			if (this.resumeToClearing) {
				this.sm.changeState(new ClearingState());
			} else {
				this.sm.changeState(new PlayingState());
			}
		}
	}

	update(dt: number): void {
		this.sm.update(dt);
	}
}