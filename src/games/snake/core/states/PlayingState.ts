import type { State } from '../StateMachine.js';
import type { DirectorContext } from './types.js';
import { DirectorState } from '../Events.js';

export class PlayingState implements State<DirectorContext> {
	public readonly name = DirectorState.PLAYING;
	private previousState: string = DirectorState.MENU;

	public setPrevious(state: string): void {
		this.previousState = state;
	}

	public enter(context: DirectorContext): void {
		context.gameLoop.start();
		context.gameLoop.resume();
		context.events.emit('director:stateChanged', {
			previous: this.previousState as never,
			current: DirectorState.PLAYING
		});
	}

	public exit(_context: DirectorContext): void {
		// Ничего не очищаем.
	}

	public update(_context: DirectorContext, _deltaMS: number): void {
		// Логика обновляется через GameLoop → World.
	}
}