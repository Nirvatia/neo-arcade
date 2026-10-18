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
	SimonPad,
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

	private breakActive = false;
	private lastBreak = false;

	private manualActivePad: SimonPadId | null = null;
	private manualActiveTimerMs = 0;

	private unsubPad: (() => void) | null = null;
	private unsubSkip: (() => void) | null = null;
	private unsubAck: (() => void) | null = null;

	private readonly bossTags: readonly string[] = [
		'1С ПРИКАЗЫВАЕТ',
		'ГЛАВБУХ ТРЕБУЕТ',
		'ДИРЕКТОР ЖДЁТ',
		'НАЛОГОВАЯ НАПОМИНАЕТ',
		'КЛИЕНТ НАСТАИВАЕТ',
		'КОНФИГУРАЦИЯ ШЕПЧЕТ',
		'СЕРВЕР БОЛТАЕТ'
	];

	private readonly foreignFlavors: readonly string[] = [
		'это точно не от 1С',
		'не трогай, само рассосётся',
		'подозрительная команда…',
		'лучше пропустить'
	];

	private readonly successFlavors: readonly string[] = [
		'так держать!',
		'база довольна',
		'почти без ошибок',
		'отчётность ближе',
		'главбух кивает'
	];

	private readonly padFlavors: Record<SimonPadId, readonly string[]> = {
		[SimonPad.Provesti]: [
			'документ сам себя не проведёт',
			'накладная уже нервничает',
			'проведи, пока никто не видит',
			'живее, отчёт горит'
		],
		[SimonPad.Zapisat]: [
			'сохрани, пока не упало',
			'база хочет бэкап',
			'запиши обязательно',
			'не забудь сохраниться'
		],
		[SimonPad.Udalit]: [
			'только тихо',
			'архив 2007 года мешает',
			'в корзину это',
			'удали, но никому не говори'
		],
		[SimonPad.Eshche]: [
			'а вдруг там премия?',
			'проверим, что там',
			'смелее',
			'может, повезёт'
		]
	};

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

		this.breakActive = false;
		this.lastBreak = false;

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

		this.breakActive = false;

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

		this.model.mascotMood = 'normal';
		this.model.bossTag = 'ОЖИДАНИЕ';
		this.model.flavorText = '';
		this.model.isBreak = false;
	}

	private updateIssuing(ctx: StateContext): void {
		this.issueTimerMs += ctx.deltaMs;

		if (this.issueTimerMs >= 320) {
			this.createOrder(ctx);
		}
	}

	private createOrder(ctx: StateContext): void {
		const wantBreak =
			this.model.level >= 3 && !this.lastBreak && Math.random() < 0.16;

		this.lastBreak = wantBreak;
		this.breakActive = wantBreak;

		this.phase = OrdersPhase.Awaiting;
		this.elapsedMs = 0;
		this.inputQueue = [];
		this.skipRequested = false;

		this.model.inputLocked = false;
		this.model.failureReason = null;
		this.model.failureMessage = null;
		this.model.statusText = 'Ожидание реакции пользователя…';

		if (wantBreak) {
			const reference = generateOrder(this.model.round, this.model.level);
			const durationMs = reference.durationMs + 800;

			this.order = {
				pad: SimonPad.Eshche,
				say: false,
				durationMs
			};

			this.model.orderSay = false;
			this.model.orderPad = null;
			this.model.timerProgress = 1;

			this.model.orderText = 'ПЕРЕКУР! НИЧЕГО НЕ ЖМИ!';
			this.model.mascotMood = 'coffee';
			this.model.bossTag = '1С ГОВОРИТ';
			this.model.flavorText = 'база на обслуживании… просто жди.';
			this.model.isBreak = true;

			this.emitConsole(
				ctx,
				'ПЕРЕКУР! Ничего не нажимайте.',
				SimonConsoleKind.Command
			);

			return;
		}

		const order = generateOrder(this.model.round, this.model.level);
		this.order = order;

		this.model.orderSay = order.say;
		this.model.orderPad = order.pad;
		this.model.timerProgress = 1;
		this.model.isBreak = false;

		const label = getPadLabel(order.pad);

		if (order.say) {
			this.model.orderText = `ЖМИ «${label}»!`;
			this.model.mascotMood = 'shout';
			this.model.bossTag = this.pick(this.bossTags);
			this.model.flavorText = this.pick(this.padFlavors[order.pad]);

			this.emitConsole(
				ctx,
				`1С говорит: нажмите «${label}»!`,
				SimonConsoleKind.Command
			);

			return;
		}

		this.model.orderText = `Посторонний приказ: «${label}»…`;
		this.model.mascotMood = 'shock';
		this.model.bossTag = 'ПОСТОРОННИЙ ПРИКАЗ';
		this.model.flavorText = this.pick(this.foreignFlavors);

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
			if (this.breakActive) {
				this.skipRequested = false;
			} else {
				this.handleSkipResult(ctx);
				return;
			}
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

		if (this.breakActive) {
			this.rejectOrder(
				ctx,
				SimonFailureReason.BreakViolation,
				'СЕЙЧАС ПЕРЕКУР! Ай-ай-ай!'
			);
			return;
		}

		if (this.order.say && pad === this.order.pad) {
			this.acceptRegularOrder(ctx, createSuccessMessage());
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

		this.acceptForeignOrder(
			ctx,
			'Команда отклонена. В журнале: «исполнение без приказа не зафиксировано».'
		);
	}

	private handleTimeout(ctx: StateContext): void {
		if (!this.order) {
			return;
		}

		if (this.breakActive) {
			this.acceptBreak(ctx);
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

		this.acceptForeignOrder(
			ctx,
			'Приказ проигнорирован. Верно: команда исходила не от 1С.'
		);
	}

	private acceptRegularOrder(ctx: StateContext, message: string): void {
		if (!this.order) {
			return;
		}

		const fraction = Math.max(
			0,
			1 - this.elapsedMs / this.order.durationMs
		);

		const crit = fraction > 0.62;

		this.model.combo += 1;
		this.model.bestCombo = Math.max(this.model.bestCombo, this.model.combo);

		const multiplier = this.getComboMultiplier(this.model.combo);

		const baseScore =
			90 +
			this.model.level * 10 +
			Math.round(90 * fraction * (crit ? 2 : 1));

		let scoreDelta = baseScore * multiplier;

		let lottery: 'life' | 'bonus500' | 'bonus200' | null = null;
		let lotteryMessage: string | null = null;

		if (this.order.pad === SimonPad.Eshche) {
			const roll = Math.random();

			if (roll < 0.3 && this.model.lives < 3) {
				this.model.lives += 1;
				lottery = 'life';
				lotteryMessage = 'ИЗ «ЕЩЁ…» ВЫПАЛО: +1 ЖИЗНЬ ❤';
			} else if (roll < 0.55) {
				scoreDelta += 500;
				lottery = 'bonus500';
				lotteryMessage = '+500! ПРЕМИЯ ИЗ КУБЫШКИ';
			} else {
				scoreDelta += 200;
				lottery = 'bonus200';
				lotteryMessage = '+200 БОНУС';
			}
		}

		this.model.addScore(scoreDelta);

		this.model.ordersInLevel += 1;
		this.checkLevelUp();

		const feedback = lotteryMessage ?? message;

		this.model.lastFeedbackMessage = feedback;
		this.model.statusText = 'Документ проведён успешно.';
		this.model.orderText = feedback;

		this.model.mascotMood = 'happy';
		this.model.bossTag = crit ? 'КРИТ!' : 'ДОКУМЕНТ ПРОВЕДЁН';
		this.model.flavorText = lotteryMessage
			? ''
			: crit
				? 'быстро проведено'
				: this.pick(this.successFlavors);

		this.model.inputLocked = true;
		this.model.activePad = null;
		this.model.timerProgress = 0;
		this.model.isBreak = false;
		this.breakActive = false;

		this.emitConsole(ctx, feedback, SimonConsoleKind.Ok);

		ctx.events.emit(SimonEvent.OrderAccepted, {
			round: this.model.round,
			scoreDelta,
			message: feedback,
			crit,
			break: false,
			lottery
		});

		this.phase = OrdersPhase.Feedback;
		this.feedbackTimerMs = 0;
	}

	private acceptForeignOrder(ctx: StateContext, message: string): void {
		const scoreDelta =
			20 + this.model.level * 5 + this.model.combo * 2;

		this.model.addScore(scoreDelta);

		this.model.combo += 1;
		this.model.bestCombo = Math.max(this.model.bestCombo, this.model.combo);

		this.model.ordersInLevel += 1;
		this.checkLevelUp();

		this.model.lastFeedbackMessage = message;
		this.model.statusText = 'Посторонняя команда отклонена.';
		this.model.orderText = message;

		this.model.mascotMood = 'happy';
		this.model.bossTag = 'КОМАНДА ОТКЛОНЕНА';
		this.model.flavorText = 'мимо кассы';

		this.model.inputLocked = true;
		this.model.activePad = null;
		this.model.timerProgress = 0;
		this.model.isBreak = false;
		this.breakActive = false;

		this.emitConsole(ctx, message, SimonConsoleKind.Ok);

		ctx.events.emit(SimonEvent.OrderAccepted, {
			round: this.model.round,
			scoreDelta,
			message,
			crit: false,
			break: false,
			lottery: null
		});

		this.phase = OrdersPhase.Feedback;
		this.feedbackTimerMs = 0;
	}

	private acceptBreak(ctx: StateContext): void {
		const scoreDelta = 120 * this.model.level;

		this.model.addScore(scoreDelta);

		this.model.ordersInLevel += 1;
		this.checkLevelUp();

		const message = `ПЕРЕКУР ЗАСЧИТАН +${scoreDelta} ☕`;

		this.model.lastFeedbackMessage = message;
		this.model.statusText = 'Перекур пережит.';
		this.model.orderText = message;

		this.model.mascotMood = 'happy';
		this.model.bossTag = 'ПЕРЕКУР ЗАСЧИТАН';
		this.model.flavorText = 'можно выдохнуть';

		this.model.inputLocked = true;
		this.model.activePad = null;
		this.model.timerProgress = 0;
		this.model.isBreak = false;
		this.breakActive = false;

		this.emitConsole(ctx, message, SimonConsoleKind.Ok);

		ctx.events.emit(SimonEvent.OrderAccepted, {
			round: this.model.round,
			scoreDelta,
			message,
			crit: false,
			break: true,
			lottery: null
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

		this.model.mascotMood = 'angry';
		this.model.bossTag = 'ОШИБКА СМЕНЫ';
		this.model.flavorText = '';

		this.model.inputLocked = true;
		this.model.activePad = null;
		this.model.timerProgress = 0;
		this.model.isBreak = false;
		this.breakActive = false;

		this.emitConsole(ctx, `ОШИБКА: ${message}`, SimonConsoleKind.Error);

		ctx.events.emit(SimonEvent.OrderRejected, {
			round: this.model.round,
			reason,
			message
		});

		this.phase = OrdersPhase.Failure;
	}

	private checkLevelUp(): void {
		if (this.model.ordersInLevel < this.model.ordersPerLevel) {
			return;
		}

		this.model.ordersInLevel = 0;
		this.model.level += 1;

		this.model.bossTag = 'НОВЫЙ УРОВЕНЬ';
		this.model.flavorText = 'приказы становятся бодрее';
	}

	private getComboMultiplier(combo: number): number {
		if (combo >= 20) {
			return 5;
		}

		if (combo >= 14) {
			return 4;
		}

		if (combo >= 9) {
			return 3;
		}

		if (combo >= 5) {
			return 2;
		}

		return 1;
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

	private pick<T>(items: readonly T[]): T {
		const index = Math.floor(Math.random() * items.length);
		return items[index] ?? (items[0] as T);
	}

	private emitConsole(
		ctx: StateContext,
		text: string,
		kind: SimonConsoleKindId
	): void {
		ctx.events.emit(SimonEvent.ConsoleMessageReceived, { text, kind });
	}
}