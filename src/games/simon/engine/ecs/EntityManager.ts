import type { Entity } from './types';

export class EntityManager {
  private nextId = 1;
  private readonly alive = new Set<Entity>();

  create(): Entity {
    const entity = this.nextId;
    this.nextId += 1;
    this.alive.add(entity);
    return entity;
  }

  isAlive(entity: Entity): boolean {
    return this.alive.has(entity);
  }

  destroy(entity: Entity): void {
    this.alive.delete(entity);
  }

  clear(): void {
    this.alive.clear();
    this.nextId = 1;
  }
}