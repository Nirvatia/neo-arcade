import type { State } from '../StateMachine.js';
import type { DirectorContext } from './types.js';
import { DirectorState } from '../Events.js';

export class PausedState implements State<DirectorContext> {
	public readonly name = DirectorState.PAUSED;

	public enter(context: DirectorContext): void {
		context.gameLoop.pause();
		context.events.emit('director:stateChanged', {
			previous: DirectorState.PLAYING,
			current: DirectorState.PAUSED
		});
	}

	public exit(_context: DirectorContext): void {
		// Ничего не очищаем.
	}

	public update(_context: DirectorContext, _deltaMS: number): void {
		// Пауза не обновляет логику.
	}
}