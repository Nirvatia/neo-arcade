import type { GhostKind } from '../logic/actors/GhostModel';

export type PacmanStateName =
	'menu' | 'ready' | 'playing' | 'paused' | 'death' | 'level-clear' | 'game-over';

export type PacmanGameResult = 'none' | 'win' | 'lose';

export type PacmanProfile = 'pacman' | 'ms-pacman';

export type PacmanAudioCue =
	| 'intro'
	| 'dot'
	| 'energizer'
	| 'power-start'
	| 'power-end'
	| 'ghost-eaten'
	| 'death'
	| 'lose'
	| 'win'
	| 'fruit-spawn'
	| 'fruit-collect'
	| 'fruit-expire'
	| 'egg-spawn'
	| 'egg-collect'
	| 'exit-open'
	| 'exit-enter'
	| 'teleport'
	| 'bonus-life'
	/** The arcade's intermission starts. */
	| 'intermission';

export interface PacmanStateChangedPayload {
	state: PacmanStateName;
}

export type PacmanHellWeapon = 'bfg' | 'barrel' | 'berserk' | '';

export interface PacmanHellHud {
	hp: number;
	hpMax: number;
	bossHp: number;
	bossHpMax: number;
	bossPhase: number;
	weapon: PacmanHellWeapon;
	/** Seconds of berserk left, rounded to 0.1. */
	berserk: number;
}

export interface PacmanHudPayload {
	score: number;
	lives: number;
	dots: number;
	power: number;
	mode: PacmanProfile;
	result: PacmanGameResult;
	level: number;
	/** Present only on the hell level. */
	hell: PacmanHellHud | null;
}

export interface PacmanAudioCuePayload {
	cue: PacmanAudioCue;
}

/** Dev log channels (the log panel filters by them). */
export type PacmanDebugChannel = 'damage' | 'debuff' | 'state' | 'spawn' | 'input' | 'boss';

/** One dev log line; emitted only in dev builds (`logic/debug/debugLog`). */
export interface PacmanDebugLogPayload {
	channel: PacmanDebugChannel;
	text: string;
	value?: number;
}

/**
 * Gameplay moments the renderer turns into effects (pop-ups, bursts, rings, shake).
 * Positions are tile-centre coordinates; `points` is what the moment scored.
 */
export type PacmanFx =
	| { kind: 'ghost-eaten'; x: number; y: number; points: number; ghost: GhostKind }
	| { kind: 'energizer'; x: number; y: number }
	| { kind: 'fruit'; x: number; y: number; points: number }
	| { kind: 'egg'; x: number; y: number; points: number }
	| { kind: 'extra-life'; x: number; y: number }
	/** A ghost brushed past Pac-Man and he got away: from the ghost (gx, gy) to him. */
	| { kind: 'near-miss'; x: number; y: number; gx: number; gy: number; ghost: GhostKind };

export type PacmanEventMap = {
	'ui:stateChanged': PacmanStateChangedPayload;
	'ui:hudChanged': PacmanHudPayload;
	'audio:cue': PacmanAudioCuePayload;
	'debug:log': PacmanDebugLogPayload;
	'fx:event': PacmanFx;
};
