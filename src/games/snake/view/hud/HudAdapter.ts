import type { SnakeHudState } from '../../ui/SnakeHudState.js';

export type HudUpdate = Omit<SnakeHudState, 'width'>;

export interface HudAdapter {
	update(state: HudUpdate): void;
	setWidth(width: number): void;
	destroy(): void;
}