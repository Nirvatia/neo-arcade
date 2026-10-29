import type { GameState, GameStateContext } from '../flow/GameState';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';

/**
 * Freezes another state. The suspended state is neither exited nor updated, so resuming
 * continues it exactly where it stopped (ready countdown, death wave, level clear, play).
 */
export class PausedState implements GameState {
	readonly name: PacmanStateName = 'paused';
	readonly pausable = false;
	readonly suspended: GameState;

	constructor(suspended: GameState) {
		this.suspended = suspended;
	}

	enter(ctx: GameStateContext): void {
		ctx.level.emitHud();
	}

	update(): void {}

	exit(): void {}

	timing(): FlowTiming {
		return this.suspended.timing();
	}
}
