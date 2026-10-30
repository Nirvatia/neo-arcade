import type { EventBus } from '../../engine/EventBus';
import type { PacmanDebugChannel, PacmanEventMap } from '../../core/Events';

/** A logic service's way to the dev log when it has no bus of its own. */
export type DebugSink = (channel: PacmanDebugChannel, text: string, value?: number) => void;

/** The sink of a service nobody listens to (tests, production). */
export const NO_DEBUG: DebugSink = () => {};

/** A sink that writes to the bus (dev builds only, like `debugLog`). */
export function busSink(events: EventBus<PacmanEventMap>): DebugSink {
	return (channel, text, value) => debugLog(events, channel, text, value);
}

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
