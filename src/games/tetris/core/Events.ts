export const TetrisEvents = {
	FLASH: 'tetris:flash',
	BANNER: 'tetris:banner',
	SHAKE: 'tetris:shake'
} as const;

export type TetrisEvent = (typeof TetrisEvents)[keyof typeof TetrisEvents];