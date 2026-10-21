// src/games/pacman/core/states/ReadyState.ts
import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

const READY_TIME = 5;

export class ReadyState implements GameState {
	readonly name: PacmanStateName = 'ready';
	private timer: number;

	constructor(initialTimer = READY_TIME) {
		if (!Number.isFinite(initialTimer) || initialTimer < 0) {
			console.error('ReadyState.constructor', 'invalid initial timer', initialTimer);
			this.timer = READY_TIME;
			return;
		}
		this.timer = initialTimer;
	}

	get overlayTimer(): number {
		return this.timer;
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

	exit(): void {}
}