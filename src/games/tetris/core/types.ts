export const GamePhase = {
	IDLE: 'idle',
	PLAYING: 'playing',
	PAUSED: 'paused',
	CLEARING: 'clearing',
	GAMEOVER: 'gameover'
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export const TetrisCommand = {
	START: 'start',
	TOGGLE_PAUSE: 'toggle-pause',
	MOVE_LEFT: 'move-left',
	MOVE_RIGHT: 'move-right',
	ROTATE: 'rotate',
	SOFT_DROP: 'soft-drop',
	HARD_DROP: 'hard-drop',
	HOLD: 'hold'
} as const;

export type TetrisCommand = (typeof TetrisCommand)[keyof typeof TetrisCommand];