import type { EventBus } from './EventBus';
import type { SimonEventPayloads } from './Events';
import type { InputController } from './InputController';
import type { State, StateContext } from './states/State';

export class Director {
	private currentState: State | null = null;

	constructor(
		private readonly events: EventBus<SimonEventPayloads>,
		private readonly input: InputController
	) {}

	setState(nextState: State): void {
		if (this.currentState) {
			this.currentState.exit(this.createContext(0));
		}
		this.currentState = nextState;
		this.currentState.enter(this.createContext(0));
	}

	update(deltaMs: number): void {
		if (!this.currentState) {
			return;
		}
		this.currentState.update(this.createContext(deltaMs));
	}

	getCurrentState(): State | null {
		return this.currentState;
	}

	private createContext(deltaMs: number): StateContext {
		return {
			director: this,
			events: this.events,
			input: this.input,
			deltaMs
		};
	}
}