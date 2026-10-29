import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap, PacmanStateName } from '../Events';
import type { LevelLoader } from '../../logic/level/LevelLoader';
import type { Director } from '../Director';
import type { FlowTiming } from './StateClock';

export interface GameStateContext {
	director: Director;
	events: EventBus<PacmanEventMap>;
	level: LevelLoader;
}

export interface GameState {
	readonly name: PacmanStateName;
	/** States a pause can suspend (and auto-pause should): ready, playing, death, clear. */
	readonly pausable: boolean;
	enter(ctx: GameStateContext): void;
	update(ctx: GameStateContext, dt: number): void;
	exit(ctx: GameStateContext): void;
	/** Phase and progress of the state's timeline; untimed states report one idle phase. */
	timing(): FlowTiming;
}

/** Timing of a state without a timeline. */
export function idleTiming(phase: string): FlowTiming {
	return {
		phase,
		phaseProgress: 0,
		phaseRemaining: 0,
		phaseDuration: 0,
		progress: 0,
		elapsed: 0,
		remaining: 0,
		duration: 0,
		done: false
	};
}
