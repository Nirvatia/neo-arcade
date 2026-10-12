import type { GameModel } from '../core/GameModel';

export interface System {
	update(dt: number, model: GameModel): void;
}