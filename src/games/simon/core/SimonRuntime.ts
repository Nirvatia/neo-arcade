import { saveScore } from '../../../shared/utils/scoreStore';
import {
	SimonComponent,
	type SimonComboComponent,
	type SimonDifficultyComponent,
	type SimonFailureOccurredComponent,
	type SimonFeedbackTimerComponent,
	type SimonInputComponent,
	type SimonInputQueueComponent,
	type SimonInputTimerComponent,
	type SimonLevelComponent,
	type SimonLivesComponent,
	type SimonModeComponent,
	type SimonOrderAcceptedComponent,
	type SimonOrderComponent,
	type SimonOrderRejectedComponent,
	type SimonOrderTimerComponent,
	type SimonPatternComponent,
	type SimonPlaybackCompletedComponent,
	type SimonPlaybackComponent,
	type SimonRoundCompletedComponent,
	type SimonRoundComponent,
	type SimonScoreComponent,
	type SimonSkipRequestedComponent
} from '../components/SimonComponents';
import { EventBus } from '../engine/EventBus';
import { GameLoop, type GameLoopPhaseId } from '../engine/GameLoop';
import type { Entity } from '../engine/ecs/types';
import type { World } from '../engine/ecs/World';
import { World as SimonWorld } from '../engine/ecs/World';
import type { StateMachine } from '../engine/StateMachine';
import { InputSystem } from '../systems/InputSystem';
import { OrdersSystem } from '../systems/OrdersSystem';
import { PatternGenerationSystem } from '../systems/PatternGenerationSystem';
import { PlaybackSystem } from '../systems/PlaybackSystem';
import { TimerSystem } from '../systems/TimerSystem';
import {
	SimonConsoleKind,
	SimonEvent,
	type SimonEventPayloads,
	type SimonTransitionEventId,
	type SimonUiSnapshot
} from './Events';
import { createSimonStateMachine } from './SimonStateMachine';
import {
	SimonDifficulty,
	SimonMode,
	SimonPad,
	SimonPadList,
	SimonState,
	type SimonDifficultyId,
	type SimonFailureReasonId,
	type SimonModeId,
	type SimonPadId,
	type SimonStateId
} from './SimonTypes';

export class SimonRuntime {
	private readonly events: EventBus<SimonEventPayloads>;
	private readonly world: World;
	private readonly stateMachine: StateMachine<SimonStateId, SimonTransitionEventId>;
	private readonly loop: GameLoop;

	private mode: SimonModeId = SimonMode.Orders;
	private difficulty: SimonDifficultyId = SimonDifficulty.Easy;
	private gameEntity: Entity | null = null;

	private currentClassicRound = 1;
	private nextOrdersRound = 1;
	private bestScore = 0;

	private lastFailureReason: SimonFailureReasonId | null = null;
	private lastFailureMessage = '';
	private lastFeedbackMessage = '';
	private lastOrderPad: SimonPadId | null = null;
	private lastOrderSay = false;
	private statusMessage = 'Готово';

	private manualActivePad: SimonPadId | null = null;
	private manualActiveElapsedMs = 0;

	private lastPlaybackStepIndex = -1;
	private lastUiKey = '';
	private destroyed = false;

	constructor(events: EventBus<SimonEventPayloads>) {
		this.events = events;
		this.world = new SimonWorld();
		this.stateMachine = createSimonStateMachine();
		this.bestScore = this.loadBest();

		this.world.addSystem(new TimerSystem());
		this.world.addSystem(new PatternGenerationSystem());
		this.world.addSystem(new PlaybackSystem());
		this.world.addSystem(new InputSystem());
		this.world.addSystem(new OrdersSystem());

		this.loop = new GameLoop({
			update: (deltaMs) => this.update(deltaMs),
			render: () => this.render(),
			onError: (error, phase) => this.handleLoopError(error, phase)
		});
	}

	get state(): SimonStateId {
		return this.stateMachine.state;
	}

	get selectedDifficulty(): SimonDifficultyId {
		return this.difficulty;
	}

	get selectedMode(): SimonModeId {
		return this.mode;
	}

	boot(): void {
		this.assertNotDestroyed();
		this.forcedTransition(SimonEvent.BootCompleted);
		this.syncUi();
	}

	start(): void {
		this.assertNotDestroyed();
		this.loop.start();
	}

	destroy(): void {
		if (this.destroyed) {
			return;
		}

		this.destroyed = true;
		this.loop.stop();
		this.world.dispose();
	}

