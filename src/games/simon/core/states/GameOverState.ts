import { saveScore } from '../../../../shared/utils/scoreStore';
import type { State, StateContext } from './State';
import type { SimonModel } from '../../logic/SimonModel';
import { SimonConsoleKind, SimonEvent } from '../Events';
import { SimonState, type SimonStateId } from '../SimonTypes';
import { MenuState } from './MenuState';

export class GameOverState implements State {
	private unsubStart: (() => void) | null = null;
	private unsubAck: (() => void) | null = null;

	constructor(private readonly model: SimonModel) {}

	get view(): SimonStateId {
		return SimonState.GameOver;
	}

	enter(ctx: StateContext): void {
		this.model.inputLocked = true;
		this.model.activePad = null;
		this.model.timerProgress = 0;
		this.model.orderText = 'Сеанс завершён.';
		this.model.statusText = 'Сеанс завершён из-за нарушений.';

		saveScore('simon', this.model.score);
		this.persistBest();

		ctx.events.emit(SimonEvent.ConsoleMessageReceived, {
			text: `Сеанс завершён. Результат: ${this.model.score} очков. Передано в отдел кадров.`,
			kind: SimonConsoleKind.Error
		});

		this.unsubStart = ctx.input.onStart(() => {
			ctx.director.setState(new MenuState(this.model));
		});
		this.unsubAck = ctx.input.onAcknowledge(() => {
			ctx.director.setState(new MenuState(this.model));
		});
	}

	update(): void {}

	exit(): void {
		this.unsubStart?.();
		this.unsubAck?.();
		this.unsubStart = null;
		this.unsubAck = null;
	}

	private persistBest(): void {
		if (typeof window === 'undefined') {
			return;
		}

		try {
			const current = window.localStorage.getItem('simon1c_best');
			const parsed = current === null ? 0 : Number.parseInt(current, 10);
			const existing = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
			if (this.model.best > existing) {
				window.localStorage.setItem('simon1c_best', String(this.model.best));
			}
		} catch {
			return;
		}
	}
}