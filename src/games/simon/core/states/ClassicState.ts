import type { State, StateContext } from './State';
import type { SimonModel } from '../../logic/SimonModel';
import { generateSimonPattern } from '../../logic/PatternGenerator';
import { getPadLabel } from '../../logic/OrderGenerator';
import {
	SimonConsoleKind,
	SimonEvent,
	type SimonConsoleKindId
} from '../Events';
import {
	SimonDifficultySettings,
	SimonFailureReason,
	SimonMode,
	SimonPad,
	SimonState,
	type SimonFailureReasonId,
	type SimonPadId,
	type SimonStateId
} from '../SimonTypes';
import { GameOverState } from './GameOverState';

type MascotMood =
	| 'normal'
	| 'happy'
	| 'shock'
	| 'angry'
	| 'coffee'
	| 'shout';

const ClassicPhase = {
	ShowingPattern: 'SHOWING_PATTERN',
	AwaitingInput: 'AWAITING_INPUT',
	RoundTransition: 'ROUND_TRANSITION',
	Failure: 'FAILURE'
} as const;

type ClassicPhaseId = (typeof ClassicPhase)[keyof typeof ClassicPhase];

export class ClassicState implements State {
	private phase: ClassicPhaseId = ClassicPhase.ShowingPattern;
	private sequence: SimonPadId[] = [];
	private playbackTimeMs = 0;
	private lastTriggeredIndex = -1;
	private expectedIndex = 0;
	private inputQueue: SimonPadId[] = [];
	private inputElapsedMs = 0;
	private inputDurationMs = 1;
	private transitionTimerMs = 0;
	private manualActivePad: SimonPadId | null = null;
	private manualActiveTimerMs = 0;
	private unsubPad: (() => void) | null = null;
	private unsubAck: (() => void) | null = null;

	constructor(private readonly model: SimonModel) {}

	get view(): SimonStateId {
		switch (this.phase) {
			case ClassicPhase.ShowingPattern:
				return SimonState.ShowingPattern;
			case ClassicPhase.AwaitingInput:
				return SimonState.AwaitingInput;
			case ClassicPhase.RoundTransition:
				return SimonState.RoundTransition;
			case ClassicPhase.Failure:
				return SimonState.FailureClassic;
		}
	}

	enter(ctx: StateContext): void {
		this.model.resetRun();
		this.model.mode = SimonMode.Classic;
		this.model.statusText = 'Сеанс активен. Запоминайте последовательность.';
		this.setVisual('normal', 'СИМОН ГОВОРИТ', 'запоминай и повторяй');
		this.emitConsole(
			ctx,
			'Смена начата. Режим «Симон»: запоминайте и повторяйте.',
			SimonConsoleKind.Command
		);
		this.startRound(ctx);

		this.unsubPad = ctx.input.onPadPress((pad) => {
			this.handlePadPress(ctx, pad);
		});
		this.unsubAck = ctx.input.onAcknowledge(() => {
			this.handleAcknowledge(ctx);
		});
	}

	update(ctx: StateContext): void {
		if (this.model.paused) {
			return;
		}

		this.updateManualActive(ctx.deltaMs);

		switch (this.phase) {
			case ClassicPhase.ShowingPattern:
				this.updatePlayback(ctx);
				break;
			case ClassicPhase.AwaitingInput:
				this.updateAwaiting(ctx);
				break;
			case ClassicPhase.RoundTransition:
				this.updateTransition(ctx);
				break;
			case ClassicPhase.Failure:
				break;
		}
	}

	exit(): void {
		this.unsubPad?.();
		this.unsubAck?.();
		this.unsubPad = null;
		this.unsubAck = null;
	}

	private startRound(ctx: StateContext): void {
		this.sequence = generateSimonPattern(this.model.round);
		this.phase = ClassicPhase.ShowingPattern;
		this.playbackTimeMs = 0;
		this.lastTriggeredIndex = -1;
		this.expectedIndex = 0;
		this.inputQueue = [];
		this.inputElapsedMs = 0;
		this.inputDurationMs = Math.max(1, this.sequence.length * 1400 + 1200);
		this.transitionTimerMs = 0;
		this.manualActivePad = null;
		this.manualActiveTimerMs = 0;

		this.model.inputLocked = true;
		this.model.activePad = null;
		this.model.failureReason = null;
		this.model.failureMessage = null;
		this.model.orderText = 'Запомните последовательность…';
		this.model.timerProgress = 0;
		this.model.statusText = 'Воспроизведение…';
		this.setVisual('normal', 'СИМОН ГОВОРИТ', '');
	}

