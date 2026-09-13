    import { EntityManager } from "./EntityManager.js";
import { ComponentRegistry } from "./ComponentRegistry.js";
import { Query } from "./Query.js";
import { EventBus } from "../EventBus.js";
import type { System, EntityId } from "./types.js";
import type { ComponentKey, ComponentDataMap } from "../../components/index.js";
import type { SnakeEventMap } from "../Events.js";

export class World {
  public readonly entities: EntityManager;
  public readonly components: ComponentRegistry;
  public readonly events: EventBus<SnakeEventMap>;

  private systems: System[] = [];
  private queryCache = new Map<string, Query>();

  constructor() {
    this.entities = new EntityManager();
    this.components = new ComponentRegistry();
    this.events = new EventBus<SnakeEventMap>();
  }

  public addSystem(system: System): void {
    this.systems.push(system);
  }

  public update(deltaMS: number): void {
    for (const system of this.systems) {
      system.update(deltaMS);
    }
  }

  public createEntity(): EntityId {
    return this.entities.create();
  }

  public destroyEntity(id: EntityId): void {
    this.components.removeAll(id);
    this.entities.destroy(id);
  }

  public addComponent<K extends ComponentKey>(
    entity: EntityId,
    key: K,
    data: ComponentDataMap[K],
  ): void {
    this.components.add(entity, key, data);
  }

  public getComponent<K extends ComponentKey>(
    entity: EntityId,
    key: K,
  ): ComponentDataMap[K] | undefined {
    return this.components.get(entity, key);
  }

  public hasComponent(entity: EntityId, key: ComponentKey): boolean {
    return this.components.has(entity, key);
  }

  public removeComponent(entity: EntityId, key: ComponentKey): void {
    this.components.remove(entity, key);
  }

  public query(keys: ComponentKey[]): Query {
    const signature = keys.slice().sort().join("|");
    let cached = this.queryCache.get(signature);
    if (cached === undefined) {
      cached = new Query(this, keys);
      this.queryCache.set(signature, cached);
    }
    return cached;
  }

  public clear(): void {
    this.entities.clear();
    this.components.clear();
    this.events.clear();
    this.queryCache.clear();
    this.systems = [];
  }
}