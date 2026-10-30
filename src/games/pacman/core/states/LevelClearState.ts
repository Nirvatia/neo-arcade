import type { GameState, GameStateContext } from '../flow/GameState';
import { StateClock } from '../flow/StateClock';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';
import { FLOW } from '../../config/flowConfig';

/** The season turn's phases, or the arcade's maze flash and intermission. */
export type LevelClearPhase = 'lights' | 'turn' | 'settle' | 'flash' | 'intermission';

/** Where the last dot was eaten, tile-centre coordinates: the season turns from here. */
export interface LevelClearSnapshot {
	readonly x: number;
	readonly y: number;
}

/**
 * The level is cleared and the season turns to the next level's world (drawn by the
 * pipeline's season turn). At the end the next level starts in place: the new world is
 * already on screen, so there is no fade. In the arcade the maze flashes instead (and the
 * intermission plays after round 2); the next round starts in place, while leaving the
 * arcade after the last round fades back to the main game.
 */
export class LevelClearState implements GameState {
	readonly name: PacmanStateName = 'level-clear';
	readonly pausable = true;
	private clock = new StateClock<LevelClearPhase>([
		{ name: 'lights', duration: FLOW.levelClear.lights },
		{ name: 'turn', duration: FLOW.levelClear.turn },
		{ name: 'settle', duration: FLOW.levelClear.settle }
	]);
	private origin: LevelClearSnapshot = { x: 0, y: 0 };
	private resolved = false;
	private lastPhase: LevelClearPhase | null = null;

	get levelClear(): LevelClearSnapshot {
		return this.origin;
	}

	enter(ctx: GameStateContext): void {
		const session = ctx.level.ensure();
		if (ctx.level.secretMode) {
			this.clock = new StateClock<LevelClearPhase>([
				{ name: 'flash', duration: FLOW.arcade.flash },
				...(ctx.level.arcadeIntermission
					? [{ name: 'intermission' as const, duration: FLOW.arcade.intermission }]
					: [])
			]);
		}
		const p = session.player.position;
		this.origin =
			Number.isFinite(p.x) && Number.isFinite(p.y)
				? { x: p.x, y: p.y }
				: { x: session.grid.width / 2, y: session.grid.height / 2 };
		ctx.level.emitHud();
		ctx.events.emit('audio:cue', { cue: 'win' });
	}

	update(ctx: GameStateContext, dt: number): void {
		if (this.resolved) {
			return;
		}
		const done = this.clock.advance(dt);
		const phase = this.clock.phase;
		if (phase !== this.lastPhase) {
			this.lastPhase = phase;
			if (phase === 'intermission') {
				ctx.events.emit('audio:cue', { cue: 'intermission' });
			}
		}
		if (!done) {
			return;
		}
		this.resolved = true;
		if (ctx.level.arcadeFinalRound) {
			ctx.director.changeLevel(() => ctx.level.advanceLevel());
			return;
		}
		ctx.director.startLevelInPlace(() => ctx.level.advanceLevel());
	}

	exit(): void {}

	timing(): FlowTiming {
		return this.clock.timing;
	}
}
