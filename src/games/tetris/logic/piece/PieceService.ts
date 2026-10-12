import { GRID_COLS, SPAWN_Y } from '../../config/GridConfig';
import {
	HARD_DROP_SCORE_PER_CELL,
	SOFT_DROP_SCORE_PER_CELL
} from '../../config/GameplayConfig';
import { WALL_KICKS_I, WALL_KICKS_JLSTZ, type KickDirection } from '../../config/WallKickConfig';
import { GamePhase } from '../../core/types';
import { GridService } from '../grid/GridService';
import { PieceModel } from './PieceModel';
import type { GameModel } from '../../core/GameModel';
import type { PieceDefinition } from '../../config/PiecesConfig';

export class PieceService {
	static moveLeft(model: GameModel): boolean {
		const piece = model.queue.current;
		if (model.phase !== GamePhase.PLAYING || !piece) return false;
		if (GridService.isValidPosition(model.grid, piece.matrix, piece.x - 1, piece.y)) {
			piece.x -= 1;
			model.lockAccumulator = 0;
			return true;
		}
		return false;
	}

	static moveRight(model: GameModel): boolean {
		const piece = model.queue.current;
		if (model.phase !== GamePhase.PLAYING || !piece) return false;
		if (GridService.isValidPosition(model.grid, piece.matrix, piece.x + 1, piece.y)) {
			piece.x += 1;
			model.lockAccumulator = 0;
			return true;
		}
		return false;
	}

	static rotate(model: GameModel): boolean {
		const piece = model.queue.current;
		if (model.phase !== GamePhase.PLAYING || !piece) return false;
		const rotations = piece.definition.rotations;
		const nextRotation = (piece.rotationIndex + 1) % rotations.length;
		const nextMatrix = rotations[nextRotation];
		if (!nextMatrix) return false;
		if (piece.definition.type === 'O') {
			if (GridService.isValidPosition(model.grid, nextMatrix, piece.x, piece.y)) {
				piece.rotationIndex = nextRotation;
				model.lockAccumulator = 0;
				return true;
			}
			return false;
		}
		if (GridService.isValidPosition(model.grid, nextMatrix, piece.x, piece.y)) {
			piece.rotationIndex = nextRotation;
			model.lockAccumulator = 0;
			return true;
		}
		const kickTable = piece.definition.type === 'I' ? WALL_KICKS_I : WALL_KICKS_JLSTZ;
		const kickKey = `${piece.rotationIndex}->${nextRotation}` as KickDirection;
		const kicks = kickTable[kickKey];
		if (kicks) {
			for (const [dx, dy] of kicks) {
				if (GridService.isValidPosition(model.grid, nextMatrix, piece.x + dx, piece.y + dy)) {
					piece.x += dx;
					piece.y += dy;
					piece.rotationIndex = nextRotation;
					model.lockAccumulator = 0;
					return true;
				}
			}
		}
		return false;
	}

	static softDrop(model: GameModel): boolean {
		const piece = model.queue.current;
		if (model.phase !== GamePhase.PLAYING || !piece) return false;
		if (GridService.isValidPosition(model.grid, piece.matrix, piece.x, piece.y + 1)) {
			piece.y += 1;
			model.gravityAccumulator = 0;
			model.lockAccumulator = 0;
			model.score.score += SOFT_DROP_SCORE_PER_CELL;
			return true;
		}
		return false;
	}

	static hardDrop(model: GameModel): boolean {
		const piece = model.queue.current;
		if (model.phase !== GamePhase.PLAYING || !piece) return false;
		let distance = 0;
		while (GridService.isValidPosition(model.grid, piece.matrix, piece.x, piece.y + 1)) {
			piece.y += 1;
			distance++;
		}
		model.score.score += distance * HARD_DROP_SCORE_PER_CELL;
		model.forceLock = true;
		return true;
	}

	static hold(model: GameModel): void {
		if (model.phase !== GamePhase.PLAYING) return;
		const queue = model.queue;
		if (!queue.canHold || !queue.current) return;
		const currentDef = queue.current.definition;
		if (queue.held) {
			if (!PieceService.spawnSpecific(model, queue.held)) {
				model.phase = GamePhase.GAMEOVER;
				return;
			}
		} else {
			if (!PieceService.spawn(model)) {
				model.phase = GamePhase.GAMEOVER;
				return;
			}
		}
		queue.held = currentDef;
		queue.canHold = false;
		model.lockAccumulator = 0;
	}

	static spawn(model: GameModel): boolean {
		const queue = model.queue;
		const definition = queue.next.shift();
		if (!definition) return false;
		queue.next.push(queue.factory.next());
		return PieceService.spawnSpecific(model, definition);
	}

	static lock(model: GameModel): boolean {
		const piece = model.queue.current;
		if (!piece) return false;
		const aboveVisibleField = GridService.lockPiece(model.grid, piece);
		model.queue.current = null;
		return aboveVisibleField;
	}

	private static spawnSpecific(model: GameModel, definition: PieceDefinition): boolean {
		const matrix = definition.rotations[0];
		if (!matrix) {
			throw new Error('[PieceService] Piece definition has no base rotation');
		}
		const x = Math.floor(GRID_COLS / 2) - Math.floor(matrix[0].length / 2);
		const y = SPAWN_Y;
		const blockedAtSpawn =
			!GridService.isValidPosition(model.grid, matrix, x, y) ||
			!GridService.isValidPosition(model.grid, matrix, x, y + 1);
		if (blockedAtSpawn) {
			model.queue.current = null;
			return false;
		}
		model.queue.current = new PieceModel(definition, x, y);
		model.gravityAccumulator = 0;
		model.lockAccumulator = 0;
		model.queue.canHold = true;
		return true;
	}
}