	selectDifficulty(difficulty: SimonDifficultyId): void {
		this.assertNotDestroyed();

		if (this.stateMachine.state !== SimonState.Menu) {
			throw new Error(
				`[SimonRuntime] Cannot select difficulty in state ${this.stateMachine.state}`
			);
		}

		if (
			difficulty !== SimonDifficulty.Easy &&
			difficulty !== SimonDifficulty.Normal &&
			difficulty !== SimonDifficulty.Hard
		) {
			throw new Error(`[SimonRuntime] Unknown difficulty ${difficulty}`);
		}

		this.difficulty = difficulty;

		if (this.gameEntity !== null && this.world.isAlive(this.gameEntity)) {
			this.world.addComponent<SimonDifficultyComponent>(
				this.gameEntity,
				SimonComponent.Difficulty,
				{
					difficulty
				}
			);
		}

		this.events.emit(SimonEvent.DifficultySelected, { difficulty });
		this.syncUi();
	}

	selectMode(mode: SimonModeId): void {
		this.assertNotDestroyed();

		if (this.stateMachine.state !== SimonState.Menu) {
			throw new Error(
				`[SimonRuntime] Cannot select mode in state ${this.stateMachine.state}`
			);
		}

		if (mode !== SimonMode.Orders && mode !== SimonMode.Classic) {
			throw new Error(`[SimonRuntime] Unknown mode ${mode}`);
		}

		if (this.mode === mode) {
			return;
		}

		this.mode = mode;
		this.statusMessage = 'Готово';

		this.events.emit(SimonEvent.ModeSelected, { mode });
		this.emitConsole(
			mode === SimonMode.Orders
				? 'Режим «Подчинённость»: выполняйте только приказы 1С.'
				: 'Режим «Симон»: запоминайте последовательность и повторяйте её.',
			SimonConsoleKind.Command
		);

		this.syncUi();
	}

	requestStart(): void {
		this.assertNotDestroyed();
		this.requestStartMode(this.mode);
	}

	requestStartMode(mode: SimonModeId): void {
		this.assertNotDestroyed();

		if (this.stateMachine.state !== SimonState.Menu) {
			throw new Error(
				`[SimonRuntime] Cannot start game in state ${this.stateMachine.state}`
			);
		}

		if (mode !== SimonMode.Orders && mode !== SimonMode.Classic) {
			throw new Error(`[SimonRuntime] Unknown mode ${mode}`);
		}

		this.mode = mode;
		this.currentClassicRound = 1;
		this.nextOrdersRound = 1;
		this.lastFailureReason = null;
		this.lastFailureMessage = '';
		this.lastFeedbackMessage = '';
		this.lastOrderPad = null;
		this.lastOrderSay = false;
		this.manualActivePad = null;
		this.manualActiveElapsedMs = 0;
		this.lastPlaybackStepIndex = -1;

		const entity = this.ensureGameEntity();
		this.prepareRunEntity(entity);

		const transitionEvent =
			mode === SimonMode.Orders
				? SimonEvent.StartOrdersRequested
				: SimonEvent.StartClassicRequested;

		this.forcedTransition(transitionEvent);

		this.events.emit(SimonEvent.StartRequested, {
			difficulty: this.difficulty
		});

		this.emitConsole(
			'Смена начата. Ожидайте приказов от 1С…',
			SimonConsoleKind.Command
		);

		this.statusMessage = 'Сеанс активен. 1С наблюдает за вами.';
		this.syncUi();
	}

	requestRestart(): void {
		this.assertNotDestroyed();
		this.forcedTransition(SimonEvent.RestartRequested);

		this.world.clearEntities();
		this.gameEntity = null;
		this.currentClassicRound = 1;
		this.nextOrdersRound = 1;
		this.lastFailureReason = null;
		this.lastFailureMessage = '';
		this.lastFeedbackMessage = '';
		this.lastOrderPad = null;
		this.lastOrderSay = false;
		this.manualActivePad = null;
		this.manualActiveElapsedMs = 0;
		this.lastPlaybackStepIndex = -1;
		this.lastUiKey = '';
		this.statusMessage = 'Готово';

		this.events.emit(SimonEvent.RestartRequested, null);
		this.syncUi();
	}

	pressPad(pad: SimonPadId): void {
		this.assertNotDestroyed();

		if (!SimonPadList.includes(pad)) {
			throw new Error(`[SimonRuntime] Unknown pad ${pad}`);
		}

		const state = this.stateMachine.state;

		if (state !== SimonState.AwaitingInput && state !== SimonState.OrdersAwaiting) {
			return;
		}

		const entity = this.gameEntity;

		if (entity === null || !this.world.isAlive(entity)) {
			return;
		}

		const queue = this.world.getComponent<SimonInputQueueComponent>(
			entity,
			SimonComponent.InputQueue
		);

		if (!queue) {
			return;
		}

		if (state === SimonState.AwaitingInput) {
			const input = this.world.getComponent<SimonInputComponent>(
				entity,
				SimonComponent.Input
			);

			if (!input || input.locked) {
				return;
			}

			if (queue.commands.length >= 12) {
				queue.commands.shift();
			}
		} else {
			if (queue.commands.length >= 8) {
				queue.commands.shift();
			}
		}

		queue.commands.push(pad);
		this.manualActivePad = pad;
		this.manualActiveElapsedMs = 0;

		this.events.emit(SimonEvent.PadPressed, { pad });
	}

