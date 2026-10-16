import type { State, StateContext } from './State';
import type { SimonModel } from '../../logic/SimonModel';
import {
	createSuccessMessage,
	generateOrder,
	getPadLabel,
	type SimonOrder
} from '../../logic/OrderGenerator';
import {
	SimonConsoleKind,
	SimonEvent,
	type SimonConsoleKindId
} from '../Events';
import {
	SimonFailureReason,
	SimonMode,
	SimonState,
	type SimonFailureReasonId,
	type SimonPadId,
	type SimonStateId
} from '../SimonTypes';
import { GameOverState } from './GameOverState';

const OrdersPhase = {
	Issuing: 'ISSUING',
	Awaiting: 'AWAITING',
	Feedback: 'FEEDBACK',
	Failure: 'FAILURE'
} as const;
type OrdersPhaseId = (typeof OrdersPhase)[keyof typeof OrdersPhase];

export class OrdersState implements State {
	private phase: OrdersPhaseId = OrdersPhase.Issuing;
	private order: SimonOrder | null = null;
	private issueTimerMs = 0;
	private elapsedMs = 0;
	private feedbackTimerMs = 0;
	private inputQueue: SimonPadId[] = [];
	private skipRequested = false;
	private manualActivePad: SimonPadId | null = null;
	private manualActiveTimerMs = 0;
	private unsubPad: (() => void) | null = null;
	private unsubSkip: (() => void) | null = null;
	private unsubAck: (() => void) | null = null;

	constructor(private readonly model: SimonModel) {}

	get view(): SimonStateId {
		switch (this.phase) {
			case OrdersPhase.Issuing:
				return SimonState.OrdersIssuing;
			case OrdersPhase.Awaiting:
				return SimonState.OrdersAwaiting;
			case OrdersPhase.Feedback:
				return SimonState.OrdersFeedback;
			case OrdersPhase.Failure:
				return SimonState.FailureOrders;
		}
	}

	enter(ctx: StateContext): void {
		this.model.resetRun();
		this.model.mode = SimonMode.Orders;
		this.model.statusText = 'Сеанс активен. 1С наблюдает за вами.';
		this.emitConsole(
			ctx,
			'Смена начата. Ожидайте приказов от 1С…',
			SimonConsoleKind.Command
		);

		this.beginIssuing();

		this.unsubPad = ctx.input.onPadPress((pad) => {
			this.handlePadPress(ctx, pad);
		});
		this.unsubSkip = ctx.input.onSkip(() => {
			this.handleSkip();
		});
		this.unsubAck = ctx.input.onAcknowledge(() => {
			this.handleAcknowledge(ctx);
		});
	}

	update(ctx: StateContext): void {
		this.updateManualActive(ctx.deltaMs);

		switch (this.phase) {
			case OrdersPhase.Issuing:
				this.updateIssuing(ctx);
				break;
			case OrdersPhase.Awaiting:
				this.updateAwaiting(ctx);
				break;
			case OrdersPhase.Feedback:
				this.updateFeedback(ctx);
				break;
			case OrdersPhase.Failure:
				break;
		}
	}

	exit(): void {
		this.unsubPad?.();
		this.unsubSkip?.();
		this.unsubAck?.();
		this.unsubPad = null;
		this.unsubSkip = null;
		this.unsubAck = null;
	}

	private beginIssuing(): void {
		this.phase = OrdersPhase.Issuing;
		this.order = null;
		this.issueTimerMs = 0;
		this.elapsedMs = 0;
		this.feedbackTimerMs = 0;
		this.inputQueue = [];
		this.skipRequested = false;
		this.manualActivePad = null;
		this.manualActiveTimerMs = 0;

		this.model.inputLocked = true;
		this.model.activePad = null;
		this.model.orderText = 'Ожидание приказа…';
		this.model.orderSay = false;
		this.model.orderPad = null;
		this.model.timerProgress = 0;
		this.model.failureReason = null;
		this.model.failureMessage = null;
		this.model.statusText = 'Ожидание приказа…';
	}

	private updateIssuing(ctx: StateContext): void {
		this.issueTimerMs += ctx.deltaMs;
		if (this.issueTimerMs >= 320) {
			this.createOrder(ctx);
		}
	}

	private createOrder(ctx: StateContext): void {
		const order = generateOrder(this.model.round, this.model.level);
		this.order = order;
		this.phase = OrdersPhase.Awaiting;
		this.elapsedMs = 0;
		this.inputQueue = [];
		this.skipRequested = false;

		this.model.inputLocked = false;
		this.model.orderSay = order.say;
		this.model.orderPad = order.pad;
		this.model.timerProgress = 1;
		this.model.failureReason = null;
		this.model.failureMessage = null;
		this.model.statusText = 'Ожидание реакции пользователя…';

		const label = getPadLabel(order.pad);
		if (order.say) {
			this.model.orderText = `1С говорит: нажмите «${label}»!`;
			this.emitConsole(
				ctx,
				`1С говорит: нажмите «${label}»!`,
				SimonConsoleKind.Command
			);
			return;
		}

		this.model.orderText = `Посторонний приказ: «${label}»…`;
		this.emitConsole(
			ctx,
			`Посторонний приказ: «${label}»…`,
			SimonConsoleKind.Error
		);
	}

