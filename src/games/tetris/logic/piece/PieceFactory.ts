// src/games/tetris/logic/piece/PieceFactory.ts
import { ALL_PIECE_TYPES, PIECES } from '../../config/PiecesConfig';
import type { PieceDefinition, PieceType } from '../../config/PiecesConfig';

export class PieceFactory {
	private bag: PieceType[] = [];

	next(): PieceDefinition {
		if (this.bag.length === 0) {
			this.refillBag();
		}

		const type = this.bag.pop();

		if (!type) {
			throw new Error('[PieceFactory] Bag is empty after refill');
		}

		const definition = PIECES[type];

		if (!definition) {
			throw new Error(`[PieceFactory] Unknown piece type: ${type}`);
		}

		return definition;
	}

	private refillBag(): void {
		this.bag = [...ALL_PIECE_TYPES];

		for (let i = this.bag.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
		}
	}
}