	skip(): void {
		this.assertNotDestroyed();

		if (this.stateMachine.state !== SimonState.OrdersAwaiting) {
			return;
		}

		const entity = this.gameEntity;

		if (entity === null || !this.world.isAlive(entity)) {
			return;
		}

		if (this.world.hasComponent(entity, SimonComponent.SkipRequested)) {
			return;
		}

		const round = this.world.getComponent<SimonRoundComponent>(
			entity,
			SimonComponent.Round
		);

		this.world.addComponent<SimonSkipRequestedComponent>(
			entity,
			SimonComponent.SkipRequested,
			{
				round: round?.round ?? this.nextOrdersRound
			}
		);

		this.events.emit(SimonEvent.SkipRequested, null);
	}

	getSnapshot(): SimonUiSnapshot {
		return this.buildSnapshot();
	}

	private update(deltaMs: number): void {
		if (this.destroyed) {
			return;
		}

		this.updateManualActive(deltaMs);

		const state = this.stateMachine.state;

		if (
			state === SimonState.Boot ||
			state === SimonState.Menu ||
			state === SimonState.GameOver
		) {
			return;
		}

		this.world.update(deltaMs);
		this.drainFlags();
		this.emitPlaybackSteps();
		this.updateTimedTransitions();
	}

	private render(): void {
		if (this.destroyed) {
			return;
		}

		this.syncUi();
	}

	private updateManualActive(deltaMs: number): void {
		if (this.manualActivePad === null) {
			return;
		}

		this.manualActiveElapsedMs = Math.max(0, this.manualActiveElapsedMs + deltaMs);

		if (this.manualActiveElapsedMs >= 220) {
			this.manualActivePad = null;
			this.manualActiveElapsedMs = 0;
		}
	}

	private updateTimedTransitions(): void {
		const state = this.stateMachine.state;
		const entity = this.gameEntity;

		if (entity === null || !this.world.isAlive(entity)) {
			return;
		}

		if (
			state !== SimonState.OrdersFeedback &&
			state !== SimonState.RoundTransition
		) {
			return;
		}

		const timer = this.world.getComponent<SimonFeedbackTimerComponent>(
			entity,
			SimonComponent.FeedbackTimer
		);

		if (!timer || !timer.completed) {
			return;
		}

		this.world.removeComponent(entity, SimonComponent.FeedbackTimer);
		this.safeTransition(SimonEvent.RoundTransitionCompleted);
	}
	private drainFlags(): void {
		const entity = this.gameEntity;

		if (entity === null || !this.world.isAlive(entity)) {
			return;
		}

		const state = this.stateMachine.state;

		if (
			state === SimonState.AwaitingInput &&
			this.world.hasComponent(entity, SimonComponent.FailureOccurred)
		) {
			const failure = this.world.requireComponent<SimonFailureOccurredComponent>(
				entity,
				SimonComponent.FailureOccurred
			);

			this.world.removeComponent(entity, SimonComponent.FailureOccurred);
			this.handleClassicFailure(entity, failure);
			return;
		}

		if (
			state === SimonState.ShowingPattern &&
			this.world.hasComponent(entity, SimonComponent.PlaybackCompleted)
		) {
			const completed =
				this.world.requireComponent<SimonPlaybackCompletedComponent>(
					entity,
					SimonComponent.PlaybackCompleted
				);

			this.world.removeComponent(entity, SimonComponent.PlaybackCompleted);

			if (this.safeTransition(SimonEvent.PatternPlaybackCompleted)) {
				this.events.emit(SimonEvent.PatternPlaybackCompleted, {
					round: completed.round
				});
			}

			return;
		}

		if (
			state === SimonState.AwaitingInput &&
			this.world.hasComponent(entity, SimonComponent.RoundCompleted)
		) {
			const completed = this.world.requireComponent<SimonRoundCompletedComponent>(
				entity,
				SimonComponent.RoundCompleted
			);

			this.world.removeComponent(entity, SimonComponent.RoundCompleted);
			this.handleClassicSuccess(entity, completed.round);
			return;
		}

		if (
			state === SimonState.OrdersIssuing &&
			this.world.hasComponent(entity, SimonComponent.Order)
		) {
			const order = this.world.requireComponent<SimonOrderComponent>(
				entity,
				SimonComponent.Order
			);

			const timer = this.world.getComponent<SimonOrderTimerComponent>(
				entity,
				SimonComponent.OrderTimer
			);

			this.handleOrderIssued(order, timer?.durationMs ?? 0);
			return;
		}

		if (
			state === SimonState.OrdersAwaiting &&
			this.world.hasComponent(entity, SimonComponent.OrderAccepted)
		) {
			const accepted = this.world.requireComponent<SimonOrderAcceptedComponent>(
				entity,
				SimonComponent.OrderAccepted
			);

			this.world.removeComponent(entity, SimonComponent.OrderAccepted);
			this.handleOrderAccepted(entity, accepted);
			return;
		}

		if (
			state === SimonState.OrdersAwaiting &&
			this.world.hasComponent(entity, SimonComponent.OrderRejected)
		) {
			const rejected = this.world.requireComponent<SimonOrderRejectedComponent>(
				entity,
				SimonComponent.OrderRejected
			);

			this.world.removeComponent(entity, SimonComponent.OrderRejected);
			this.handleOrderRejected(rejected);
		}
	}

