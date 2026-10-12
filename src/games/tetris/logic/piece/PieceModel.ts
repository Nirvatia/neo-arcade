// src/games/tetris/logic/piece/PieceModel.ts
import type { PieceDefinition, PieceMatrix } from '../../config/PiecesConfig';

export class PieceModel {
	public rotationIndex = 0;

	constructor(
		public readonly definition: PieceDefinition,
		public x: number,
		public y: number
	) {}

	get matrix(): PieceMatrix {
		return this.definition.rotations[this.rotationIndex];
	}
}