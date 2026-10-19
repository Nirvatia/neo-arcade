import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

export class PausedState implements GameState {
	readonly name: PacmanStateName = 'paused';

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
	}

	update(): void {}

	exit(): void {}
}