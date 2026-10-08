import { Direction } from '../components/index.js';

/**
 * InputConfig — клавиши и хоткеи.
 *
 * Свайпы и тапы удалены.
 * Планшетная поддержка реализуется через экранные кнопки.
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
	}
} as const;

export type InputConfigType = typeof InputConfig;