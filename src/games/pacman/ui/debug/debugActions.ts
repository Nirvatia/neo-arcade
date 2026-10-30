import { writable } from 'svelte/store';
import type { DebugController } from '../../core/debug/DebugController';

/** The running game's dev controller (dev build only); null when no game is mounted. */
export const debugController = writable<DebugController | null>(null);

/** The dev panels are shown (hotkey `` ` ``). */
export const debugVisible = writable(false);

export function setDebugController(next: DebugController): void {
	debugController.set(next);
}

export function clearDebugController(): void {
	debugController.set(null);
}

export function toggleDebugVisible(): void {
	debugVisible.update((v) => !v);
}
