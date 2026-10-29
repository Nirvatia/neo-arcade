import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

export const OVERLAY_STATE_DURATION = 5;
const READY_TIME = OVERLAY_STATE_DURATION;

export interface ReadySnapshot {
	readonly timer: number;
	readonly duration: number;
	readonly progress: number;
}

export class ReadyState implements GameState {
	readonly name: PacmanStateName = 'ready';
	private timer: number;

	constructor(initialTimer = READY_TIME) {
		if (!Number.isFinite(initialTimer) || initialTimer < 0) {
			console.error('ReadyState.constructor', 'invalid initial timer', initialTimer);
			this.timer = READY_TIME;
			return;
		}
		this.timer = Math.min(READY_TIME, Math.max(0, initialTimer));
	}

	get overlayTimer(): number {
		return this.timer;
	}

	get snapshot(): ReadySnapshot {
		const remaining = Math.min(READY_TIME, Math.max(0, this.timer));
		const progress =
			READY_TIME > 0
				? Math.min(1, Math.max(0, 1 - remaining / READY_TIME))
				: 1;
		return {
			timer: remaining,
			duration: READY_TIME,
			progress
		};
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		ctx.level.emitHud();
	}

	update(ctx: GameStateContext, dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('ReadyState.update', 'invalid delta time', dt);
			return;
		}
		this.timer = Math.max(0, this.timer - dt);
		if (this.timer <= 0) {
			ctx.director.showPlaying();
		}
	}

	exit(): void {
		this.timer = READY_TIME;
	}
}