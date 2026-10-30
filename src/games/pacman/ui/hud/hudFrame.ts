import { writable } from 'svelte/store';
import type { HudSnapshot } from './hudSnapshot';
import type { ScreenActions } from '../screens/screenActions';

/** The running game's HUD snapshot, refreshed every frame; null when no game is mounted. */
export const hudFrame = writable<HudSnapshot | null>(null);

/** What the screens' buttons do in the running game. */
export const screenActions = writable<ScreenActions | null>(null);
