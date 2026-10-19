export type InputDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface InputHandlers {
	direction?: (direction: InputDirection) => void;
	confirm?: () => void;
	pause?: () => void;
	menu?: () => void;
	profile?: () => void;
}

export class InputController {
	private readonly handlers: InputHandlers;
	private attached = false;

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
		this.attached = false;
	}

	pressDirection(direction: InputDirection): void {
		this.handlers.direction?.(direction);
	}

	pressConfirm(): void {
		this.handlers.confirm?.();
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
			return;
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
			default:
				break;
		}
	};
}