	private handleClassicFailure(
		entity: Entity,
		failure: SimonFailureOccurredComponent
	): void {
		this.ensureProgressComponents(entity);

		const lives = this.world.requireComponent<SimonLivesComponent>(
			entity,
			SimonComponent.Lives
		);
		const combo = this.world.requireComponent<SimonComboComponent>(
			entity,
			SimonComponent.Combo
		);

		lives.lives = Math.max(0, lives.lives - 1);
		combo.combo = 0;

		this.lastFailureReason = failure.reason;
		this.lastFailureMessage = this.createClassicFailureMessage(entity, failure);
		this.statusMessage = 'Ошибка. Подробности в журнале регистрации.';

		this.emitConsole(`ОШИБКА: ${this.lastFailureMessage}`, SimonConsoleKind.Error);

		if (this.safeTransition(SimonEvent.ClassicInputRejected)) {
			this.events.emit(SimonEvent.ClassicInputRejected, {
				round: failure.round,
				step: failure.step,
				pad: failure.pad,
				reason: failure.reason
			});
		}
	}

	private handleClassicSuccess(entity: Entity, round: number): void {
		this.ensureProgressComponents(entity);

		const pattern = this.world.getComponent<SimonPatternComponent>(
			entity,
			SimonComponent.Pattern
		);

		const sequenceLength = pattern?.sequence.length ?? Math.max(1, round);
		const score = this.world.requireComponent<SimonScoreComponent>(
			entity,
			SimonComponent.Score
		);
		const combo = this.world.requireComponent<SimonComboComponent>(
			entity,
			SimonComponent.Combo
		);
		const level = this.world.requireComponent<SimonLevelComponent>(
			entity,
			SimonComponent.Level
		);

		const scoreDelta = sequenceLength * 5;

		score.score += scoreDelta;
		combo.combo = sequenceLength;
		level.level = Math.floor(sequenceLength / 3) + 1;

		this.updateBest(score.score);
		this.currentClassicRound = round + 1;
		this.lastFeedbackMessage = `Пакет из ${sequenceLength} документов проведён без ошибок! +${scoreDelta} очков.`;
		this.statusMessage = 'Пакет проведён.';

		this.emitConsole(this.lastFeedbackMessage, SimonConsoleKind.Ok);

		if (this.safeTransition(SimonEvent.InputSequenceCompleted)) {
			this.events.emit(SimonEvent.InputSequenceCompleted, {
				round
			});
		}
	}

	private handleOrderIssued(order: SimonOrderComponent, durationMs: number): void {
		this.lastOrderPad = order.pad;
		this.lastOrderSay = order.say;
		this.lastFailureReason = null;
		this.lastFailureMessage = '';
		this.lastFeedbackMessage = '';

		const label = this.getPadLabel(order.pad);

		if (order.say) {
			this.emitConsole(`1С говорит: нажмите «${label}»!`, SimonConsoleKind.Command);
		} else {
			this.emitConsole(`Посторонний приказ: «${label}»…`, SimonConsoleKind.Error);
		}

		this.statusMessage = 'Ожидание реакции пользователя…';

		if (this.safeTransition(SimonEvent.OrderIssued)) {
			this.events.emit(SimonEvent.OrderIssued, {
				round: order.round,
				pad: order.pad,
				say: order.say,
				durationMs
			});
		}
	}

	private handleOrderAccepted(
		entity: Entity,
		accepted: SimonOrderAcceptedComponent
	): void {
		this.ensureProgressComponents(entity);

		const score = this.world.requireComponent<SimonScoreComponent>(
			entity,
			SimonComponent.Score
		);

		this.updateBest(score.score);
		this.nextOrdersRound += 1;
		this.lastFeedbackMessage = accepted.message;
		this.statusMessage = 'Документ проведён успешно.';

		this.emitConsole(accepted.message, SimonConsoleKind.Ok);

		if (this.safeTransition(SimonEvent.OrderAccepted)) {
			this.events.emit(SimonEvent.OrderAccepted, {
				round: accepted.round,
				scoreDelta: accepted.scoreDelta,
				message: accepted.message
			});
		}
	}

