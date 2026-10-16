import type { SimonUiSnapshot } from '../core/Events';
import { SimonConsoleKind, type SimonConsoleKindId } from '../core/Events';
import { SimonDifficulty, SimonFailureReason, SimonMode, SimonState } from '../core/SimonTypes';
import type {
	SimonDifficultyId,
	SimonFailureReasonId,
	SimonModeId,
	SimonPadId,
	SimonStateId
} from '../core/SimonTypes';

export interface SimonConsoleLine {
	readonly id: number;
	readonly time: string;
	readonly text: string;
	readonly kind: SimonConsoleKindId;
}

export class SimonUiStore {
	ready = $state(false);
	state = $state<SimonStateId>(SimonState.Boot);
	difficulty = $state<SimonDifficultyId>(SimonDifficulty.Easy);
	mode = $state<SimonModeId>(SimonMode.Orders);

	round = $state(0);
	score = $state(0);
	combo = $state(0);
	level = $state(1);
	lives = $state(3);
	best = $state(0);

	activePad = $state<SimonPadId | null>(null);
	inputLocked = $state(true);
	failureReason = $state<SimonFailureReasonId | null>(null);
	failureMessage = $state<string | null>(null);

	orderText = $state('Нажмите «Начать смену», чтобы приступить.');
	orderSay = $state(false);
	orderPad = $state<SimonPadId | null>(null);
	timerProgress = $state(0);
	statusMessage = $state('Готово');

	lines = $state<SimonConsoleLine[]>([]);

	private nextLineId = 1;

	apply(snapshot: SimonUiSnapshot): void {
		this.ready = true;
		this.state = snapshot.state;
		this.difficulty = snapshot.difficulty;
		this.mode = snapshot.mode ?? SimonMode.Orders;

		this.round = snapshot.round;
		this.score = snapshot.score;
		this.combo = snapshot.combo ?? 0;
		this.level = snapshot.level ?? 1;
		this.lives = snapshot.lives ?? 3;
		this.best = snapshot.best ?? this.best;

		this.activePad = snapshot.activePad;
		this.inputLocked = snapshot.inputLocked;
		this.failureReason = snapshot.failureReason;
		this.failureMessage = snapshot.failureMessage ?? null;

		this.orderText = snapshot.orderText ?? '';
		this.orderSay = snapshot.orderSay ?? false;
		this.orderPad = snapshot.orderPad ?? null;
		this.timerProgress = Math.max(0, Math.min(1, snapshot.timerProgress ?? 0));
		this.statusMessage = snapshot.statusText ?? '';
	}

	reset(): void {
		this.ready = false;
		this.state = SimonState.Boot;
		this.difficulty = SimonDifficulty.Easy;
		this.mode = SimonMode.Orders;

		this.round = 0;
		this.score = 0;
		this.combo = 0;
		this.level = 1;
		this.lives = 3;
		this.best = 0;

		this.activePad = null;
		this.inputLocked = true;
		this.failureReason = null;
		this.failureMessage = null;

		this.orderText = 'Нажмите «Начать смену», чтобы приступить.';
		this.orderSay = false;
		this.orderPad = null;
		this.timerProgress = 0;
		this.statusMessage = 'Готово';

		this.lines = [];
		this.nextLineId = 1;
	}

	addLine(text: string, kind: SimonConsoleKindId): void {
		const now = new Date();

		const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
			.map((value) => String(value).padStart(2, '0'))
			.join(':');

		this.lines.push({
			id: this.nextLineId,
			time,
			text,
			kind
		});

		this.nextLineId += 1;

		if (this.lines.length > 40) {
			this.lines.shift();
		}
	}

	bootIfNeeded(): void {
		if (this.lines.length > 0) {
			return;
		}

		this.addLine('Конфигурация «Симон говорит» загружена. Демо-режим.', SimonConsoleKind.Command);

		this.addLine(
			'Добро пожаловать, Стажёр. Вас заставят нажимать кнопки. Легально.',
			SimonConsoleKind.Info
		);
	}

	get isMenu(): boolean {
		return this.state === SimonState.Menu;
	}

	get isGameOver(): boolean {
		return this.state === SimonState.GameOver;
	}

	get isOrders(): boolean {
		return this.mode === SimonMode.Orders;
	}

	get isClassic(): boolean {
		return this.mode === SimonMode.Classic;
	}

	get canInput(): boolean {
		if (this.state === SimonState.OrdersAwaiting) {
			return true;
		}

		return this.state === SimonState.AwaitingInput && !this.inputLocked;
	}

	get canStart(): boolean {
		return this.isMenu && this.ready;
	}

	get canSkip(): boolean {
		return this.isOrders && this.state === SimonState.OrdersAwaiting;
	}

	get timerPercent(): number {
		return Math.round(Math.max(0, Math.min(1, this.timerProgress)) * 100);
	}

	get statusText(): string {
		if (this.statusMessage.length > 0) {
			return this.statusMessage;
		}

		switch (this.state) {
			case SimonState.Boot:
				return 'Инициализация внешней компоненты…';
			case SimonState.Menu:
				return 'Готово';
			case SimonState.ShowingPattern:
				return 'Воспроизведение…';
			case SimonState.AwaitingInput:
				return this.inputLocked
					? 'Транзакция заблокирована. Ожидание сервера…'
					: 'Ввод последовательности…';
			case SimonState.RoundTransition:
				return 'Фиксация изменений в базе данных…';
			case SimonState.OrdersIssuing:
				return 'Ожидание приказа…';
			case SimonState.OrdersAwaiting:
				return 'Ожидание реакции пользователя…';
			case SimonState.OrdersFeedback:
				return 'Проведение документа…';
			case SimonState.FailureOrders:
			case SimonState.FailureClassic:
				return 'Ошибка. Подробности в журнале регистрации.';
			case SimonState.GameOver:
				return 'Сеанс завершён из-за нарушений.';
			default:
				return 'Неизвестное состояние сеанса.';
		}
	}

	get failureTitle(): string {
		if (this.failureMessage && this.failureMessage.length > 0) {
			return this.failureMessage;
		}

		switch (this.failureReason) {
			case SimonFailureReason.WrongPad:
				return 'Нарушена последовательность шагов обновления конфигурации.';

			case SimonFailureReason.IncompleteSequence:
				return 'Транзакция обновления завершена не полностью. База повреждена.';
			case SimonFailureReason.Timeout:
				return 'Время ожидания истекло. Пользователь не подтвердил операцию.';
			case SimonFailureReason.WrongOrderButton:
				return 'Неверная кнопка. 1С ожидала другое действие.';
			case SimonFailureReason.ExecutedForeignOrder:
				return 'Вы выполнили приказ, которого 1С не давала.';
			case SimonFailureReason.SkippedRequiredOrder:
				return 'Вы проигнорировали прямой приказ 1С.';
			default:
				return 'Неизвестная ошибка внешней компоненты обновления.';
		}
	}
}
