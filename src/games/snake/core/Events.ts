export const DirectorState = {
	MENU: 'MENU',
	PLAYING: 'PLAYING',
	PAUSED: 'PAUSED',
	GAME_OVER: 'GAME_OVER',
} as const;

export type DirectorStateType = (typeof DirectorState)[keyof typeof DirectorState];

/**
 * EventBus используется ТОЛЬКО для звука и UI/HUD.
 * Игровая логика — только прямые вызовы.
 */
export type SnakeEventMap = {
	'director:stateChanged': {
		previous: DirectorStateType;
		current: DirectorStateType;
	};
	'score:changed': { score: number };
};