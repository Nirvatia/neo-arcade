import { GridModel } from '../logic/grid/GridModel';
import { GridService } from '../logic/grid/GridService';
import { PieceFactory } from '../logic/piece/PieceFactory';
import { PieceModel } from '../logic/piece/PieceModel';
import { MIN_LEVEL, SOFT_DROP_SCORE_PER_CELL, HARD_DROP_SCORE_PER_CELL } from '../config/GameplayConfig';
import { GRID_COLS, SPAWN_Y } from '../config/GridConfig';
import { WALL_KICKS_I, WALL_KICKS_JLSTZ, type KickDirection } from '../config/WallKickConfig';
import { GamePhase } from './types';
import type { PieceDefinition } from '../config/PiecesConfig';

export class GameContext {
	grid = new GridModel();
	pieceFactory = new PieceFactory();
	currentPiece: PieceModel | null = null;
	nextQueue: PieceDefinition[] = [];
	heldPiece: PieceDefinition | null = null;
	score = 0;
	lines = 0;
	level = MIN_LEVEL;
	phase: GamePhase = GamePhase.IDLE;
	gravityAccumulator = 0;
	clearAccumulator = 0;
	lockAccumulator = 0;
	clearingRows: number[] = [];
	canHold = true;
	forceLock = false;

	reset(): void {
		this.grid.reset();
		this.score = 0;
		this.lines = 0;
		this.level = MIN_LEVEL;
		this.currentPiece = null;
		this.nextQueue = [];
		for (let i = 0; i < 4; i++) {
			this.nextQueue.push(this.pieceFactory.next());
		}
		this.heldPiece = null;
		this.gravityAccumulator = 0;
		this.clearAccumulator = 0;
		this.lockAccumulator = 0;
		this.clearingRows = [];
		this.canHold = true;
		this.forceLock = false;
	}

	moveLeft(): boolean {
		if (this.phase !== GamePhase.PLAYING || !this.currentPiece) return false;
		if (GridService.isValidPosition(this.grid, this.currentPiece.matrix, this.currentPiece.x - 1, this.currentPiece.y)) {
			this.currentPiece.x -= 1;
			this.lockAccumulator = 0;
			return true;
		}
		return false;
	}

	moveRight(): boolean {
		if (this.phase !== GamePhase.PLAYING || !this.currentPiece) return false;
		if (GridService.isValidPosition(this.grid, this.currentPiece.matrix, this.currentPiece.x + 1, this.currentPiece.y)) {
			this.currentPiece.x += 1;
			this.lockAccumulator = 0;
			return true;
		}
		return false;
	}

	rotate(): boolean {
		if (this.phase !== GamePhase.PLAYING || !this.currentPiece) return false;
		const piece = this.currentPiece;
		const rotations = piece.definition.rotations;
		const nextRotation = (piece.rotationIndex + 1) % rotations.length;
		const nextMatrix = rotations[nextRotation];
		if (!nextMatrix) return false;
		if (piece.definition.type === 'O') {
			if (GridService.isValidPosition(this.grid, nextMatrix, piece.x, piece.y)) {
				piece.rotationIndex = nextRotation;
				this.lockAccumulator = 0;
				return true;
			}
			return false;
		}
		const kickTable = piece.definition.type === 'I' ? WALL_KICKS_I : WALL_KICKS_JLSTZ;
		const kickKey = `${piece.rotationIndex}->${nextRotation}` as KickDirection;
		const kicks = kickTable[kickKey];
		if (GridService.isValidPosition(this.grid, nextMatrix, piece.x, piece.y)) {
			piece.rotationIndex = nextRotation;
			this.lockAccumulator = 0;
			return true;
		}
		if (kicks) {
			for (const [dx, dy] of kicks) {
				if (GridService.isValidPosition(this.grid, nextMatrix, piece.x + dx, piece.y + dy)) {
					piece.x += dx;
					piece.y += dy;
					piece.rotationIndex = nextRotation;
					this.lockAccumulator = 0;
					return true;
				}
			}
		}
		return false;
	}

	softDrop(): boolean {
		if (this.phase !== GamePhase.PLAYING || !this.currentPiece) return false;
		if (GridService.isValidPosition(this.grid, this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y + 1)) {
			this.currentPiece.y += 1;
			this.gravityAccumulator = 0;
			this.lockAccumulator = 0;
			this.score += SOFT_DROP_SCORE_PER_CELL;
			return true;
		}
		return false;
	}

	hardDrop(): boolean {
		if (this.phase !== GamePhase.PLAYING || !this.currentPiece) return false;
		let distance = 0;
		while (GridService.isValidPosition(this.grid, this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y + 1)) {
			this.currentPiece.y += 1;
			distance++;
		}
		this.score += distance * HARD_DROP_SCORE_PER_CELL;
		this.forceLock = true;
		return true;
	}

	holdPiece(): void {
		if (!this.canHold || !this.currentPiece) return;
		const currentDef = this.currentPiece.definition;
		if (this.heldPiece) {
			if (!this.spawnSpecificPiece(this.heldPiece)) {
				this.phase = GamePhase.GAMEOVER;
				return;
			}
		} else {
			if (!this.spawnPiece()) {
				this.phase = GamePhase.GAMEOVER;
				return;
			}
		}
		this.heldPiece = currentDef;
		this.canHold = false;
		this.lockAccumulator = 0;
	}

	lockPiece(): boolean {
		if (!this.currentPiece) return false;
		const aboveVisibleField = GridService.lockPiece(this.grid, this.currentPiece);
		this.currentPiece = null;
		return aboveVisibleField;
	}

	spawnPiece(): boolean {
		const definition = this.nextQueue.shift();
		if (!definition) return false;
		this.nextQueue.push(this.pieceFactory.next());
		return this.spawnSpecificPiece(definition);
	}

	private spawnSpecificPiece(definition: PieceDefinition): boolean {
		const matrix = definition.rotations[0];
		if (!matrix) {
			throw new Error('[Tetris] Piece definition has no base rotation');
		}
		const x = Math.floor(GRID_COLS / 2) - Math.floor(matrix[0].length / 2);
		const y = SPAWN_Y;
		const blockedAtSpawn =
			!GridService.isValidPosition(this.grid, matrix, x, y) ||
			!GridService.isValidPosition(this.grid, matrix, x, y + 1);
		if (blockedAtSpawn) {
			this.currentPiece = null;
			return false;
		}
		this.currentPiece = new PieceModel(definition, x, y);
		this.gravityAccumulator = 0;
		this.lockAccumulator = 0;
		this.canHold = true;
		return true;
	}
}