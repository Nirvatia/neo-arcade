import type { World } from "./World.js";
import type { System } from "./types.js";

export abstract class SystemBase implements System {
  public abstract readonly name: string;
  protected readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  public abstract update(deltaMS: number): void;
}