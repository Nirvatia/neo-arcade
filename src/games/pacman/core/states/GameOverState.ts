import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

export class GameOverState implements GameState {
	readonly name: PacmanStateName = 'game-over';
	private elapsed = 0;

	enter(ctx: GameStateContext): void {
		if (ctx.director.stateName !== this.name) {
			return;
		}
		this.elapsed = 0;
	}

	update(ctx: GameStateContext, dt: number): void {
		if (ctx.director.stateName !== this.name) {
			return;
		}
		this.elapsed = Math.max(0, this.elapsed + dt);
	}

	exit(ctx: GameStateContext): void {
		if (ctx.director.stateName !== this.name) {
			return;
		}
		this.elapsed = 0;
	}
}