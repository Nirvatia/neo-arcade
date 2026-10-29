export interface ClockPhase<P extends string> {
	readonly name: P;
	/** Seconds; zero-length phases are skipped. */
	readonly duration: number;
}

/** Where a timed state is: the current phase and how far it and the whole timeline are. */
export interface FlowTiming<P extends string = string> {
	readonly phase: P;
	/** 0..1 within the current phase. */
	readonly phaseProgress: number;
	/** Seconds left in the current phase. */
	readonly phaseRemaining: number;
	readonly phaseDuration: number;
	/** 0..1 over the whole timeline. */
	readonly progress: number;
	/** Seconds since the timeline started / left until it ends. */
	readonly elapsed: number;
	readonly remaining: number;
	readonly duration: number;
	readonly done: boolean;
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}

/**
 * A timeline of named phases played back by `advance(dt)`. Timed game states (ready, death,
 * level clear, game over, the screen fade) are built on it, and renderers hook their
 * animations to its `phase` and `phaseProgress`.
 */
export class StateClock<P extends string> {
	private readonly phases: readonly ClockPhase<P>[];
	private readonly total: number;
	private elapsedValue = 0;

	constructor(phases: readonly ClockPhase<P>[]) {
		if (phases.length === 0) {
			throw new Error('StateClock.constructor: no phases');
		}
		for (const phase of phases) {
			if (!Number.isFinite(phase.duration) || phase.duration < 0) {
				throw new Error(`StateClock.constructor: invalid duration for ${phase.name}`);
			}
		}
		this.phases = phases;
		this.total = phases.reduce((sum, phase) => sum + phase.duration, 0);
	}

	get duration(): number {
		return this.total;
	}

	get elapsed(): number {
		return this.elapsedValue;
	}

	get done(): boolean {
		return this.elapsedValue >= this.total;
	}

	get phase(): P {
		return this.timing.phase;
	}

	get timing(): FlowTiming<P> {
		const elapsed = Math.min(this.total, this.elapsedValue);
		let start = 0;
		let current = this.phases[this.phases.length - 1];
		for (const phase of this.phases) {
			if (phase.duration > 0 && elapsed < start + phase.duration) {
				current = phase;
				break;
			}
			start += phase.duration;
		}
		if (elapsed >= this.total) {
			start = this.total - current.duration;
		}
		const phaseElapsed = elapsed - start;
		return {
			phase: current.name,
			phaseProgress: current.duration > 0 ? clamp01(phaseElapsed / current.duration) : 1,
			phaseRemaining: Math.max(0, current.duration - phaseElapsed),
			phaseDuration: current.duration,
			progress: this.total > 0 ? clamp01(elapsed / this.total) : 1,
			elapsed,
			remaining: Math.max(0, this.total - elapsed),
			duration: this.total,
			done: elapsed >= this.total
		};
	}

	/** Moves time forward; returns true on the frame the timeline finishes. */
	advance(dt: number): boolean {
		if (!Number.isFinite(dt) || dt <= 0 || this.done) {
			return false;
		}
		this.elapsedValue = Math.min(this.total, this.elapsedValue + dt);
		return this.done;
	}

	finish(): void {
		this.elapsedValue = this.total;
	}

	reset(): void {
		this.elapsedValue = 0;
	}
}
