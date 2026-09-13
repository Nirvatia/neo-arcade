import type { EntityId } from "./types.js";

export class EntityManager {
  private nextId: EntityId = 0;
  private alive = new Set<EntityId>();
  private freeList: EntityId[] = [];

  public create(): EntityId {
    const recycled = this.freeList.pop();
    let id: EntityId;
    if (recycled === undefined) {
      id = this.nextId;
      this.nextId = this.nextId + 1;
    } else {
      id = recycled;
    }
    this.alive.add(id);
    return id;
  }

  public destroy(id: EntityId): void {
    if (!this.alive.has(id)) {
      throw new Error(`EntityManager.destroy: entity ${id} is not alive.`);
    }
    this.alive.delete(id);
    this.freeList.push(id);
  }

  public isAlive(id: EntityId): boolean {
    return this.alive.has(id);
  }

  public all(): EntityId[] {
    return Array.from(this.alive);
  }

  public count(): number {
    return this.alive.size;
  }

  public clear(): void {
    this.alive.clear();
    this.freeList = [];
    this.nextId = 0;
  }
}