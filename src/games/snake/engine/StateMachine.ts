export interface State<TContext> {
	readonly name: string;
	enter(context: TContext): void;
	exit(context: TContext): void;
	update(context: TContext, deltaMS: number): void;
}

export class StateMachine<TContext> {
	private readonly states = new Map<string, State<TContext>>();
	private readonly transitions = new Map<string, Map<string, string>>();
	private currentState: State<TContext> | null = null;
	private readonly context: TContext;

	constructor(context: TContext) {
		this.context = context;
	}

	public addState(state: State<TContext>): void {
		this.states.set(state.name, state);
	}

	public addTransition(fromState: string, event: string, toState: string): void {
		let stateTransitions = this.transitions.get(fromState);

		if (stateTransitions === undefined) {
			stateTransitions = new Map<string, string>();
			this.transitions.set(fromState, stateTransitions);
		}

		stateTransitions.set(event, toState);
	}

	public start(stateName: string): void {
		const state = this.states.get(stateName);

		if (state === undefined) {
			throw new Error(`StateMachine: state "${stateName}" not registered.`);
		}

		this.currentState = state;
		state.enter(this.context);
	}

	public dispatch(event: string): void {
		if (this.currentState === null) {
			throw new Error('StateMachine: dispatch called before start().');
		}

		const stateTransitions = this.transitions.get(this.currentState.name);

		if (stateTransitions === undefined) {
			return;
		}

		const nextStateName = stateTransitions.get(event);

		if (nextStateName === undefined) {
			return;
		}

		const nextState = this.states.get(nextStateName);

		if (nextState === undefined) {
			throw new Error(
				`StateMachine: transition target "${nextStateName}" not registered.`
			);
		}

		this.currentState.exit(this.context);
		this.currentState = nextState;
		this.currentState.enter(this.context);
	}

	public get stateName(): string {
		if (this.currentState === null) {
			throw new Error('StateMachine: no current state.');
		}

		return this.currentState.name;
	}

	public is(stateName: string): boolean {
		return this.currentState !== null && this.currentState.name === stateName;
	}
}