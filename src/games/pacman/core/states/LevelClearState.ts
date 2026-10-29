import type { GameState, GameStateContext } from '../flow/GameState';
import { StateClock } from '../flow/StateClock';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';
import { FLOW } from '../../config/flowConfig';

export type LevelClearPhase = 'blink' | 'cutscene' | 'maze-out';

export const LEVEL_CLEAR_MAX_BLINK = 0.22;

export interface LevelClearSnapshot {
	readonly phase: LevelClearPhase;
	readonly phaseProgress: number;
	readonly progress: number;
	readonly blinkAmount: number;
	readonly mazeAlpha: number;
	readonly timer: number;
	readonly duration: number;
	readonly phaseTimer: number;
	readonly phaseDuration: number;
}

const BLINK_PERIOD = 1.2;
const ENVELOPE_SHARE = 0.15;
const TAU = Math.PI * 2;

function clamp01(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}

export class LevelClearState implements GameState {
	readonly name: PacmanStateName = 'level-clear';
	readonly pausable = true;
	private readonly clock = new StateClock<LevelClearPhase>([
		{ name: 'blink', duration: FLOW.levelClear.blink },
		{ name: 'cutscene', duration: FLOW.levelClear.cutscene },
		{ name: 'maze-out', duration: FLOW.levelClear.mazeOut }
	]);
	private musicEmitted = false;
	private resolved = false;

	get levelClear(): LevelClearSnapshot {
		const timing = this.clock.timing;
		const { phase, phaseProgress } = timing;
		let blinkAmount = 0;
		let mazeAlpha = 1;
		if (phase === 'blink') {
			const cycle = (timing.elapsed % BLINK_PERIOD) / BLINK_PERIOD;
			const wave = 0.5 - 0.5 * Math.cos(cycle * TAU);
			const envelope = Math.min(
				1,
				phaseProgress / ENVELOPE_SHARE,
				(1 - phaseProgress) / ENVELOPE_SHARE
			);
			blinkAmount = wave * LEVEL_CLEAR_MAX_BLINK * clamp01(envelope);
		} else if (phase === 'maze-out') {
			const t = phaseProgress;
			mazeAlpha = 1 - t * t * (3 - 2 * t);
		} else {
			mazeAlpha = 0;
		}
		return {
			phase,
			phaseProgress,
			progress: timing.progress,
			blinkAmount: clamp01(blinkAmount),
			mazeAlpha: clamp01(mazeAlpha),
			timer: timing.remaining,
			duration: timing.duration,
			phaseTimer: timing.phaseRemaining,
			phaseDuration: timing.phaseDuration
		};
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		ctx.level.emitHud();
	}

	update(ctx: GameStateContext, dt: number): void {
		if (this.resolved) {
			return;
		}
		const finished = this.clock.advance(dt);
		if (this.clock.phase === 'cutscene' && !this.musicEmitted) {
			this.musicEmitted = true;
			ctx.events.emit('audio:cue', { cue: 'win' });
		}
		if (finished) {
			this.resolved = true;
			ctx.director.changeLevel(() => ctx.level.advanceLevel());
		}
	}

	exit(): void {}

	timing(): FlowTiming {
		return this.clock.timing;
	}
}