	private handleOrderRejected(rejected: SimonOrderRejectedComponent): void {
		this.lastFailureReason = rejected.reason;
		this.lastFailureMessage = rejected.message;
		this.statusMessage = 'Ошибка. Подробности в журнале регистрации.';

		this.emitConsole(`ОШИБКА: ${rejected.message}`, SimonConsoleKind.Error);

		if (this.safeTransition(SimonEvent.OrderRejected)) {
			this.events.emit(SimonEvent.OrderRejected, {
				round: rejected.round,
				reason: rejected.reason,
				message: rejected.message
			});
		}
	}

	private emitPlaybackSteps(): void {
		const entity = this.gameEntity;

		if (entity === null || !this.world.isAlive(entity)) {
			return;
		}

		const playback = this.world.getComponent<SimonPlaybackComponent>(
			entity,
			SimonComponent.Playback
		);
		const pattern = this.world.getComponent<SimonPatternComponent>(
			entity,
			SimonComponent.Pattern
		);

		if (!playback || !pattern) {
			return;
		}

		if (playback.lastTriggeredIndex < this.lastPlaybackStepIndex) {
			this.lastPlaybackStepIndex = playback.lastTriggeredIndex;
		}

		while (this.lastPlaybackStepIndex < playback.lastTriggeredIndex) {
			this.lastPlaybackStepIndex += 1;

			const pad = pattern.sequence[this.lastPlaybackStepIndex];

			if (!pad) {
				continue;
			}

			const roundComponent = this.world.getComponent<SimonRoundComponent>(
				entity,
				SimonComponent.Round
			);

			this.events.emit(SimonEvent.PlaybackStepTriggered, {
				pad,
				round: roundComponent?.round ?? this.currentClassicRound
			});
		}
	}

	private ensureGameEntity(): Entity {
		if (this.gameEntity !== null && this.world.isAlive(this.gameEntity)) {
			return this.gameEntity;
		}

		const entity = this.world.createEntity();
		this.gameEntity = entity;

		this.world.addComponent<SimonDifficultyComponent>(
			entity,
			SimonComponent.Difficulty,
			{
				difficulty: this.difficulty
			}
		);

		return entity;
	}

	private prepareRunEntity(entity: Entity): void {
		this.world.addComponent<SimonModeComponent>(entity, SimonComponent.Mode, {
			mode: this.mode
		});

		this.world.addComponent<SimonDifficultyComponent>(
			entity,
			SimonComponent.Difficulty,
			{
				difficulty: this.difficulty
			}
		);

		this.world.addComponent<SimonScoreComponent>(entity, SimonComponent.Score, {
			score: 0,
			best: this.bestScore
		});

		this.world.addComponent<SimonLivesComponent>(entity, SimonComponent.Lives, {
			lives: 3
		});

		this.world.addComponent<SimonComboComponent>(entity, SimonComponent.Combo, {
			combo: 0
		});

		this.world.addComponent<SimonLevelComponent>(entity, SimonComponent.Level, {
			level: 1
		});

		this.world.addComponent<SimonInputQueueComponent>(
			entity,
			SimonComponent.InputQueue,
			{
				commands: []
			}
		);

		this.world.removeComponent(entity, SimonComponent.Order);
		this.world.removeComponent(entity, SimonComponent.OrderTimer);
		this.world.removeComponent(entity, SimonComponent.OrderAccepted);
		this.world.removeComponent(entity, SimonComponent.OrderRejected);
		this.world.removeComponent(entity, SimonComponent.OrderTimeout);
		this.world.removeComponent(entity, SimonComponent.SkipRequested);
		this.world.removeComponent(entity, SimonComponent.FeedbackTimer);
		this.world.removeComponent(entity, SimonComponent.InputTimer);
		this.world.removeComponent(entity, SimonComponent.FailureOccurred);
		this.world.removeComponent(entity, SimonComponent.PlaybackCompleted);
		this.world.removeComponent(entity, SimonComponent.RoundCompleted);
		this.world.removeComponent(entity, SimonComponent.RoundStartRequest);
		this.world.removeComponent(entity, SimonComponent.OrderGenerationRequest);
	}

