import { LOCK_DELAY_MS } from '../config/GameplayConfig';
import { GridService } from '../logic/grid/GridService';
import type { GameModel } from '../core/GameModel';
import type { System } from './types';

export class LockSystem implements System {
	update(dt: number, model: GameModel): boolean {
		const piece = model.queue.current;
		if (!piece) return false;
		const canMoveDown = GridService.isValidPosition(
			model.grid,
			piece.matrix,
			piece.x,
			piece.y + 1
		);
		if (canMoveDown) {
			model.lockAccumulator = 0;
			return false;
		}
		model.lockAccumulator += dt;
		return model.lockAccumulator >= LOCK_DELAY_MS;
	}
}