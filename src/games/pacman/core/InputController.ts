export type InputDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface InputHandlers {
	direction?: (direction: InputDirection) => void;
	confirm?: () => void;
	fire?: () => void;
	pause?: () => void;
	menu?: () => void;
	profile?: () => void;
	/** Dev hotkeys: `` ` `` shows the dev panels, F8 steps one frame. */
	debugToggle?: () => void;
	debugStep?: () => void;
}

const DIRECTION_KEYS: Record<string, InputDirection> = {
	ArrowUp: 'UP',
	KeyW: 'UP',
	ArrowDown: 'DOWN',
	KeyS: 'DOWN',
	ArrowLeft: 'LEFT',
	KeyA: 'LEFT',
	ArrowRight: 'RIGHT',
	KeyD: 'RIGHT'
};

export class InputController {
	private readonly handlers: InputHandlers;
	private attached = false;
	/** Direction keys held down, the latest pressed last. */
	private held: InputDirection[] = [];

	constructor(handlers: InputHandlers) {
		this.handlers = handlers;
	}

	attach(): void {
		if (this.attached) {
			return;
		}
		if (typeof window === 'undefined') {
			console.error('InputController.attach', 'window is unavailable');
			return;
		}
		window.addEventListener('keydown', this.handleKeyDown);
		window.addEventListener('keyup', this.handleKeyUp);
		window.addEventListener('blur', this.releaseAll);
		this.attached = true;
	}

	detach(): void {
		if (!this.attached) {
			return;
		}
		if (typeof window === 'undefined') {
			this.attached = false;
			return;
		}
		window.removeEventListener('keydown', this.handleKeyDown);
		window.removeEventListener('keyup', this.handleKeyUp);
		window.removeEventListener('blur', this.releaseAll);
		this.held = [];
		this.attached = false;
	}

	/**
	 * The direction key held down most recently, or null. Applied every frame, so a held key
	 * steers even when its press fell into a pause, a death or a fade, and releasing the
	 * latest key falls back to one still held.
	 */
	get heldDirection(): InputDirection | null {
		return this.held.length > 0 ? this.held[this.held.length - 1] : null;
	}

	pressDirection(direction: InputDirection): void {
		this.handlers.direction?.(direction);
	}

	pressConfirm(): void {
		this.handlers.confirm?.();
	}

	pressFire(): void {
		this.handlers.fire?.();
	}

	pressPause(): void {
		this.handlers.pause?.();
	}

	pressMenu(): void {
		this.handlers.menu?.();
	}

	pressProfile(): void {
		this.handlers.profile?.();
	}

	private handleKeyDown = (event: KeyboardEvent): void => {
		if (event.repeat) {
			if (DIRECTION_KEYS[event.code]) {
				event.preventDefault();
			}
			return;
		}
		const direction = DIRECTION_KEYS[event.code];
		if (direction) {
			this.held = this.held.filter((d) => d !== direction);
			this.held.push(direction);
		}
		switch (event.code) {
			case 'ArrowUp':
			case 'KeyW':
				event.preventDefault();
				this.pressDirection('UP');
				break;
			case 'ArrowDown':
			case 'KeyS':
				event.preventDefault();
				this.pressDirection('DOWN');
				break;
			case 'ArrowLeft':
			case 'KeyA':
				event.preventDefault();
				this.pressDirection('LEFT');
				break;
			case 'ArrowRight':
			case 'KeyD':
				event.preventDefault();
				this.pressDirection('RIGHT');
				break;
			case 'Enter':
				event.preventDefault();
				this.pressConfirm();
				break;
			case 'ShiftLeft':
			case 'ShiftRight':
			case 'KeyF':
				event.preventDefault();
				this.pressFire();
				break;
			case 'Space':
			case 'KeyP':
				event.preventDefault();
				this.pressPause();
				break;
			case 'Escape':
				event.preventDefault();
				this.pressMenu();
				break;
			case 'KeyM':
				event.preventDefault();
				this.pressProfile();
				break;
			case 'Backquote':
				if (this.handlers.debugToggle) {
					event.preventDefault();
					this.handlers.debugToggle();
				}
				break;
			case 'F8':
				if (this.handlers.debugStep) {
					event.preventDefault();
					this.handlers.debugStep();
				}
				break;
			default:
				break;
		}
	};

	private handleKeyUp = (event: KeyboardEvent): void => {
		const direction = DIRECTION_KEYS[event.code];
		if (!direction) {
			return;
		}
		// another key for the same direction may still be down (W and ArrowUp): rare, ignored
		this.held = this.held.filter((d) => d !== direction);
	};

	private releaseAll = (): void => {
		this.held = [];
	};
}
