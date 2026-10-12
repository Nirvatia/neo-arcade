import { TetrisCommand } from './types';
import type { Director } from './Director';
import type { InputSystem } from '../systems/InputSystem';

export class InputController {
	private readonly abortController = new AbortController();

	constructor(
		private readonly director: Director,
		private readonly inputSystem: InputSystem
	) {}

	attach(): void {
		window.addEventListener('keydown', this.handleKeydown, {
			signal: this.abortController.signal
		});
	}

	destroy(): void {
		this.abortController.abort();
	}

	private handleKeydown = (event: KeyboardEvent): void => {
		switch (event.code) {
			case 'Enter':
			case 'KeyR':
				event.preventDefault();
				this.director.start();
				break;
			case 'Escape':
			case 'KeyP':
				event.preventDefault();
				this.director.togglePause();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				this.inputSystem.handle(TetrisCommand.MOVE_LEFT);
				break;
			case 'ArrowRight':
				event.preventDefault();
				this.inputSystem.handle(TetrisCommand.MOVE_RIGHT);
				break;
			case 'ArrowUp':
			case 'KeyX':
				event.preventDefault();
				this.inputSystem.handle(TetrisCommand.ROTATE);
				break;
			case 'ArrowDown':
				event.preventDefault();
				this.inputSystem.handle(TetrisCommand.SOFT_DROP);
				break;
			case 'Space':
				event.preventDefault();
				this.inputSystem.handle(TetrisCommand.HARD_DROP);
				break;
			case 'ShiftLeft':
			case 'ShiftRight':
			case 'KeyC':
				event.preventDefault();
				this.inputSystem.handle(TetrisCommand.HOLD);
				break;
			default:
				break;
		}
	};
}