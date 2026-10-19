import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

export class MenuState implements GameState {
	readonly name: PacmanStateName = 'menu';

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
	}

	update(): void {}

	exit(): void {}
}