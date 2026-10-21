import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';
import { saveScore } from '../../../../shared/utils/scoreStore';

export class GameOverState implements GameState {
	readonly name: PacmanStateName = 'game-over';

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();

		const combat = ctx.level.combat;

		if (combat && combat.result !== 'none') {
			saveScore('pacman', combat.score);
		}

		ctx.level.emitHud();
	}

	update(): void {}

	exit(): void {}
}