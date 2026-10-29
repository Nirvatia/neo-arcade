import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

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

const BLINK_DURATION = 2;
const CUTSCENE_DURATION = 5;
const MAZE_OUT_DURATION = 1;
const TOTAL_DURATION = BLINK_DURATION + CUTSCENE_DURATION + MAZE_OUT_DURATION;
const BLINK_PERIOD = 1.2;
const ENVELOPE_SHARE = 0.15;
const TAU = Math.PI * 2;
const EPSILON = 1e-6;

function clamp01(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}

export class LevelClearState implements GameState {
	readonly name: PacmanStateName = 'level-clear';
	private elapsed = 0;
	private awaitingAdvance = false;
	private advanced = false;
	private musicEmitted = false;

	get overlayTimer(): number {
		return Math.max(0, TOTAL_DURATION - this.elapsed);
	}

	get levelClear(): LevelClearSnapshot {
		const duration = TOTAL_DURATION;
		if (!(duration > 0)) {
			return {
				phase: 'maze-out',
				phaseProgress: 1,
				progress: 1,
				blinkAmount: 0,
				mazeAlpha: 0,
				timer: 0,
				duration: 0,
				phaseTimer: 0,
				phaseDuration: 0
			};
		}
		const elapsed = Math.min(duration, Math.max(0, this.elapsed));
		let phase: LevelClearPhase = 'maze-out';
		let phaseDuration = MAZE_OUT_DURATION;
		let phaseElapsed = Math.max(0, elapsed - BLINK_DURATION - CUTSCENE_DURATION);
		if (elapsed < BLINK_DURATION) {
			phase = 'blink';
			phaseDuration = BLINK_DURATION;
			phaseElapsed = elapsed;
		} else if (elapsed < BLINK_DURATION + CUTSCENE_DURATION) {
			phase = 'cutscene';
			phaseDuration = CUTSCENE_DURATION;
			phaseElapsed = elapsed - BLINK_DURATION;
		}
		const phaseProgress = clamp01(phaseDuration > 0 ? phaseElapsed / phaseDuration : 1);
		const phaseTimer = Math.max(0, phaseDuration - phaseElapsed);
		let blinkAmount = 0;
		let mazeAlpha = 1;
		if (phase === 'blink') {
			const cycle = (elapsed % BLINK_PERIOD) / BLINK_PERIOD;
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
			progress: clamp01(elapsed / duration),
			blinkAmount: clamp01(blinkAmount),
			mazeAlpha: clamp01(mazeAlpha),
			timer: Math.max(0, duration - elapsed),
			duration,
			phaseTimer,
			phaseDuration
		};
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		this.resetClock();
		ctx.level.emitHud();
	}

	update(ctx: GameStateContext, dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('LevelClearState.update', 'invalid delta time', dt);
			return;
		}
		if (this.advanced) {
			return;
		}
		if (this.awaitingAdvance) {
			this.awaitingAdvance = false;
			this.advanced = true;
			ctx.level.advanceLevel();
			ctx.director.showReady();
			return;
		}
		this.elapsed = Math.min(TOTAL_DURATION, this.elapsed + dt);
		const snapshot = this.levelClear;
		if (snapshot.phase === 'cutscene' && !this.musicEmitted) {
			this.musicEmitted = true;
			ctx.events.emit('audio:cue', { cue: 'win' });
		}
		if (TOTAL_DURATION <= EPSILON || this.elapsed >= TOTAL_DURATION - EPSILON) {
			this.elapsed = TOTAL_DURATION;
			this.awaitingAdvance = true;
		}
	}

	exit(): void {
		this.resetClock();
	}

	private resetClock(): void {
		this.elapsed = 0;
		this.awaitingAdvance = false;
		this.advanced = false;
		this.musicEmitted = false;
	}
}
