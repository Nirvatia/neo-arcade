// src/shared/core/types.ts
// Список игр живёт в $shared/config/games.ts.
// Здесь только контракт, который используют движки игр.

export interface GameModule {
	init(canvasParent: HTMLDivElement): Promise<void>;
	destroy(): void;
}