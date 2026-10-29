import type { GameState, GameStateContext } from '../flow/GameState';
import { StateClock } from '../flow/StateClock';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';
import { FLOW } from '../../config/flowConfig';
import { saveScore } from '../../../../shared/utils/scoreStore';

export type GameOverPhase = 'locked' | 'idle';

export class GameOverState implements GameState {
	readonly name: PacmanStateName = 'game-over';
	readonly pausable = false;
	private readonly clock = new StateClock<GameOverPhase>([
		{ name: 'locked', duration: FLOW.gameOverInputLock },
		{ name: 'idle', duration: 0 }
	]);

	/** False for the first moments, so a key held at the moment of death does not restart. */
	get inputReady(): boolean {
		return this.clock.done;
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();

		const combat = ctx.level.combat;

		if (combat && combat.result !== 'none') {
			saveScore('pacman', combat.score);
		}

		ctx.level.emitHud();
	}

	update(_ctx: GameStateContext, dt: number): void {
		this.clock.advance(dt);
	}

	exit(): void {}

	timing(): FlowTiming {
		return this.clock.timing;
	}
}