	private updatePlayback(ctx: StateContext): void {
		const settings = SimonDifficultySettings[this.model.difficulty];
		this.playbackTimeMs += ctx.deltaMs;
		this.model.activePad = null;

		const localMs = this.playbackTimeMs - settings.startDelayMs;
		if (localMs >= 0) {
			const rawIndex = Math.floor(localMs / settings.stepIntervalMs);
			const boundedIndex = Math.min(rawIndex, this.sequence.length - 1);

			if (boundedIndex > this.lastTriggeredIndex) {
				for (let i = this.lastTriggeredIndex + 1; i <= boundedIndex; i += 1) {
					const pad = this.sequence[i];
					if (pad) {
						ctx.events.emit(SimonEvent.PlaybackStepTriggered, {
							pad,
							round: this.model.round
						});
					}
				}
				this.lastTriggeredIndex = boundedIndex;
			}

			const withinStepMs = localMs - boundedIndex * settings.stepIntervalMs;
			if (
				boundedIndex >= 0 &&
				boundedIndex < this.sequence.length &&
				withinStepMs >= 0 &&
				withinStepMs < settings.highlightMs
			) {
				this.model.activePad = this.sequence[boundedIndex] ?? null;
			}
		}

		const lastStartMs =
			settings.startDelayMs +
			Math.max(0, this.sequence.length - 1) * settings.stepIntervalMs;
		const completionMs = lastStartMs + settings.postPatternDelayMs;

		if (this.playbackTimeMs >= completionMs) {
			this.phase = ClassicPhase.AwaitingInput;
			this.model.inputLocked = false;
			this.model.activePad = null;
			this.model.orderText = `Повторите последовательность! (шаг 1 из ${this.sequence.length})`;
			this.model.statusText = 'Ввод последовательности…';
			this.inputElapsedMs = 0;
			this.emitConsole(
				ctx,
				'Последовательность показана. Ваш ход.',
				SimonConsoleKind.Info
			);
			this.setVisual('shout', 'СИМОН ГОВОРИТ', 'твой ход');
		}
	}

	private updateAwaiting(ctx: StateContext): void {
		this.inputElapsedMs += ctx.deltaMs;
		this.model.timerProgress = Math.max(
			0,
			1 - this.inputElapsedMs / this.inputDurationMs
		);

		if (this.inputElapsedMs >= this.inputDurationMs) {
			this.triggerFailure(
				ctx,
				this.sequence[this.expectedIndex] ?? SimonPad.Provesti,
				SimonFailureReason.Timeout
			);
			return;
		}

		while (this.inputQueue.length > 0) {
			const pad = this.inputQueue.shift();
			if (pad === undefined) {
				continue;
			}

			this.processInput(ctx, pad);
			if (this.model.inputLocked) {
				this.inputQueue.length = 0;
				break;
			}
		}
	}

	private processInput(ctx: StateContext, pad: SimonPadId): void {
		const expectedPad = this.sequence[this.expectedIndex];

		if (expectedPad === undefined || this.expectedIndex >= this.sequence.length) {
			this.triggerFailure(ctx, pad, SimonFailureReason.IncompleteSequence);
			return;
		}

		if (pad !== expectedPad) {
			this.triggerFailure(ctx, pad, SimonFailureReason.WrongPad);
			return;
		}

		this.expectedIndex += 1;

		if (this.expectedIndex >= this.sequence.length) {
			this.handleRoundComplete(ctx);
			return;
		}

		this.model.orderText = `Повторите последовательность! (шаг ${
			this.expectedIndex + 1
		} из ${this.sequence.length})`;
	}

