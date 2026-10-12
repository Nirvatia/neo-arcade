import { TetrisCommand } from '../core/types';
import { PieceService } from '../logic/piece/PieceService';
import type { GameModel } from '../core/GameModel';

export class InputSystem {
	constructor(private readonly model: GameModel) {}

	handle(command: TetrisCommand): void {
		switch (command) {
			case TetrisCommand.MOVE_LEFT:
				PieceService.moveLeft(this.model);
				break;
			case TetrisCommand.MOVE_RIGHT:
				PieceService.moveRight(this.model);
				break;
			case TetrisCommand.ROTATE:
				PieceService.rotate(this.model);
				break;
			case TetrisCommand.SOFT_DROP:
				PieceService.softDrop(this.model);
				break;
			case TetrisCommand.HARD_DROP:
				PieceService.hardDrop(this.model);
				break;
			case TetrisCommand.HOLD:
				PieceService.hold(this.model);
				break;
			default:
				break;
		}
	}
}