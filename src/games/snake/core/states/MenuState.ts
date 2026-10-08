import type { State } from '../../engine/StateMachine.js';
import type { DirectorContext } from './types.js';
import { DirectorState } from '../Events.js';

export class MenuState implements State<DirectorContext> {
	public readonly name = DirectorState.MENU;

	public enter(context: DirectorContext): void {
		context.gameLoop.stop();
		context.events.emit('director:stateChanged', {
			previous: DirectorState.MENU,
			current: DirectorState.MENU
		});
	}

	public exit(_context: DirectorContext): void {
		// Ничего не очищаем.
	}

	public update(_context: DirectorContext, _deltaMS: number): void {
		// Меню не обновляет логику.
	}
}