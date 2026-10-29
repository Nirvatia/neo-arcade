import type { GameState, GameStateContext } from '../flow/GameState';
import { idleTiming } from '../flow/GameState';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';

export class MenuState implements GameState {
	readonly name: PacmanStateName = 'menu';
	readonly pausable = false;

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		ctx.level.emitHud();
	}

	update(): void {}

	exit(): void {}

	timing(): FlowTiming {
		return idleTiming('idle');
	}
}
