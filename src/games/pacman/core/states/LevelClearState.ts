import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

export class LevelClearState implements GameState {
	readonly name: PacmanStateName = 'level-clear';

	private timer = 3;

	get overlayTimer(): number {
		return this.timer;
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		ctx.level.emitHud();
	}

	update(ctx: GameStateContext, dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('LevelClearState.update', 'invalid delta time', dt);
			return;
		}

		this.timer = Math.max(0, this.timer - dt);

		if (this.timer <= 0) {
			ctx.level.advanceLevel();
			ctx.director.showReady();
		}
	}

	exit(): void {
		this.timer = 3;
	}
}