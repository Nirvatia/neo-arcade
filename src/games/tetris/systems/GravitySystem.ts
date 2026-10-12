import { gravityInterval } from '../config/GameplayConfig';
import { GridService } from '../logic/grid/GridService';
import type { GameModel } from '../core/GameModel';
import type { System } from './types';

export class GravitySystem implements System {
	update(dt: number, model: GameModel): void {
		const piece = model.queue.current;
		if (!piece) return;
		model.gravityAccumulator += dt;
		const interval = gravityInterval(model.score.level);
		if (model.gravityAccumulator >= interval) {
			model.gravityAccumulator -= interval;
			if (GridService.isValidPosition(model.grid, piece.matrix, piece.x, piece.y + 1)) {
				piece.y += 1;
				model.lockAccumulator = 0;
			}
		}
	}
}