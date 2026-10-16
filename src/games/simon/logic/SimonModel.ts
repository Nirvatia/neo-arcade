import type {
	SimonDifficultyId,
	SimonFailureReasonId,
	SimonModeId,
	SimonPadId
} from '../core/SimonTypes';

export class SimonModel {
	mode: SimonModeId = 'ORDERS';
	difficulty: SimonDifficultyId = 'EASY';
	round = 1;
	score = 0;
	best = 0;
	combo = 0;
	lives = 3;
	level = 1;
	activePad: SimonPadId | null = null;
	inputLocked = true;
	failureReason: SimonFailureReasonId | null = null;
	failureMessage: string | null = null;
	orderText = 'Нажмите «Начать смену», чтобы приступить.';
	orderSay = false;
	orderPad: SimonPadId | null = null;
	timerProgress = 0;
	statusText = 'Готово';
	lastFeedbackMessage = '';

	resetRun(): void {
		this.round = 1;
		this.score = 0;
		this.combo = 0;
		this.lives = 3;
		this.level = 1;
		this.activePad = null;
		this.inputLocked = true;
		this.failureReason = null;
		this.failureMessage = null;
		this.orderText = '';
		this.orderSay = false;
		this.orderPad = null;
		this.timerProgress = 0;
		this.statusText = 'Готово';
		this.lastFeedbackMessage = '';
	}

	addScore(delta: number): void {
		const safe = Number.isFinite(delta) && delta > 0 ? Math.floor(delta) : 0;
		this.score += safe;
		if (this.score > this.best) {
			this.best = this.score;
		}
	}

	loseLife(): void {
		this.lives = Math.max(0, this.lives - 1);
		this.combo = 0;
	}

	get isDead(): boolean {
		return this.lives <= 0;
	}
}