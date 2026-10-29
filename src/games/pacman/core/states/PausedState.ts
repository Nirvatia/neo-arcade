import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

export type PausedResumeTarget = 'playing' | 'ready';

export class PausedState implements GameState {
	readonly name: PacmanStateName = 'paused';
	readonly resumeTarget: PausedResumeTarget;
	readonly readyTimer: number;

	constructor(resumeTarget: PausedResumeTarget = 'playing', readyTimer = 0) {
		if (resumeTarget !== 'playing' && resumeTarget !== 'ready') {
			console.error('PausedState.constructor', 'invalid resume target', resumeTarget);
			this.resumeTarget = 'playing';
		} else {
			this.resumeTarget = resumeTarget;
		}
		if (!Number.isFinite(readyTimer) || readyTimer < 0) {
			console.error('PausedState.constructor', 'invalid ready timer', readyTimer);
			this.readyTimer = 0;
			return;
		}
		this.readyTimer = readyTimer;
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		ctx.level.emitHud();
	}

	update(): void {}

	exit(): void {}
}