export type PacmanStateName = 'menu' | 'playing' | 'paused' | 'game-over';

export interface PacmanStateChangedPayload {
	state: PacmanStateName;
}

export type PacmanEventMap = {
	'ui:stateChanged': PacmanStateChangedPayload;
};