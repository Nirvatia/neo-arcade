import { Direction } from '../components/index.js';
import { InputConfig } from '../config/InputConfig.js';
import { DirectorState, type DirectorStateType } from './Events.js';

export interface InputCallbacks {
	getState: () => DirectorStateType;
	startGame: () => void;
	pause: () => void;
	resume: () => void;
	pressDirection: (dir: Direction) => void;
	restart: () => void;
	unlockAudio: () => void;
	onMuteToggle: (muted: boolean) => void;
}

/**
 * InputController.
 *
 * Клавиатура остаётся.
 * Свайпы и тапы по канвасу удалены.
 *
 * Планшетное управление идёт через публичный кнопочный API:
 * direction / touchPause / touchMute и т.д.
 */
export class InputController {
	private callbacks: InputCallbacks | null = null;
	private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
	private muted = false;

	public get isMuted(): boolean {
		return this.muted;
	}

	public setCallbacks(callbacks: InputCallbacks): void {
		this.callbacks = callbacks;
	}

	public bind(_canvasParent: HTMLElement): void {
		this.bindKeyboard();
	}

	public destroy(): void {
		if (this.keyDownHandler !== null) {
			window.removeEventListener('keydown', this.keyDownHandler);
			this.keyDownHandler = null;
		}

		this.callbacks = null;
	}

	// ============================== ПУБЛИЧНЫЙ КНОПОЧНЫЙ API ==============================

	public direction(dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): void {
		if (this.callbacks === null) {
			return;
		}

		this.callbacks.unlockAudio();
		this.pressDirectionInternal(Direction[dir]);
	}

	/**
	 * Контекстное подтверждение.
	 *
	 * MENU -> start
	 * PAUSED -> resume
	 * GAME_OVER -> restart
	 * PLAYING -> ничего не делает
	 */
	public confirm(): void {
		if (this.callbacks === null) {
			return;
		}

		this.callbacks.unlockAudio();

		const state = this.callbacks.getState();

		if (state === DirectorState.PLAYING) {
			return;
		}

		this.onConfirm();
	}

	public pauseToggle(): void {
		if (this.callbacks === null) {
			return;
		}

		this.callbacks.unlockAudio();
		this.togglePause();
	}

	public restart(): void {
		if (this.callbacks === null) {
			return;
		}

		this.callbacks.unlockAudio();

		const state = this.callbacks.getState();

		if (state === DirectorState.GAME_OVER || state === DirectorState.PAUSED) {
			this.callbacks.restart();
		}
	}

	public muteToggle(): void {
		if (this.callbacks === null) {
			return;
		}

		this.callbacks.unlockAudio();
		this.toggleMute();
	}

	// Старые имена для совместимости с GameStage / GameMain.

	public touchDirection(dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): void {
		this.direction(dir);
	}

	public touchPause(): void {
		if (this.callbacks === null) {
			return;
		}

		this.callbacks.unlockAudio();

		const state = this.callbacks.getState();

		if (state === DirectorState.PLAYING || state === DirectorState.PAUSED) {
			this.togglePause();
			return;
		}

		this.onConfirm();
	}

	public touchMute(): void {
		this.muteToggle();
	}

	// ============================== КЛАВИАТУРА ==============================

	private bindKeyboard(): void {
		this.keyDownHandler = (event: KeyboardEvent): void => {
			this.handleKeyDown(event);
		};

		window.addEventListener('keydown', this.keyDownHandler);
	}

	private handleKeyDown(event: KeyboardEvent): void {
		if (this.callbacks === null) {
			return;
		}

		this.callbacks.unlockAudio();

		const direction = InputConfig.KEY_TO_DIRECTION[event.code];

		if (direction !== undefined) {
			event.preventDefault();
			this.pressDirectionInternal(direction);
			return;
		}

		if (
			event.code === InputConfig.HOTKEYS.PAUSE ||
			event.code === InputConfig.HOTKEYS.PAUSE_ALT
		) {
			event.preventDefault();
			this.pauseToggle();
			return;
		}

		if (event.code === InputConfig.HOTKEYS.CONFIRM) {
			event.preventDefault();
			this.confirm();
			return;
		}

		if (event.code === InputConfig.HOTKEYS.MUTE) {
			event.preventDefault();
			this.muteToggle();
		}
	}

	// ============================== ВНУТРЕННЯЯ ЛОГИКА ==============================

	private pressDirectionInternal(direction: Direction): void {
		if (this.callbacks === null) {
			return;
		}

		const state = this.callbacks.getState();

		if (state === DirectorState.MENU) {
			this.callbacks.startGame();
		} else if (state === DirectorState.PAUSED) {
			this.callbacks.resume();
		}

		const currentState = this.callbacks.getState();

		if (currentState === DirectorState.PLAYING) {
			this.callbacks.pressDirection(direction);
		}
	}

	private togglePause(): void {
		if (this.callbacks === null) {
			return;
		}

		const state = this.callbacks.getState();

		if (state === DirectorState.PLAYING) {
			this.callbacks.pause();
			return;
		}

		if (state === DirectorState.PAUSED) {
			this.callbacks.resume();
		}
	}

	private onConfirm(): void {
		if (this.callbacks === null) {
			return;
		}

		const state = this.callbacks.getState();

		if (state === DirectorState.MENU) {
			this.callbacks.startGame();
			return;
		}

		if (state === DirectorState.PAUSED) {
			this.callbacks.resume();
			return;
		}

		if (state === DirectorState.GAME_OVER) {
			this.callbacks.restart();
			return;
		}
	}

	private toggleMute(): void {
		this.muted = !this.muted;

		if (this.callbacks !== null) {
			this.callbacks.onMuteToggle(this.muted);
		}
	}
}