export interface StateTransition<TState extends string, TEvent extends string> {
  from: TState;
  event: TEvent;
  to: TState;
}

export class StateMachine<TState extends string, TEvent extends string> {
  private readonly transitions = new Map<TState, Map<TEvent, TState>>();
  private current: TState;

  constructor(initial: TState, transitions: ReadonlyArray<StateTransition<TState, TEvent>>) {
    this.current = initial;

    for (const transition of transitions) {
      let byEvent = this.transitions.get(transition.from);
      if (!byEvent) {
        byEvent = new Map();
        this.transitions.set(transition.from, byEvent);
      }

      if (byEvent.has(transition.event)) {
        throw new Error(
          `[StateMachine] Duplicate transition from ${transition.from} on ${transition.event}`
        );
      }

      byEvent.set(transition.event, transition.to);
    }
  }

  get state(): TState {
    return this.current;
  }

  can(event: TEvent): boolean {
    return Boolean(this.transitions.get(this.current)?.has(event));
  }

  dispatch(event: TEvent): TState {
    const next = this.transitions.get(this.current)?.get(event);

    if (!next) {
      throw new Error(`[StateMachine] Illegal transition from ${this.current} on ${event}`);
    }

    this.current = next;
    return this.current;
  }
}