	private ensureProgressComponents(entity: Entity): void {
		if (!this.world.hasComponent(entity, SimonComponent.Score)) {
			this.world.addComponent<SimonScoreComponent>(entity, SimonComponent.Score, {
				score: 0,
				best: this.bestScore
			});
		}

		if (!this.world.hasComponent(entity, SimonComponent.Lives)) {
			this.world.addComponent<SimonLivesComponent>(entity, SimonComponent.Lives, {
				lives: 3
			});
		}

		if (!this.world.hasComponent(entity, SimonComponent.Combo)) {
			this.world.addComponent<SimonComboComponent>(entity, SimonComponent.Combo, {
				combo: 0
			});
		}

		if (!this.world.hasComponent(entity, SimonComponent.Level)) {
			this.world.addComponent<SimonLevelComponent>(entity, SimonComponent.Level, {
				level: 1
			});
		}
	}

	private getLives(entity: Entity): number {
		const lives = this.world.getComponent<SimonLivesComponent>(
			entity,
			SimonComponent.Lives
		);

		if (!lives) {
			return 0;
		}

		return Math.max(0, Math.floor(lives.lives));
	}

	private safeTransition(event: SimonTransitionEventId): boolean {
		if (!this.stateMachine.can(event)) {
			return false;
		}

		const from = this.stateMachine.state;
		const to = this.stateMachine.dispatch(event);

		this.events.emit(SimonEvent.StateChanged, { from, to });
		this.afterTransition(to);

		return true;
	}

	private forcedTransition(event: SimonTransitionEventId): void {
		if (!this.stateMachine.can(event)) {
			throw new Error(
				`[SimonRuntime] Illegal transition from ${this.stateMachine.state} on ${event}`
			);
		}

		const from = this.stateMachine.state;
		const to = this.stateMachine.dispatch(event);

		this.events.emit(SimonEvent.StateChanged, { from, to });
		this.afterTransition(to);
	}

	private afterTransition(to: SimonStateId): void {
		const entity = this.gameEntity;

		if (to === SimonState.ShowingPattern) {
			this.lastPlaybackStepIndex = -1;

			if (entity !== null && this.world.isAlive(entity)) {
				this.world.removeComponent(entity, SimonComponent.InputTimer);
				this.world.removeComponent(entity, SimonComponent.FeedbackTimer);

				if (this.mode === SimonMode.Classic) {
					this.world.addComponent(entity, SimonComponent.RoundStartRequest, {
						round: this.currentClassicRound
					});
				}
			}
		}

		if (to === SimonState.AwaitingInput) {
			if (entity !== null && this.world.isAlive(entity)) {
				const pattern = this.world.getComponent<SimonPatternComponent>(
					entity,
					SimonComponent.Pattern
				);

				if (pattern) {
					const durationMs = pattern.sequence.length * 1400 + 1200;

					this.world.addComponent<SimonInputTimerComponent>(
						entity,
						SimonComponent.InputTimer,
						{
							elapsedMs: 0,
							durationMs,
							expired: false
						}
					);
				}
			}
		}

		if (to === SimonState.RoundTransition) {
			if (entity !== null && this.world.isAlive(entity)) {
				this.world.removeComponent(entity, SimonComponent.InputTimer);

				this.world.addComponent<SimonFeedbackTimerComponent>(
					entity,
					SimonComponent.FeedbackTimer,
					{
						elapsedMs: 0,
						durationMs: 950,
						completed: false
					}
				);
			}
		}

		if (to === SimonState.OrdersIssuing) {
			if (entity !== null && this.world.isAlive(entity)) {
				this.world.removeComponent(entity, SimonComponent.FeedbackTimer);

				this.world.addComponent(entity, SimonComponent.OrderGenerationRequest, {
					round: this.nextOrdersRound
				});
			}

			this.statusMessage = 'Ожидание приказа…';
		}

		if (to === SimonState.OrdersFeedback) {
			if (entity !== null && this.world.isAlive(entity)) {
				this.world.addComponent<SimonFeedbackTimerComponent>(
					entity,
					SimonComponent.FeedbackTimer,
					{
						elapsedMs: 0,
						durationMs: 720,
						completed: false
					}
				);
			}
		}

		if (
			to === SimonState.FailureOrders ||
			to === SimonState.FailureClassic
		) {
			if (entity !== null && this.world.isAlive(entity)) {
				this.world.removeComponent(entity, SimonComponent.FeedbackTimer);

				if (to === SimonState.FailureClassic) {
					this.world.removeComponent(entity, SimonComponent.InputTimer);
				}
			}

			this.statusMessage = 'Ошибка. Нажмите ОК, чтобы продолжить.';
		}

		if (to === SimonState.GameOver) {
			this.persistScore();
			this.statusMessage = 'Сеанс завершён из-за нарушений.';
		}
	}

	private createClassicFailureMessage(
		entity: Entity,
		failure: SimonFailureOccurredComponent
	): string {
		if (failure.reason === 'TIMEOUT') {
			return 'Время ожидания истекло. Пользователь не подтвердил последовательность.';
		}

		const pattern = this.world.getComponent<SimonPatternComponent>(
			entity,
			SimonComponent.Pattern
		);

		const expectedPad = pattern?.sequence[failure.step];
		const expectedLabel = expectedPad
			? this.getPadLabel(expectedPad)
			: 'неизвестная кнопка';

		return `Нарушена последовательность проведения: ожидался «${expectedLabel}». Последовательность не восстановима — регистр разнесён.`;
	}

