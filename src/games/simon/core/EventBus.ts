export type EventListener<TPayload> = (payload: TPayload) => void;

export class EventBus<TEventMap extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof TEventMap, Set<EventListener<never>>>();

  on<K extends keyof TEventMap>(event: K, listener: EventListener<TEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }

    const stored = listener as EventListener<never>;
    set.add(stored);

    return () => {
      set.delete(stored);
    };
  }

  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) {
      return;
    }

    for (const listener of set) {
      (listener as EventListener<TEventMap[K]>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}