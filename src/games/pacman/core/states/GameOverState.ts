import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';
import { saveScore } from '../../../../shared/utils/scoreStore';

export class GameOverState implements GameState {
	readonly name: PacmanStateName = 'game-over';

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();

		const combat = ctx.level.combat;
		const progress = ctx.level.progress;

		if (!combat || !progress) {
			console.error('GameOverState.enter', 'level is not initialized');
			return;
		}

		if (combat.result !== 'none') {
			saveScore('pacman', combat.score);
		}

		ctx.events.emit('ui:hudChanged', {
			score: combat.score,
			lives: combat.lives,
			dots: progress.remainingDots,
			power: Math.ceil(combat.powerTimer * 10) / 10,
			result: combat.result
		});
	}

	update(): void {}

	exit(): void {}
}