	private updateAwaiting(ctx: StateContext): void {
		if (!this.order) {
			this.beginIssuing();
			return;
		}

		this.elapsedMs += ctx.deltaMs;
		this.model.timerProgress = Math.max(
			0,
			1 - this.elapsedMs / this.order.durationMs
		);

		if (this.skipRequested) {
			this.handleSkipResult(ctx);
			return;
		}

		if (this.elapsedMs >= this.order.durationMs) {
			this.handleTimeout(ctx);
			return;
		}

		while (this.inputQueue.length > 0) {
			const pad = this.inputQueue.shift();
			if (pad === undefined) {
				continue;
			}
			this.processReaction(ctx, pad);
			return;
		}
	}

	private processReaction(ctx: StateContext, pad: SimonPadId): void {
		if (!this.order) {
			return;
		}

		if (this.order.say && pad === this.order.pad) {
			this.acceptOrder(ctx, createSuccessMessage());
			return;
		}

		if (!this.order.say) {
			this.rejectOrder(
				ctx,
				SimonFailureReason.ExecutedForeignOrder,
				'Вы выполнили приказ, которого 1С не давала. Нарушение субординации!'
			);
			return;
		}

		this.rejectOrder(
			ctx,
			SimonFailureReason.WrongOrderButton,
			`Неверная кнопка. 1С просила «${getPadLabel(this.order.pad)}», а вы нажали «${getPadLabel(pad)}».`
		);
	}

	private handleSkipResult(ctx: StateContext): void {
		if (!this.order) {
			return;
		}

		if (this.order.say) {
			this.rejectOrder(
				ctx,
				SimonFailureReason.SkippedRequiredOrder,
				'Вы проигнорировали прямой приказ 1С!'
			);
			return;
		}

		this.acceptOrder(
			ctx,
			'Команда отклонена. В журнале: «исполнение без приказа не зафиксировано».'
		);
	}

	private handleTimeout(ctx: StateContext): void {
		if (!this.order) {
			return;
		}

		if (this.order.say) {
			this.rejectOrder(
				ctx,
				SimonFailureReason.Timeout,
				'Вы не успели выполнить приказ 1С. Документ остался непроведённым.'
			);
			return;
		}

		this.acceptOrder(
			ctx,
			'Приказ проигнорирован. Верно: команда исходила не от 1С.'
		);
	}

	private acceptOrder(ctx: StateContext, message: string): void {
		const scoreDelta = 10 + this.model.combo * 2;
		this.model.addScore(scoreDelta);
		this.model.combo += 1;

		if (this.model.round % 5 === 0) {
			this.model.level += 1;
		}
		if (this.model.round % 9 === 0 && this.model.lives < 3) {
			this.model.lives += 1;
		}

		this.model.lastFeedbackMessage = message;
		this.model.statusText = 'Документ проведён успешно.';
		this.model.orderText = message;
		this.model.inputLocked = true;
		this.model.activePad = null;
		this.model.timerProgress = 0;

		this.emitConsole(ctx, message, SimonConsoleKind.Ok);
		ctx.events.emit(SimonEvent.OrderAccepted, {
			round: this.model.round,
			scoreDelta,
			message
		});

		this.phase = OrdersPhase.Feedback;
		this.feedbackTimerMs = 0;
	}

	private rejectOrder(
		ctx: StateContext,
		reason: SimonFailureReasonId,
		message: string
	): void {
		this.model.loseLife();
		this.model.failureReason = reason;
		this.model.failureMessage = message;
		this.model.statusText = 'Ошибка. Подробности в журнале регистрации.';
		this.model.orderText = message;
		this.model.inputLocked = true;
		this.model.activePad = null;
		this.model.timerProgress = 0;

		this.emitConsole(ctx, `ОШИБКА: ${message}`, SimonConsoleKind.Error);
		ctx.events.emit(SimonEvent.OrderRejected, {
			round: this.model.round,
			reason,
			message
		});

		this.phase = OrdersPhase.Failure;
	}

	private updateFeedback(ctx: StateContext): void {
		this.feedbackTimerMs += ctx.deltaMs;
		if (this.feedbackTimerMs >= 720) {
			this.model.round += 1;
			this.beginIssuing();
		}
	}

	private handlePadPress(ctx: StateContext, pad: SimonPadId): void {
		if (this.phase !== OrdersPhase.Awaiting || this.model.inputLocked) {
			return;
		}

		if (this.inputQueue.length >= 8) {
			this.inputQueue.shift();
		}
		this.inputQueue.push(pad);

		this.manualActivePad = pad;
		this.manualActiveTimerMs = 0;
		this.model.activePad = pad;

		ctx.events.emit(SimonEvent.PadPressed, { pad });
	}

	private handleSkip(): void {
		if (this.phase !== OrdersPhase.Awaiting) {
			return;
		}
		this.skipRequested = true;
	}

	private handleAcknowledge(ctx: StateContext): void {
		if (this.phase !== OrdersPhase.Failure) {
			return;
		}

		if (this.model.isDead) {
			ctx.director.setState(new GameOverState(this.model));
			return;
		}

		this.model.round += 1;
		this.beginIssuing();
	}

	private updateManualActive(deltaMs: number): void {
		if (this.manualActivePad === null) {
			return;
		}

		this.manualActiveTimerMs += deltaMs;
		if (this.manualActiveTimerMs >= 220) {
			this.manualActivePad = null;
			this.manualActiveTimerMs = 0;
			this.model.activePad = null;
		}
	}

	private emitConsole(
		ctx: StateContext,
		text: string,
		kind: SimonConsoleKindId
	): void {
		ctx.events.emit(SimonEvent.ConsoleMessageReceived, { text, kind });
	}
}