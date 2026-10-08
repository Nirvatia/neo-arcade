import type { Biome } from './contract/Biome.js';
import type { BiomeDescriptor, BiomeResolver } from './contract/BiomeDescriptor.js';
import { BIOME_REGISTRY } from './registry.js';

export interface BiomeManagerOptions {
	/**
	 * Список биомов.
	 * Если не передан, используется общий реестр `BIOME_REGISTRY`.
	 */
	biomes?: readonly BiomeDescriptor[];
	/**
	 * Стартовый уровень, если нужно сразу выбрать правильный биом.
	 */
	initialLevel?: number;
	/**
	 * Стратегия выбора биома.
	 * В боевом режиме передаётся `progressionResolver` из LevelConfig.
	 */
	resolveIndex: BiomeResolver;
}

/** Слушатель смены биома. Подписчики не должны перезаписывать друг друга. */
export type BiomeChangedListener = (next: Biome, prev: Biome) => void;

export class BiomeManager {
	private current: Biome;
	private currentIndex = 0;
	private readonly registry: readonly BiomeDescriptor[];
	private readonly resolver: BiomeResolver;
	private biomeChangedListeners = new Set<BiomeChangedListener>();

	constructor(options: BiomeManagerOptions = { resolveIndex: () => 0 }) {
		this.registry = options.biomes ?? BIOME_REGISTRY;
		this.resolver = options.resolveIndex;

		if (this.registry.length === 0) {
			throw new Error('BiomeManager: biome registry is empty.');
		}

		const initialLevel = Math.max(1, options.initialLevel ?? 1);
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

	public addBiomeChangedListener(listener: BiomeChangedListener): void {
		this.biomeChangedListeners.add(listener);
	}

	public removeBiomeChangedListener(listener: BiomeChangedListener): void {
		this.biomeChangedListeners.delete(listener);
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

		// Снимок списка: слушатель вправе отписаться прямо во время уведомления.
		const snapshot = Array.from(this.biomeChangedListeners);

		for (const listener of snapshot) {
			listener(next, prev);
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
		this.biomeChangedListeners.clear();
		this.current.destroy();
	}

	private resolveIndex(level: number): number {
		if (this.registry.length === 0) {
			return 0;
		}

		const index = this.resolver(level, this.registry.length);

		if (!Number.isFinite(index)) {
			return 0;
		}

		return ((index % this.registry.length) + this.registry.length) % this.registry.length;
	}
}