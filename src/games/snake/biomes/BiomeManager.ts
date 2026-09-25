import type { Biome } from './Biome.js';
import type { BiomeDescriptor, BiomeResolver } from './BiomeDescriptor.js';
import { defaultBiomeResolver } from './BiomeDescriptor.js';
import { BIOME_REGISTRY } from './registry.js';

const DEFAULT_LEVELS_PER_BIOME = 3;

export interface BiomeManagerOptions {
	/**
	 * Список биомов.
	 * Если не передан, используется общий реестр `BIOME_REGISTRY`.
	 */
	biomes?: readonly BiomeDescriptor[];

	/**
	 * Сколько уровней проходит один биом.
	 * По умолчанию 3.
	 */
	levelsPerBiome?: number;

	/**
	 * Стартовый уровень, если нужно сразу выбрать правильный биом.
	 * По умолчанию 1.
	 */
	initialLevel?: number;

	/**
	 * Пользовательская стратегия выбора биома.
	 * Например, если позже понадобится не циклический порядок,
	 * а конкретные диапазоны уровней.
	 */
	resolveIndex?: BiomeResolver;
}

export class BiomeManager {
	private current: Biome;
	private currentIndex = 0;

	private readonly levelsPerBiome: number;
	private readonly registry: readonly BiomeDescriptor[];
	private readonly resolver: BiomeResolver;

	/** RenderSystem подписывается сюда, чтобы переключить визуалы. */
	public onBiomeChanged: ((next: Biome, prev: Biome) => void) | null = null;

	/**
	 * Поддерживаем старый вызов:
	 *
	 * ```ts
	 * new BiomeManager(3);
	 * ```
	 *
	 * И новый вызов:
	 *
	 * ```ts
	 * new BiomeManager({
	 *   biomes: BIOME_REGISTRY,
	 *   levelsPerBiome: 3,
	 *   initialLevel: 1
	 * });
	 * ```
	 */
	constructor(options: BiomeManagerOptions | number = {}) {
		const normalized: BiomeManagerOptions =
			typeof options === 'number' ? { levelsPerBiome: options } : options;

		this.levelsPerBiome = Math.max(1, normalized.levelsPerBiome ?? DEFAULT_LEVELS_PER_BIOME);
		this.registry = normalized.biomes ?? BIOME_REGISTRY;
		this.resolver = normalized.resolveIndex ?? defaultBiomeResolver;

		if (this.registry.length === 0) {
			throw new Error('BiomeManager: biome registry is empty.');
		}

		const initialLevel = Math.max(1, normalized.initialLevel ?? 1);

		this.currentIndex = this.resolveIndex(initialLevel);

		const descriptor = this.registry[this.currentIndex];

		if (descriptor === undefined) {
			throw new Error(
				`BiomeManager: no biome descriptor at index ${this.currentIndex}.`
			);
		}

		this.current = descriptor.create();
		this.applyTheme();
	}

	public get biome(): Biome {
		return this.current;
	}

	public get biomeId(): string {
		const descriptor = this.registry[this.currentIndex];
		return descriptor === undefined ? this.current.id : descriptor.id;
	}

	public setLevel(level: number): void {
		if (this.registry.length === 0) {
			return;
		}

		const index = this.resolveIndex(level);

		if (index === this.currentIndex) {
			return;
		}

		const descriptor = this.registry[index];

		if (descriptor === undefined) {
			return;
		}

		const next = descriptor.create();
		const prev = this.current;

		this.current = next;
		this.currentIndex = index;

		this.applyTheme();

		if (this.onBiomeChanged !== null) {
			this.onBiomeChanged(next, prev);
		}

		prev.destroy();
	}

	/** Применяет тему биома через CSS-переменные. */
	public applyTheme(): void {
		if (typeof document === 'undefined') {
			return;
		}

		const root = document.documentElement;

		root.style.setProperty('--stage-bg', this.current.theme.pageBackground);

		for (const [key, value] of Object.entries(this.current.theme.cssVariables)) {
			root.style.setProperty(key, value);
		}
	}

	public destroy(): void {
		this.current.destroy();
	}

	private resolveIndex(level: number): number {
		if (this.registry.length === 0) {
			return 0;
		}

		const index = this.resolver(level, this.registry.length, this.levelsPerBiome);

		if (!Number.isFinite(index)) {
			return 0;
		}

		return ((index % this.registry.length) + this.registry.length) % this.registry.length;
	}
}