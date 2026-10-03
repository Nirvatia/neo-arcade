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
	startEndless: () => void;
	unlockAudio: () => void;
	onMuteToggle: (muted: boolean) => void;
}

export class InputController {
	private callbacks: InputCallbacks | null = null;
	private canvasParent: HTMLElement | null = null;
	private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
	private pointerDownHandler: ((event: PointerEvent) => void) | null = null;
	private pointerUpHandler: ((event: PointerEvent) => void) | null = null;
	private activePointerId: number | null = null;
	private pointerStartX = 0;
	private pointerStartY = 0;
	private lastTapAt = 0;
	private muted = false;

	public get isMuted(): boolean {
		return this.muted;
	}

	public setCallbacks(callbacks: InputCallbacks): void {
		this.callbacks = callbacks;
	}

	public bind(canvasParent: HTMLElement): void {
		this.canvasParent = canvasParent;
		this.bindKeyboard();
		this.bindTouch();
	}

	public destroy(): void {
		if (this.keyDownHandler !== null) {
			window.removeEventListener('keydown', this.keyDownHandler);
			this.keyDownHandler = null;
		}
		if (this.pointerDownHandler !== null && this.canvasParent !== null) {
			this.canvasParent.removeEventListener('pointerdown', this.pointerDownHandler);
			this.pointerDownHandler = null;
		}
		if (this.pointerUpHandler !== null && this.canvasParent !== null) {
			this.canvasParent.removeEventListener('pointerup', this.pointerUpHandler);
			this.canvasParent.removeEventListener('pointercancel', this.pointerUpHandler);
			this.pointerUpHandler = null;
		}
		this.canvasParent = null;
		this.callbacks = null;
	}

	// ============================== ПУБЛИЧНЫЙ ТАЧ-ИНТЕРФЕЙС ==============================

	public touchDirection(dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): void {
		if (this.callbacks === null) return;
		this.callbacks.unlockAudio();
		this.pressDirectionInternal(Direction[dir]);
	}

	public touchPause(): void {
		if (this.callbacks === null) return;
		this.callbacks.unlockAudio();
		const state = this.callbacks.getState();
		if (state === DirectorState.MENU || state === DirectorState.GAME_OVER) {
			this.onConfirm();
			return;
		}
		if (state === DirectorState.VICTORY) {
			this.callbacks.startEndless();
			return;
		}
		this.togglePause();
	}

	public touchMute(): void {
		if (this.callbacks === null) return;
		this.callbacks.unlockAudio();
		this.toggleMute();
	}

	// ============================== КЛАВИАТУРА ==============================

	private bindKeyboard(): void {
		this.keyDownHandler = (event: KeyboardEvent): void => {
			this.handleKeyDown(event);
		};
		window.addEventListener('keydown', this.keyDownHandler);
	}

	private handleKeyDown(event: KeyboardEvent): void {
		if (this.callbacks === null) return;
		this.callbacks.unlockAudio();
		const direction = InputConfig.KEY_TO_DIRECTION[event.code];
		if (direction !== undefined) {
			event.preventDefault();
			this.pressDirectionInternal(direction);
			return;
		}
		if (event.code === InputConfig.HOTKEYS.PAUSE || event.code === InputConfig.HOTKEYS.PAUSE_ALT) {
			event.preventDefault();
			this.togglePause();
			return;
		}
		if (event.code === InputConfig.HOTKEYS.CONFIRM) {
			event.preventDefault();
			this.onConfirm();
			return;
		}
		if (event.code === InputConfig.HOTKEYS.MUTE) {
			event.preventDefault();
			this.toggleMute();
		}
	}

	// ============================== ТАЧ / СВАЙПЫ ==============================

	private bindTouch(): void {
		if (this.canvasParent === null) return;
		this.pointerDownHandler = (event: PointerEvent): void => {
			if (this.callbacks === null) return;
			this.callbacks.unlockAudio();
			if (this.activePointerId !== null) return;
			this.activePointerId = event.pointerId;
			this.pointerStartX = event.clientX;
			this.pointerStartY = event.clientY;
		};
		this.pointerUpHandler = (event: PointerEvent): void => {
			if (event.pointerId !== this.activePointerId) return;
			this.activePointerId = null;
			this.handleSwipeOrTap(event);
		};
		this.canvasParent.addEventListener('pointerdown', this.pointerDownHandler);
		this.canvasParent.addEventListener('pointerup', this.pointerUpHandler);
		this.canvasParent.addEventListener('pointercancel', this.pointerUpHandler);
	}

	private handleSwipeOrTap(event: PointerEvent): void {
		const dx = event.clientX - this.pointerStartX;
		const dy = event.clientY - this.pointerStartY;
		const absX = Math.abs(dx);
		const absY = Math.abs(dy);
		if (absX >= InputConfig.SWIPE_THRESHOLD_PX || absY >= InputConfig.SWIPE_THRESHOLD_PX) {
			let direction: Direction;
			if (absX > absY) {
				direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
			} else {
				direction = dy > 0 ? Direction.DOWN : Direction.UP;
			}
			this.pressDirectionInternal(direction);
			return;
		}
		this.handleTap(event);
	}

	private handleTap(event: PointerEvent): void {
		if (this.callbacks === null) return;
		const state = this.callbacks.getState();
		if (state === DirectorState.MENU || state === DirectorState.GAME_OVER) {
			this.onConfirm();
			return;
		}
		if (state === DirectorState.VICTORY) {
			this.callbacks.startEndless();
			return;
		}
		if (state === DirectorState.PAUSED) {
			this.togglePause();
			return;
		}
		if (state !== DirectorState.PLAYING) return;
		if (this.canvasParent === null) return;
		const rect = this.canvasParent.getBoundingClientRect();
		const y = event.clientY - rect.top;
		const now = Date.now();
		if (y < rect.height * 0.18 && now - this.lastTapAt < 350) {
			this.lastTapAt = 0;
			this.togglePause();
			return;
		}
		this.lastTapAt = now;
	}

	// ============================== ОБЩАЯ ЛОГИКА СОСТОЯНИЙ ==============================

	private pressDirectionInternal(direction: Direction): void {
		if (this.callbacks === null) return;
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
		if (this.callbacks === null) return;
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
		if (this.callbacks === null) return;
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
		if (state === DirectorState.VICTORY) {
			this.callbacks.startEndless();
		}
	}

	private toggleMute(): void {
		this.muted = !this.muted;
		if (this.callbacks !== null) {
			this.callbacks.onMuteToggle(this.muted);
		}
	}
}