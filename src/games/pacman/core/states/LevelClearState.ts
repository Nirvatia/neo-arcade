import type { GameState, GameStateContext } from '../flow/GameState';
import { StateClock } from '../flow/StateClock';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';
import { FLOW } from '../../config/flowConfig';

export type LevelClearPhase = 'lights' | 'turn' | 'settle';

/** Where the last dot was eaten, tile-centre coordinates: the season turns from here. */
export interface LevelClearSnapshot {
	readonly x: number;
	readonly y: number;
}

/**
 * The level is cleared and the season turns to the next level's world (drawn by the
 * pipeline's season turn). At the end the next level starts in place: the new world is
 * already on screen, so there is no fade.
 */
export class LevelClearState implements GameState {
	readonly name: PacmanStateName = 'level-clear';
	readonly pausable = true;
	private readonly clock = new StateClock<LevelClearPhase>([
		{ name: 'lights', duration: FLOW.levelClear.lights },
		{ name: 'turn', duration: FLOW.levelClear.turn },
		{ name: 'settle', duration: FLOW.levelClear.settle }
	]);
	private origin: LevelClearSnapshot = { x: 0, y: 0 };
	private resolved = false;

	get levelClear(): LevelClearSnapshot {
		return this.origin;
	}

	enter(ctx: GameStateContext): void {
		const session = ctx.level.ensure();
		const p = session.player.position;
		this.origin =
			Number.isFinite(p.x) && Number.isFinite(p.y)
				? { x: p.x, y: p.y }
				: { x: session.grid.width / 2, y: session.grid.height / 2 };
		ctx.level.emitHud();
		ctx.events.emit('audio:cue', { cue: 'win' });
	}

	update(ctx: GameStateContext, dt: number): void {
		if (this.resolved || !this.clock.advance(dt)) {
			return;
		}
		this.resolved = true;
		ctx.director.startLevelInPlace(() => ctx.level.advanceLevel());
	}

	exit(): void {}

	timing(): FlowTiming {
		return this.clock.timing;
	}
}
