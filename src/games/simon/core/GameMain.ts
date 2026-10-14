import type { GameModule } from '../../../shared/core/types';
import { SimonAudioPlayer } from '../audio/SimonAudioPlayer';
import { EventBus } from '../engine/EventBus';
import { SimonEvent, type SimonEventPayloads, type SimonUiSnapshot } from './Events';
import { SimonRuntime } from './SimonRuntime';
import {
  SimonState,
  type SimonDifficultyId,
  type SimonPadId,
  type SimonStateId
} from './SimonTypes';

export class SimonGame implements GameModule {
  private readonly events = new EventBus<SimonEventPayloads>();
  private readonly runtime: SimonRuntime;
  private readonly audio: SimonAudioPlayer;
  private container: HTMLDivElement | null = null;
  private destroyed = false;

  constructor() {
    this.runtime = new SimonRuntime(this.events);
    this.audio = new SimonAudioPlayer(this);
  }

  async init(container: HTMLDivElement): Promise<void> {
    this.assertNotDestroyed();

    if (!container) {
      throw new Error('[SimonGame] Container is required');
    }

    if (this.runtime.state !== SimonState.Boot) {
      throw new Error('[SimonGame] Game is already initialized');
    }

    this.container = container;
    this.runtime.boot();
    this.runtime.start();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.container = null;

    this.audio.destroy();
    this.runtime.destroy();
    this.events.clear();
  }

  get state(): SimonStateId {
    return this.runtime.state;
  }

  get selectedDifficulty(): SimonDifficultyId {
    return this.runtime.selectedDifficulty;
  }

  get uiSnapshot(): SimonUiSnapshot {
    return this.runtime.getSnapshot();
  }

  on<K extends keyof SimonEventPayloads>(
    event: K,
    listener: (payload: SimonEventPayloads[K]) => void
  ): () => void {
    this.assertNotDestroyed();
    return this.events.on(event, listener);
  }

  selectDifficulty(difficulty: SimonDifficultyId): void {
    this.assertNotDestroyed();
    this.runtime.selectDifficulty(difficulty);
  }

  requestStart(): void {
    this.assertNotDestroyed();
    this.runtime.requestStart();
  }

  requestRestart(): void {
    this.assertNotDestroyed();
    this.runtime.requestRestart();
  }

  pressPad(pad: SimonPadId): void {
    this.assertNotDestroyed();
    this.runtime.pressPad(pad);
  }

  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error('[SimonGame] Game is destroyed');
    }
  }
}