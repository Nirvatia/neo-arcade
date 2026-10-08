import type { EntityId } from './types.js';
import type { ComponentKey, ComponentDataMap } from '../../components/index.js';

export class ComponentRegistry {
	private stores = new Map<ComponentKey, Map<EntityId, unknown>>();
	private structureVersion = 0;

	public get version(): number {
		return this.structureVersion;
	}

	public add<K extends ComponentKey>(entity: EntityId, key: K, data: ComponentDataMap[K]): void {
		let store = this.stores.get(key);
		if (store === undefined) {
			store = new Map<EntityId, unknown>();
			this.stores.set(key, store);
		}
		store.set(entity, data);
		this.structureVersion = this.structureVersion + 1;
	}

	public get<K extends ComponentKey>(entity: EntityId, key: K): ComponentDataMap[K] | undefined {
		const store = this.stores.get(key);
		if (store === undefined) {
			return undefined;
		}
		return store.get(entity) as ComponentDataMap[K] | undefined;
	}

	public has(entity: EntityId, key: ComponentKey): boolean {
		const store = this.stores.get(key);
		if (store === undefined) {
			return false;
		}
		return store.has(entity);
	}

	public remove(entity: EntityId, key: ComponentKey): void {
		const store = this.stores.get(key);
		if (store === undefined) {
			return;
		}
		const removed = store.delete(entity);
		if (removed) {
			this.structureVersion = this.structureVersion + 1;
		}
	}

	public removeAll(entity: EntityId): void {
		for (const store of this.stores.values()) {
			const removed = store.delete(entity);
			if (removed) {
				this.structureVersion = this.structureVersion + 1;
			}
		}
	}

	public clear(): void {
		this.stores.clear();
		this.structureVersion = this.structureVersion + 1;
	}
}
