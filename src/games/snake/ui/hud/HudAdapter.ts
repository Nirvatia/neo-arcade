import type { SnakeHudState } from "./SnakeHudState";

export type HudUpdate = Omit<SnakeHudState, 'width'>;

export interface HudAdapter {
	update(state: HudUpdate): void;
	setWidth(width: number): void;
	destroy(): void;
}