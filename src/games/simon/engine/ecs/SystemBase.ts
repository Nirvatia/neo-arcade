export interface SystemContext<TWorld> {
  world: TWorld;
  deltaMs: number;
}

export abstract class SystemBase<TWorld = unknown> {
  abstract readonly name: string;

  readonly priority: number;

  constructor(priority = 0) {
    this.priority = priority;
  }

  abstract update(context: SystemContext<TWorld>): void;
}