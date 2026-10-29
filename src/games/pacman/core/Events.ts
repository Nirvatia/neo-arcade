export type PacmanStateName =
	| 'menu'
	| 'ready'
	| 'playing'
	| 'paused'
	| 'death'
	| 'level-clear'
	| 'game-over';

export type PacmanGameResult = 'none' | 'win' | 'lose';

export type PacmanProfile = 'pacman' | 'ms-pacman';

export type PacmanAudioCue =
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
	| 'teleport';

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

export type PacmanEventMap = {
	'ui:stateChanged': PacmanStateChangedPayload;
	'ui:hudChanged': PacmanHudPayload;
	'audio:cue': PacmanAudioCuePayload;
};