	private getPadLabel(pad: SimonPadId): string {
		switch (pad) {
			case SimonPad.Provesti:
				return 'Провести';
			case SimonPad.Zapisat:
				return 'Записать';
			case SimonPad.Udalit:
				return 'Пометить на удаление';
			case SimonPad.Eshche:
				return 'Ещё…';
		}
	}

	private emitConsole(text: string, kind: (typeof SimonConsoleKind)[keyof typeof SimonConsoleKind]): void {
		this.events.emit(SimonEvent.ConsoleMessageReceived, {
			text,
			kind
		});
	}

	private updateBest(score: number): void {
		const safeScore = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;

		if (safeScore <= this.bestScore) {
			return;
		}

		this.bestScore = safeScore;
		this.persistBest();
	}

	private persistScore(): void {
		const entity = this.gameEntity;

		if (entity === null || !this.world.isAlive(entity)) {
			return;
		}

		const score = this.world.getComponent<SimonScoreComponent>(
			entity,
			SimonComponent.Score
		);

		const safeScore =
			score && Number.isFinite(score.score) && score.score > 0
				? Math.floor(score.score)
				: 0;

		saveScore('simon', safeScore);
		this.updateBest(safeScore);
	}

	private loadBest(): number {
		if (typeof window === 'undefined') {
			return 0;
		}

		try {
			const raw = window.localStorage.getItem('simon1c_best');

			if (raw === null) {
				return 0;
			}

			const parsed = Number.parseInt(raw, 10);

			if (!Number.isFinite(parsed) || parsed <= 0) {
				return 0;
			}

			return parsed;
		} catch {
			return 0;
		}
	}

	private persistBest(): void {
		if (typeof window === 'undefined') {
			return;
		}

		try {
			window.localStorage.setItem('simon1c_best', String(this.bestScore));
		} catch {
			return;
		}
	}

	private buildSnapshot(): SimonUiSnapshot {
		const state = this.stateMachine.state;
		const entity = this.gameEntity;

		let round = 0;
		let score = 0;
		let combo = 0;
		let lives = 3;
		let level = 1;
		let activePad: SimonPadId | null = null;
		let inputLocked = true;
		let orderText = 'Нажмите «Начать смену», чтобы приступить.';
		let orderSay = false;
		let orderPad: SimonPadId | null = null;
		let timerProgress = 0;

		if (entity !== null && this.world.isAlive(entity)) {
			const roundComponent = this.world.getComponent<SimonRoundComponent>(
				entity,
				SimonComponent.Round
			);

			if (roundComponent) {
				round = roundComponent.round;
			}

			const scoreComponent = this.world.getComponent<SimonScoreComponent>(
				entity,
				SimonComponent.Score
			);

			if (scoreComponent) {
				score = Math.max(0, Math.floor(scoreComponent.score));
			}

			const comboComponent = this.world.getComponent<SimonComboComponent>(
				entity,
				SimonComponent.Combo
			);

			if (comboComponent) {
				combo = Math.max(0, Math.floor(comboComponent.combo));
			}

			const livesComponent = this.world.getComponent<SimonLivesComponent>(
				entity,
				SimonComponent.Lives
			);

			if (livesComponent) {
				lives = Math.max(0, Math.floor(livesComponent.lives));
			}

			const levelComponent = this.world.getComponent<SimonLevelComponent>(
				entity,
				SimonComponent.Level
			);

			if (levelComponent) {
				level = Math.max(1, Math.floor(levelComponent.level));
			}

			const playback = this.world.getComponent<SimonPlaybackComponent>(
				entity,
				SimonComponent.Playback
			);

			if (playback && state === SimonState.ShowingPattern) {
				activePad = playback.activePad;
			}

			if (activePad === null) {
				activePad = this.manualActivePad;
			}

			const input = this.world.getComponent<SimonInputComponent>(
				entity,
				SimonComponent.Input
			);

			if (state === SimonState.AwaitingInput && input) {
				inputLocked = input.locked;
			}

			if (state === SimonState.OrdersAwaiting) {
				inputLocked = false;
			}

			const order = this.world.getComponent<SimonOrderComponent>(
				entity,
				SimonComponent.Order
			);

			if (order) {
				orderSay = order.say;
				orderPad = order.pad;

				const label = this.getPadLabel(order.pad);

				orderText = order.say
					? `1С говорит: нажмите «${label}»!`
					: `«${label}»… (команда НЕ от 1С)`;
			}

			const orderTimer = this.world.getComponent<SimonOrderTimerComponent>(
				entity,
				SimonComponent.OrderTimer
			);

			if (orderTimer && orderTimer.durationMs > 0) {
				timerProgress = Math.max(
					0,
					Math.min(1, 1 - orderTimer.elapsedMs / orderTimer.durationMs)
				);
			}

			const inputTimer = this.world.getComponent<SimonInputTimerComponent>(
				entity,
				SimonComponent.InputTimer
			);

			if (inputTimer && inputTimer.durationMs > 0) {
				timerProgress = Math.max(
					0,
					Math.min(1, 1 - inputTimer.elapsedMs / inputTimer.durationMs)
				);
			}

			const pattern = this.world.getComponent<SimonPatternComponent>(
				entity,
				SimonComponent.Pattern
			);

			if (state === SimonState.ShowingPattern) {
				orderText = 'Запомните последовательность…';
			}

			if (state === SimonState.AwaitingInput && pattern && input) {
				const step = Math.min(input.expectedIndex + 1, pattern.sequence.length);
				orderText = `Повторите последовательность! (шаг ${step} из ${pattern.sequence.length})`;
			}

			if (state === SimonState.RoundTransition) {
				orderText = this.lastFeedbackMessage || 'Проведение документа…';
			}

			if (state === SimonState.OrdersIssuing) {
				orderText = 'Ожидание приказа…';
			}

			if (state === SimonState.OrdersFeedback) {
				orderText = this.lastFeedbackMessage || 'Документ проведён успешно.';
			}

			if (state === SimonState.FailureOrders || state === SimonState.FailureClassic) {
				orderText = this.lastFailureMessage || 'Ошибка 1С:Предприятия.';
			}
		}

		if (state === SimonState.GameOver) {
			orderText = 'Сеанс завершён.';
		}

		const failureReason =
			state === SimonState.FailureOrders ||
			state === SimonState.FailureClassic ||
			state === SimonState.GameOver
				? this.lastFailureReason
				: null;

		const failureMessage =
			state === SimonState.FailureOrders ||
			state === SimonState.FailureClassic ||
			state === SimonState.GameOver
				? this.lastFailureMessage
				: null;

		return {
			state,
			difficulty: this.difficulty,
			round,
			clicksTotal: score,
			activePad,
			inputLocked,
			failureReason,
			mode: this.mode,
			score,
			combo,
			lives,
			level,
			best: this.bestScore,
			orderText,
			orderSay,
			orderPad,
			timerProgress,
			statusText: this.statusMessage,
			failureMessage
		};
	}

