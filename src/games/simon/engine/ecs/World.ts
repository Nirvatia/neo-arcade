import { ComponentManager } from './ComponentManager';
import { EntityManager } from './EntityManager';
import type { ComponentName, Entity } from './types';

export interface WorldSystemContext {
  world: World;
  deltaMs: number;
}

export interface WorldSystem {
  readonly name: string;
  readonly priority?: number;
  update(context: WorldSystemContext): void;
}

export class World {
  private readonly entities = new EntityManager();
  private readonly components: ComponentManager;
  private systems: WorldSystem[] = [];
  private systemsSorted = true;

  constructor() {
    this.components = new ComponentManager(this.entities);
  }

  createEntity(): Entity {
    return this.entities.create();
  }

  destroyEntity(entity: Entity): void {
    if (!this.entities.isAlive(entity)) {
      return;
    }

    this.components.removeAll(entity);
    this.entities.destroy(entity);
  }

  isAlive(entity: Entity): boolean {
    return this.entities.isAlive(entity);
  }

  addComponent<T>(entity: Entity, name: ComponentName, data: T): void {
    this.components.add(entity, name, data);
  }

  hasComponent(entity: Entity, name: ComponentName): boolean {
    return this.components.has(entity, name);
  }

  getComponent<T>(entity: Entity, name: ComponentName): T | undefined {
    return this.components.get<T>(entity, name);
  }

  requireComponent<T>(entity: Entity, name: ComponentName): T {
    return this.components.require<T>(entity, name);
  }

  removeComponent(entity: Entity, name: ComponentName): void {
    this.components.remove(entity, name);
  }

  query(names: ReadonlyArray<ComponentName>): Entity[] {
    return this.components.query(names);
  }

  addSystem(system: WorldSystem): void {
    const alreadyExists = this.systems.some((existing) => existing.name === system.name);

    if (alreadyExists) {
      throw new Error(`[World] Duplicate system ${system.name}`);
    }

    this.systems.push(system);
    this.systemsSorted = false;
  }

  removeSystem(name: string): void {
    const before = this.systems.length;
    this.systems = this.systems.filter((system) => system.name !== name);

    if (this.systems.length !== before) {
      this.systemsSorted = false;
    }
  }

  update(deltaMs: number): void {
    let safeDeltaMs = deltaMs;

    if (!Number.isFinite(safeDeltaMs) || safeDeltaMs < 0) {
      safeDeltaMs = 0;
    }

    if (!this.systemsSorted) {
      this.systems.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      this.systemsSorted = true;
    }

    for (const system of this.systems) {
      system.update({ world: this, deltaMs: safeDeltaMs });
    }
  }

  clearEntities(): void {
    this.components.clear();
    this.entities.clear();
  }

  dispose(): void {
    this.clearEntities();
    this.systems = [];
    this.systemsSorted = true;
  }
}