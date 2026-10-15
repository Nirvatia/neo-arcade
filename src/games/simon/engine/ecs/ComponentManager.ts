import type { EntityManager } from './EntityManager';
import type { ComponentName, Entity } from './types';

export class ComponentManager {
  private readonly stores = new Map<ComponentName, Map<Entity, unknown>>();
  private readonly entities: EntityManager;

  constructor(entities: EntityManager) {
    this.entities = entities;
  }

  add<T>(entity: Entity, name: ComponentName, data: T): void {
    if (!this.entities.isAlive(entity)) {
      throw new Error(`[ComponentManager] Cannot add component ${name} to dead entity ${entity}`);
    }

    if (name.length === 0) {
      throw new Error('[ComponentManager] Component name cannot be empty');
    }

    let store = this.stores.get(name);
    if (!store) {
      store = new Map();
      this.stores.set(name, store);
    }

    store.set(entity, data);
  }

  has(entity: Entity, name: ComponentName): boolean {
    if (!this.entities.isAlive(entity)) {
      return false;
    }

    return this.stores.get(name)?.has(entity) ?? false;
  }

  get<T>(entity: Entity, name: ComponentName): T | undefined {
    if (!this.entities.isAlive(entity)) {
      return undefined;
    }

    return this.stores.get(name)?.get(entity) as T | undefined;
  }

  require<T>(entity: Entity, name: ComponentName): T {
    if (!this.entities.isAlive(entity)) {
      throw new Error(`[ComponentManager] Entity ${entity} is not alive`);
    }

    const store = this.stores.get(name);
    if (!store || !store.has(entity)) {
      throw new Error(`[ComponentManager] Component ${name} not found on entity ${entity}`);
    }

    return store.get(entity) as T;
  }

  remove(entity: Entity, name: ComponentName): void {
    this.stores.get(name)?.delete(entity);
  }

  removeAll(entity: Entity): void {
    for (const store of this.stores.values()) {
      store.delete(entity);
    }
  }

  clear(): void {
    this.stores.clear();
  }

  query(names: ReadonlyArray<ComponentName>): Entity[] {
    if (names.length === 0) {
      return [];
    }

    let candidate: Map<Entity, unknown> | null = null;

    for (const name of names) {
      const store = this.stores.get(name);

      if (!store || store.size === 0) {
        return [];
      }

      if (!candidate || store.size < candidate.size) {
        candidate = store;
      }
    }

    if (!candidate) {
      return [];
    }

    const result: Entity[] = [];

    for (const entity of candidate.keys()) {
      if (!this.entities.isAlive(entity)) {
        continue;
      }

      let matches = true;

      for (const name of names) {
        const store = this.stores.get(name);

        if (!store || !store.has(entity)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        result.push(entity);
      }
    }

    return result;
  }
}