import type { TetrisEvent } from '../core/Events';

export type EventHandler = (payload?: unknown) => void;

export class EventBus {
	private handlers = new Map<TetrisEvent, Set<EventHandler>>();

	on(event: TetrisEvent, handler: EventHandler): () => void {
		let set = this.handlers.get(event);
		if (!set) {
			set = new Set<EventHandler>();
			this.handlers.set(event, set);
		}
		const target = set;
		target.add(handler);
		return () => {
			target.delete(handler);
		};
	}

	emit(event: TetrisEvent, payload?: unknown): void {
		const set = this.handlers.get(event);
		if (!set) return;
		for (const handler of set) {
			handler(payload);
		}
	}

	clear(): void {
		this.handlers.clear();
	}
}

export const tetrisBus = new EventBus();