import { Direction } from '../components/index.js';

/**
 * InputConfig — клавиши, хоткеи, пороги свайпов и тапов.
 */
export const InputConfig = {
	KEY_TO_DIRECTION: {
		ArrowUp: Direction.UP,
		KeyW: Direction.UP,
		ArrowDown: Direction.DOWN,
		KeyS: Direction.DOWN,
		ArrowLeft: Direction.LEFT,
		KeyA: Direction.LEFT,
		ArrowRight: Direction.RIGHT,
		KeyD: Direction.RIGHT
	} as Record<string, Direction>,
	HOTKEYS: {
		PAUSE: 'Space',
		PAUSE_ALT: 'Escape',
		CONFIRM: 'Enter',
		MUTE: 'KeyM'
	},
	SWIPE_THRESHOLD_PX: 22,
	DOUBLE_TAP_MS: 350,
	TOP_TAP_ZONE: 0.18
} as const;
export type InputConfigType = typeof InputConfig;