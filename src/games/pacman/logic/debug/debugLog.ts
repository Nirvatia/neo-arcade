import type { EventBus } from '../../engine/EventBus';
import type { PacmanDebugChannel, PacmanEventMap } from '../../core/Events';

/**
 * Sends one line to the dev log panel (`debug:log` on the bus). Compiled out of production
 * builds: `import.meta.env.DEV` is false there and the call does nothing.
 */
export function debugLog(
	events: EventBus<PacmanEventMap>,
	channel: PacmanDebugChannel,
	text: string,
	value?: number
): void {
	if (!import.meta.env.DEV) {
		return;
	}
	events.emit('debug:log', { channel, text, value });
}
