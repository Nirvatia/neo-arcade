export type EventHandler<TPayload> = (payload: TPayload) => void;

export class EventBus<TEventMap extends Record<string, unknown>> {
	private readonly handlers = new Map<keyof TEventMap, Set<EventHandler<unknown>>>();

	on<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): () => void {
		let set = this.handlers.get(event);
		if (!set) {
			set = new Set();
			this.handlers.set(event, set);
		}
		set.add(handler as unknown as EventHandler<unknown>);
		return () => {
			this.off(event, handler);
		};
	}

	off<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void {
		const set = this.handlers.get(event);
		if (!set) {
			return;
		}
		set.delete(handler as unknown as EventHandler<unknown>);
		if (set.size === 0) {
			this.handlers.delete(event);
		}
	}

	emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void {
		const set = this.handlers.get(event);
		if (!set) {
			return;
		}
		for (const handler of Array.from(set)) {
			try {
				handler(payload);
			} catch (error: unknown) {
				console.error('EventBus.emit', String(event), error);
			}
		}
	}

	clear(): void {
		this.handlers.clear();
	}
}