	private handleRoundComplete(ctx: StateContext): void {
		this.model.inputLocked = true;

		const scoreDelta = this.sequence.length * 5;
		this.model.addScore(scoreDelta);
		this.model.combo = this.sequence.length;
		this.model.bestCombo = Math.max(this.model.bestCombo, this.model.combo);
		this.model.level = Math.floor(this.sequence.length / 3) + 1;
		this.model.lastFeedbackMessage = `Пакет из ${this.sequence.length} документов проведён без ошибок! +${scoreDelta} очков.`;
		this.model.statusText = 'Пакет проведён.';
		this.model.orderText = this.model.lastFeedbackMessage;
		this.model.timerProgress = 0;
		this.setVisual('happy', 'ПАКЕТ ПРОВЕДЁН', 'так держать');
		this.emitConsole(ctx, this.model.lastFeedbackMessage, SimonConsoleKind.Ok);

		ctx.events.emit(SimonEvent.InputSequenceCompleted, {
			round: this.model.round
		});

		this.phase = ClassicPhase.RoundTransition;
		this.transitionTimerMs = 0;
	}

	private updateTransition(ctx: StateContext): void {
		this.transitionTimerMs += ctx.deltaMs;

		if (this.transitionTimerMs >= 950) {
			this.model.round += 1;
			this.startRound(ctx);
		}
	}

	private triggerFailure(
		ctx: StateContext,
		pad: SimonPadId,
		reason: SimonFailureReasonId
	): void {
		this.model.inputLocked = true;
		this.model.loseLife();

		const expectedPad = this.sequence[this.expectedIndex] ?? SimonPad.Provesti;
		const message =
			reason === SimonFailureReason.Timeout
				? 'Время ожидания истекло. Пользователь не подтвердил последовательность.'
				: `Нарушена последовательность проведения: ожидался «${getPadLabel(
						expectedPad
					)}». Регистр разнесён.`;

		this.model.failureReason = reason;
		this.model.failureMessage = message;
		this.model.statusText = 'Ошибка. Подробности в журнале регистрации.';
		this.model.orderText = message;
		this.model.activePad = null;
		this.model.timerProgress = 0;
		this.setVisual('angry', 'ОШИБКА ПОСЛЕДОВАТЕЛЬНОСТИ', '');
		this.emitConsole(ctx, `ОШИБКА: ${message}`, SimonConsoleKind.Error);

		ctx.events.emit(SimonEvent.ClassicInputRejected, {
			round: this.model.round,
			step: this.expectedIndex,
			pad,
			reason
		});

		this.phase = ClassicPhase.Failure;
	}

	private handlePadPress(ctx: StateContext, pad: SimonPadId): void {
		if (this.model.paused) {
			return;
		}
		if (this.phase !== ClassicPhase.AwaitingInput || this.model.inputLocked) {
			return;
		}

		if (this.inputQueue.length >= 12) {
			this.inputQueue.shift();
		}

		this.inputQueue.push(pad);
		this.manualActivePad = pad;
		this.manualActiveTimerMs = 0;
		this.model.activePad = pad;

		ctx.events.emit(SimonEvent.PadPressed, { pad });
	}

	private handleAcknowledge(ctx: StateContext): void {
		if (this.model.paused) {
			return;
		}
		if (this.phase !== ClassicPhase.Failure) {
			return;
		}

		if (this.model.isDead) {
			ctx.director.setState(new GameOverState(this.model));
			return;
		}

		this.model.round += 1;
		this.startRound(ctx);
	}

	private updateManualActive(deltaMs: number): void {
		if (this.manualActivePad === null) {
			return;
		}

		this.manualActiveTimerMs += deltaMs;

		if (this.manualActiveTimerMs >= 220) {
			this.manualActivePad = null;
			this.manualActiveTimerMs = 0;

			if (this.phase !== ClassicPhase.ShowingPattern) {
				this.model.activePad = null;
			}
		}
	}

	private setVisual(
		mood: MascotMood,
		bossTag: string,
		flavorText: string
	): void {
		const visualModel = this.model as SimonModel & {
			mascotMood?: MascotMood;
			bossTag?: string;
			flavorText?: string;
			isBreak?: boolean;
		};

		visualModel.mascotMood = mood;
		visualModel.bossTag = bossTag;
		visualModel.flavorText = flavorText;
		visualModel.isBreak = false;
	}

	private emitConsole(
		ctx: StateContext,
		text: string,
		kind: SimonConsoleKindId
	): void {
		ctx.events.emit(SimonEvent.ConsoleMessageReceived, { text, kind });
	}
}