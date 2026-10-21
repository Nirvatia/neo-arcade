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

export interface PacmanHudPayload {
	score: number;
	lives: number;
	dots: number;
	power: number;
	mode: PacmanProfile;
	result: PacmanGameResult;
}

export interface PacmanAudioCuePayload {
	cue: PacmanAudioCue;
}

export type PacmanEventMap = {
	'ui:stateChanged': PacmanStateChangedPayload;
	'ui:hudChanged': PacmanHudPayload;
	'audio:cue': PacmanAudioCuePayload;
};