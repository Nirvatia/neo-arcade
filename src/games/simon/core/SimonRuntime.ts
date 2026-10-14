import { saveScore } from '../../../shared/utils/scoreStore';
import {
  SimonComponent,
  type SimonFailureOccurredComponent,
  type SimonInputComponent,
  type SimonInputQueueComponent,
  type SimonPatternComponent,
  type SimonPlaybackCompletedComponent,
  type SimonPlaybackComponent,
  type SimonRoundCompletedComponent,
  type SimonRoundComponent,
  type SimonStatsComponent
} from '../components/SimonComponents';
import { EventBus } from '../engine/EventBus';
import { GameLoop, type GameLoopPhaseId } from '../engine/GameLoop';
import type { Entity } from '../engine/ecs/types';
import type { World } from '../engine/ecs/World';
import { World as SimonWorld } from '../engine/ecs/World';
import type { StateMachine } from '../engine/StateMachine';
import { InputSystem } from '../systems/InputSystem';
import { PatternGenerationSystem } from '../systems/PatternGenerationSystem';
import { PlaybackSystem } from '../systems/PlaybackSystem';
import {
  SimonEvent,
  type SimonEventPayloads,
  type SimonTransitionEventId,
  type SimonUiSnapshot
} from './Events';
import { createSimonStateMachine } from './SimonStateMachine';
import {
  SimonDifficulty,
  SimonDifficultySettings,
  SimonPadList,
  SimonState,
  type SimonDifficultyId,
  type SimonFailureReasonId,
  type SimonPadId,
  type SimonStateId
} from './SimonTypes';

export class SimonRuntime {
  private readonly events: EventBus<SimonEventPayloads>;
  private readonly world: World;
  private readonly stateMachine: StateMachine<SimonStateId, SimonTransitionEventId>;
  private readonly loop: GameLoop;

  private difficulty: SimonDifficultyId = SimonDifficulty.Easy;
  private gameEntity: Entity | null = null;
  private currentRound = 1;
  private lastFailureReason: SimonFailureReasonId | null = null;
  private lastUiKey = '';
  private destroyed = false;

  private failureElapsedMs = 0;
  private readonly failureDelayMs = 1200;
  private lastPlaybackStepIndex = -1;

  constructor(events: EventBus<SimonEventPayloads>) {
    this.events = events;
    this.world = new SimonWorld();
    this.stateMachine = createSimonStateMachine();

    this.world.addSystem(new PatternGenerationSystem());
    this.world.addSystem(new PlaybackSystem());
    this.world.addSystem(new InputSystem());

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
      throw new Error(`[SimonRuntime] Cannot select difficulty in state ${this.stateMachine.state}`);
    }

    if (!Object.prototype.hasOwnProperty.call(SimonDifficultySettings, difficulty)) {
      throw new Error(`[SimonRuntime] Unknown difficulty ${difficulty}`);
    }

    this.difficulty = difficulty;

    if (this.gameEntity !== null && this.world.isAlive(this.gameEntity)) {
      this.world.addComponent(this.gameEntity, SimonComponent.Difficulty, {
        difficulty
      });
    }

