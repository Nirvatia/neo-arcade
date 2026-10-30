import { writable } from 'svelte/store';
import type { PacmanDebugChannel, PacmanDebugLogPayload } from '../../core/Events';

export const DEV_CHANNELS: readonly PacmanDebugChannel[] = [
	'damage',
	'debuff',
	'boss',
	'state',
	'spawn',
	'input'
];

export interface DevLogLine extends PacmanDebugLogPayload {
	readonly id: number;
	/** Seconds since the page loaded. */
	readonly at: number;
	/** The game state when it happened. */
	readonly gameState: string;
}

const LIMIT = 500;
let nextId = 1;
let lines: DevLogLine[] = [];

/** The last `LIMIT` dev log lines, oldest first. */
export const devLog = writable<readonly DevLogLine[]>([]);

export function pushDevLog(line: PacmanDebugLogPayload, gameState: string): void {
	const at = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
	lines = [...lines.slice(-(LIMIT - 1)), { ...line, id: nextId++, at, gameState }];
	devLog.set(lines);
}

export function clearDevLog(): void {
	lines = [];
	devLog.set(lines);
}

/** Plain text of the given lines, for the clipboard. */
export function devLogText(list: readonly DevLogLine[]): string {
	return list
		.map(
			(l) =>
				`${l.at.toFixed(2)}\t${l.channel}\t${l.text}${l.value === undefined ? '' : `\t${l.value}`}\t[${l.gameState}]`
		)
		.join('\n');
}
