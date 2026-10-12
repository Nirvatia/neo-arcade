import { PieceFactory } from './PieceFactory';
import { PieceModel } from './PieceModel';
import type { PieceDefinition } from '../../config/PiecesConfig';

const QUEUE_SIZE = 4;

export class PieceQueue {
	readonly factory = new PieceFactory();
	current: PieceModel | null = null;
	next: PieceDefinition[] = [];
	held: PieceDefinition | null = null;
	canHold = true;

	reset(): void {
		this.current = null;
		this.next = [];
		this.held = null;
		this.canHold = true;
		for (let i = 0; i < QUEUE_SIZE; i++) {
			this.next.push(this.factory.next());
		}
	}
}