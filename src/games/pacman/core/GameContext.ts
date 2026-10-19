import { GridModel } from '../logic/GridModel';
import { GridService } from '../logic/GridService';

export class GameContext {
	private gridService: GridService | null = null;
	private remainingDotsValue = 0;

	get grid(): GridService | null {
		return this.gridService;
	}

	get remainingDots(): number {
		return this.remainingDotsValue;
	}

	ensureGrid(): GridService {
		if (!this.gridService) {
			const model = new GridModel();
			this.gridService = new GridService(model);
			this.setRemainingDots(model.dotCount);
		}
		return this.gridService;
	}

	setRemainingDots(value: number): void {
		if (!Number.isFinite(value) || value < 0) {
			console.error('GameContext.setRemainingDots', 'invalid remaining dots', value);
			this.remainingDotsValue = 0;
			return;
		}
		this.remainingDotsValue = Math.floor(value);
	}

	clear(): void {
		this.gridService = null;
		this.remainingDotsValue = 0;
	}
}