    this.events.emit(SimonEvent.DifficultySelected, { difficulty });
    this.syncUi();
  }

  requestStart(): void {
    this.assertNotDestroyed();

    this.forcedTransition(SimonEvent.StartRequested);

    this.currentRound = 1;
    this.lastFailureReason = null;
    this.failureElapsedMs = 0;
    this.lastPlaybackStepIndex = -1;

    const entity = this.ensureGameEntity();

    this.world.addComponent(entity, SimonComponent.Difficulty, {
      difficulty: this.difficulty
    });

    this.world.addComponent(entity, SimonComponent.RoundStartRequest, {
      round: this.currentRound
    });

    this.events.emit(SimonEvent.StartRequested, { difficulty: this.difficulty });
    this.syncUi();
  }

  requestRestart(): void {
    this.assertNotDestroyed();

    this.forcedTransition(SimonEvent.RestartRequested);

    this.world.clearEntities();
    this.gameEntity = null;
    this.currentRound = 1;
    this.lastFailureReason = null;
    this.failureElapsedMs = 0;
    this.lastPlaybackStepIndex = -1;
    this.lastUiKey = '';

    this.events.emit(SimonEvent.RestartRequested, null);
    this.syncUi();
  }

  pressPad(pad: SimonPadId): void {
    this.assertNotDestroyed();

    if (!SimonPadList.includes(pad)) {
      throw new Error(`[SimonRuntime] Unknown pad ${pad}`);
    }

    if (this.stateMachine.state !== SimonState.AwaitingInput) {
      return;
    }

    const entity = this.gameEntity;
    if (entity === null || !this.world.isAlive(entity)) {
      return;
    }

    const input = this.world.getComponent<SimonInputComponent>(
      entity,
      SimonComponent.Input
    );

    if (!input || input.locked) {
      return;
    }

    const queue = this.world.getComponent<SimonInputQueueComponent>(
      entity,
      SimonComponent.InputQueue
    );

    if (!queue) {
      return;
    }

    if (queue.commands.length >= 12) {
      queue.commands.shift();
    }

    queue.commands.push(pad);
    this.events.emit(SimonEvent.PadPressed, { pad });
  }

  getSnapshot(): SimonUiSnapshot {
    return this.buildSnapshot();
  }

  private update(deltaMs: number): void {
    if (this.destroyed) {
      return;
    }

    const state = this.stateMachine.state;

    if (state === SimonState.Failure) {
      this.failureElapsedMs = Math.max(0, this.failureElapsedMs + deltaMs);

      if (this.failureElapsedMs >= this.failureDelayMs) {
        this.safeTransition(SimonEvent.FailureSequenceCompleted);
      }

      return;
    }

    if (
      state === SimonState.ShowingPattern ||
      state === SimonState.AwaitingInput ||
      state === SimonState.RoundTransition
    ) {
      this.world.update(deltaMs);
      this.drainFlags();
      this.emitPlaybackSteps();
    }
  }

  private render(): void {
    if (this.destroyed) {
      return;
    }

    this.syncUi();
  }

  private drainFlags(): void {
    const entity = this.gameEntity;

    if (entity === null || !this.world.isAlive(entity)) {
      return;
    }

    if (this.world.hasComponent(entity, SimonComponent.FailureOccurred)) {
      const failure = this.world.requireComponent<SimonFailureOccurredComponent>(
        entity,
        SimonComponent.FailureOccurred
      );

      this.world.removeComponent(entity, SimonComponent.FailureOccurred);
      this.lastFailureReason = failure.reason;
      this.failureElapsedMs = 0;

      if (this.safeTransition(SimonEvent.InputRejected)) {
        this.events.emit(SimonEvent.InputRejected, {
          round: failure.round,
          step: failure.step,
          pad: failure.pad,
          reason: failure.reason
        });
      }

      return;
    }

    if (this.world.hasComponent(entity, SimonComponent.PlaybackCompleted)) {
      const completed = this.world.requireComponent<SimonPlaybackCompletedComponent>(
        entity,
        SimonComponent.PlaybackCompleted
      );

      this.world.removeComponent(entity, SimonComponent.PlaybackCompleted);

      if (this.safeTransition(SimonEvent.PatternPlaybackCompleted)) {
        this.events.emit(SimonEvent.PatternPlaybackCompleted, {
          round: completed.round
        });
      }
    }

    if (this.world.hasComponent(entity, SimonComponent.RoundCompleted)) {
      const completed = this.world.requireComponent<SimonRoundCompletedComponent>(
        entity,
        SimonComponent.RoundCompleted
      );

      this.world.removeComponent(entity, SimonComponent.RoundCompleted);

      if (this.safeTransition(SimonEvent.InputSequenceCompleted)) {
        this.events.emit(SimonEvent.InputSequenceCompleted, {
          round: completed.round
        });

        this.currentRound = completed.round + 1;

        this.world.addComponent(entity, SimonComponent.RoundStartRequest, {
          round: this.currentRound
        });

        this.safeTransition(SimonEvent.RoundTransitionCompleted);
      }
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
        round: roundComponent?.round ?? this.currentRound
      });
    }
  }

  private ensureGameEntity(): Entity {
    if (this.gameEntity !== null && this.world.isAlive(this.gameEntity)) {
      return this.gameEntity;
    }

    const entity = this.world.createEntity();
    this.gameEntity = entity;

    this.world.addComponent(entity, SimonComponent.Difficulty, {
      difficulty: this.difficulty
    });

    return entity;
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
    if (to === SimonState.ShowingPattern) {
      this.lastPlaybackStepIndex = -1;
    }

    if (to === SimonState.Failure) {
      this.failureElapsedMs = 0;
    }

    if (to === SimonState.GameOver) {
      this.persistScore();
    }
  }

  private persistScore(): void {
    const entity = this.gameEntity;

    if (entity === null || !this.world.isAlive(entity)) {
      return;
    }

    const stats = this.world.getComponent<SimonStatsComponent>(
      entity,
      SimonComponent.Stats
    );

    if (!stats) {
      return;
    }

    const score =
      Number.isFinite(stats.clicksTotal) && stats.clicksTotal > 0
        ? Math.floor(stats.clicksTotal)
        : 0;

    saveScore('simon', score);
  }

  private buildSnapshot(): SimonUiSnapshot {
    const entity = this.gameEntity;

    let round = this.currentRound;
    let clicksTotal = 0;
    let activePad: SimonPadId | null = null;
    let inputLocked = true;
    let failureReason: SimonFailureReasonId | null = null;

    if (entity !== null && this.world.isAlive(entity)) {
      const roundComponent = this.world.getComponent<SimonRoundComponent>(
        entity,
        SimonComponent.Round
      );

      if (roundComponent) {
        round = roundComponent.round;
      }

      const stats = this.world.getComponent<SimonStatsComponent>(
        entity,
        SimonComponent.Stats
      );

      if (stats) {
        clicksTotal = stats.clicksTotal;
      }

      const playback = this.world.getComponent<SimonPlaybackComponent>(
        entity,
        SimonComponent.Playback
      );

      if (playback && this.stateMachine.state === SimonState.ShowingPattern) {
        activePad = playback.activePad;
      }

      const input = this.world.getComponent<SimonInputComponent>(
        entity,
        SimonComponent.Input
      );

      if (input) {
        inputLocked = input.locked;
      }
    }

    if (
      this.stateMachine.state === SimonState.Failure ||
      this.stateMachine.state === SimonState.GameOver
    ) {
      failureReason = this.lastFailureReason;
    }

    return {
      state: this.stateMachine.state,
      difficulty: this.difficulty,
      round,
      clicksTotal,
      activePad,
      inputLocked,
      failureReason
    };
  }

  private syncUi(): void {
    const snapshot = this.buildSnapshot();
    const key = [
      snapshot.state,
      snapshot.difficulty,
      snapshot.round,
      snapshot.clicksTotal,
      snapshot.activePad ?? 'null',
      String(snapshot.inputLocked),
      snapshot.failureReason ?? 'null'
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
}