import { GridModel } from '../logic/grid/GridModel';
import { PieceQueue } from '../logic/piece/PieceQueue';
import { ScoreModel } from '../logic/score/ScoreModel';
import { GamePhase } from './types';

export class GameModel {
	readonly grid = new GridModel();
	readonly queue = new PieceQueue();
	readonly score = new ScoreModel();
	phase: GamePhase = GamePhase.IDLE;
	gravityAccumulator = 0;
	lockAccumulator = 0;
	clearAccumulator = 0;
	clearingRows: number[] = [];
	forceLock = false;

	reset(): void {
		this.grid.reset();
		this.queue.reset();
		this.score.reset();
		this.phase = GamePhase.IDLE;
		this.gravityAccumulator = 0;
		this.lockAccumulator = 0;
		this.clearAccumulator = 0;
		this.clearingRows = [];
		this.forceLock = false;
	}
}