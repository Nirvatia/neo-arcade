export type EventCallback<T> = (payload: T) => void;
type StoredCallback = (payload: unknown) => void;

export class EventBus<EventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof EventMap, Set<StoredCallback>>();

  public on<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>,
  ): void {
    let set = this.listeners.get(event);
    if (set === undefined) {
      set = new Set<StoredCallback>();
      this.listeners.set(event, set);
    }
    set.add(callback as StoredCallback);
  }

  public off<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>,
  ): void {
    const set = this.listeners.get(event);
    if (set === undefined) {
      return;
    }
    set.delete(callback as StoredCallback);
  }

  // Синхронная доставка: детерминизм и тестируемость важнее асинхронности.
  public emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (set === undefined || set.size === 0) {
      return;
    }
    const snapshot = Array.from(set);
    for (const callback of snapshot) {
      callback(payload);
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}