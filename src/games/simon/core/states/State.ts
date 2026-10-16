import type { Director } from '../Director';
import type { EventBus } from '../EventBus';
import type { SimonEventPayloads } from '../Events';
import type { InputController } from '../InputController';
import type { SimonStateId } from '../SimonTypes';

export interface StateContext {
	director: Director;
	events: EventBus<SimonEventPayloads>;
	input: InputController;
	deltaMs: number;
}

export interface State {
	readonly view: SimonStateId;
	enter(ctx: StateContext): void;
	update(ctx: StateContext): void;
	exit(ctx: StateContext): void;
}