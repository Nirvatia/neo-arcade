import type { State } from '../StateMachine.js';
import type { DirectorContext } from './types.js';
import { DirectorState } from '../Events.js';

export class VictoryState implements State<DirectorContext> {
	public readonly name = DirectorState.VICTORY;

	public enter(context: DirectorContext): void {
		context.gameLoop.stop();
		context.events.emit('director:stateChanged', {
			previous: DirectorState.PLAYING,
			current: DirectorState.VICTORY
		});
	}

	public exit(_context: DirectorContext): void {
		// Ничего не очищаем.
	}

	public update(_context: DirectorContext, _deltaMS: number): void {
		// Victory не обновляет логику.
	}
}