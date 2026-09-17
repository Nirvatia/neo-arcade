import type { World } from './World.js';
import type { EntityId } from './types.js';
import type { ComponentKey } from '../../components/index.js';

export class Query {
	private cachedResult: EntityId[] = [];
	private cachedVersion = -1;

	constructor(
		private readonly world: World,
		private readonly keys: ComponentKey[]
	) {}

	// Возвращаемый массив только для чтения. Не мутировать снаружи.
	public get entities(): EntityId[] {
		const currentVersion = this.world.components.version;
		if (this.cachedVersion !== currentVersion) {
			this.recompute();
			this.cachedVersion = currentVersion;
		}
		return this.cachedResult;
	}

	private recompute(): void {
		const result: EntityId[] = [];
		const all = this.world.entities.all();
		for (const entity of all) {
			if (this.matches(entity)) {
				result.push(entity);
			}
		}
		this.cachedResult = result;
	}

	private matches(entity: EntityId): boolean {
		for (const key of this.keys) {
			if (!this.world.components.has(entity, key)) {
				return false;
			}
		}
		return true;
	}
}