	private syncUi(): void {
		const snapshot = this.buildSnapshot();

		const key = [
			snapshot.state,
			snapshot.mode ?? 'null',
			snapshot.difficulty,
			snapshot.round,
			snapshot.clicksTotal,
			snapshot.score ?? 0,
			snapshot.combo ?? 0,
			snapshot.lives ?? 3,
			snapshot.level ?? 1,
			snapshot.best ?? 0,
			snapshot.activePad ?? 'null',
			String(snapshot.inputLocked),
			snapshot.failureReason ?? 'null',
			snapshot.orderText ?? '',
			snapshot.orderSay ? '1' : '0',
			snapshot.orderPad ?? 'null',
			Math.round((snapshot.timerProgress ?? 0) * 1000),
			snapshot.statusText ?? '',
			snapshot.failureMessage ?? 'null'
		].join('|');

		if (key === this.lastUiKey) {
			return;
		}

		this.lastUiKey = key;
		this.events.emit(SimonEvent.UiSync, snapshot);
	}

	private handleLoopError(error: unknown, phase: GameLoopPhaseId): void {
		console.error(`[SimonRuntime] Loop ${phase} failed`, error);
	}

	private assertNotDestroyed(): void {
		if (this.destroyed) {
			throw new Error('[SimonRuntime] Runtime is destroyed');
		}
	}

  	acknowledgeFailure(): void {
		this.assertNotDestroyed();

		const state = this.stateMachine.state;
		const entity = this.gameEntity;

		if (entity === null || !this.world.isAlive(entity)) {
			return;
		}

		if (state === SimonState.FailureOrders) {
			const lives = this.getLives(entity);

			if (lives > 0) {
				this.nextOrdersRound += 1;
				this.safeTransition(SimonEvent.FailureRecoveredOrders);
			} else {
				this.safeTransition(SimonEvent.FailureGameOver);
			}

			return;
		}

		if (state === SimonState.FailureClassic) {
			const lives = this.getLives(entity);

			if (lives > 0) {
				this.currentClassicRound += 1;
				this.safeTransition(SimonEvent.FailureRecoveredClassic);
			} else {
				this.safeTransition(SimonEvent.FailureGameOver);
			}
		}
	}
}