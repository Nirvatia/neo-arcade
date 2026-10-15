export const GameLoopPhase = {
	Update: 'UPDATE',
	Render: 'RENDER'
} as const;

export type GameLoopPhaseId = (typeof GameLoopPhase)[keyof typeof GameLoopPhase];

export interface GameLoopCallbacks {
  update: (deltaMs: number) => void;
  render: (deltaMs: number) => void;
  onError?: (error: unknown, phase: GameLoopPhaseId) => void;
}

export class GameLoop {
  private readonly callbacks: GameLoopCallbacks;
  private readonly maxDeltaMs = 250;
  private rafId: number | null = null;
  private lastTimeMs: number | null = null;
  private running = false;

  constructor(callbacks: GameLoopCallbacks) {
    this.callbacks = callbacks;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) {
      return;
    }

    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      throw new Error('[GameLoop] requestAnimationFrame is unavailable');
    }

    this.running = true;
    this.lastTimeMs = null;
    this.rafId = window.requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.lastTimeMs = null;
  }

  private tick = (timeMs: number): void => {
    if (!this.running) {
      return;
    }

    if (this.lastTimeMs === null) {
      this.lastTimeMs = timeMs;
      this.rafId = window.requestAnimationFrame(this.tick);
      return;
    }

    let deltaMs = timeMs - this.lastTimeMs;
    this.lastTimeMs = timeMs;

    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      deltaMs = 0;
    }

    if (deltaMs > this.maxDeltaMs) {
      deltaMs = this.maxDeltaMs;
    }

    try {
      this.callbacks.update(deltaMs);
    } catch (error) {
      this.handleError(error, GameLoopPhase.Update);
      return;
    }

    try {
      this.callbacks.render(deltaMs);
    } catch (error) {
      this.handleError(error, GameLoopPhase.Render);
      return;
    }

    this.rafId = window.requestAnimationFrame(this.tick);
  };

  private handleError(error: unknown, phase: GameLoopPhaseId): void {
    this.stop();

    if (this.callbacks.onError) {
      this.callbacks.onError(error, phase);
      return;
    }

    throw error;
  }
}