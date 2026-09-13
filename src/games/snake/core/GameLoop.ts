import type { World } from "./ecs/World.js";

export class GameLoop {
  private readonly world: World;
  private readonly maxDeltaMS: number;
  private running = false;
  private paused = false;

  constructor(world: World, maxDeltaMS: number) {
    this.world = world;
    this.maxDeltaMS = maxDeltaMS;
  }

  public tick(deltaMS: number): void {
    if (!this.running) {
      return;
    }
    if (this.paused) {
      return;
    }
    const clamped = Math.min(deltaMS, this.maxDeltaMS);
    this.world.update(clamped);
  }

  public start(): void {
    this.running = true;
  }

  public stop(): void {
    this.running = false;
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public isPaused(): boolean {
    return this.paused;
  }
}