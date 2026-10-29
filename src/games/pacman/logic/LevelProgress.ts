import type { GridService } from './GridService';
import type { ScoreModel } from './ScoreModel';
import type { GridPoint } from './GridModel';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';
import { SCORE_TABLE } from '../config/scoreConfig';

export class LevelProgress {
	private readonly grid: GridService;
	private readonly scoreModel: ScoreModel;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly collected = new Set<string>();
	private remainingDotsValue: number;
	private remainingEnergizersValue: number;
	private pendingEnergizerValue = false;
	private destroyedDotsValue = 0;

	constructor(grid: GridService, scoreModel: ScoreModel, events: EventBus<PacmanEventMap>) {
		if (!grid) {
			console.error('LevelProgress.constructor', 'missing grid service');
			throw new Error('LevelProgress.constructor: missing grid service');
		}
		if (!scoreModel) {
			console.error('LevelProgress.constructor', 'missing score model');
			throw new Error('LevelProgress.constructor: missing score model');
		}
		if (!events) {
			console.error('LevelProgress.constructor', 'missing event bus');
			throw new Error('LevelProgress.constructor: missing event bus');
		}
		this.grid = grid;
		this.scoreModel = scoreModel;
		this.events = events;
		this.remainingDotsValue = grid.dotCount;
		this.remainingEnergizersValue = grid.energizerCount;
	}

	get score(): number {
		return this.scoreModel.score;
	}

	get remainingDots(): number {
		return this.remainingDotsValue;
	}

	get collectedDots(): number {
		return Math.max(0, this.grid.dotCount - this.remainingDotsValue);
	}

	get destroyedDots(): number {
		return this.destroyedDotsValue;
	}

	get collectionRatio(): number {
		if (this.grid.dotCount <= 0) {
			return 1;
		}
		return Math.min(1, Math.max(0, this.collectedDots / this.grid.dotCount));
	}

	isCollected(x: number, y: number): boolean {
		if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) {
			return false;
		}
		return this.collected.has(this.key(x, y));
	}

	safeSpawnTiles(): GridPoint[] {
		const tiles: GridPoint[] = [];
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (this.grid.tileAt(x, y) !== 'DT') {
					continue;
				}
				if (!this.collected.has(this.key(x, y))) {
					continue;
				}
				tiles.push({ x, y });
			}
		}
		return tiles;
	}

	consumePendingEnergizer(): boolean {
		if (!this.pendingEnergizerValue) {
			return false;
		}
		this.pendingEnergizerValue = false;
		return true;
	}

	convertRemainingDots(): number {
		const converted = Math.max(0, this.remainingDotsValue);
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (this.grid.tileAt(x, y) !== 'DT') {
					continue;
				}
				const id = this.key(x, y);
				if (!this.collected.has(id)) {
					this.collected.add(id);
				}
			}
		}
		this.remainingDotsValue = 0;
		return converted;
	}

	destroyDotAt(x: number, y: number): boolean {
		if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) {
			console.error('LevelProgress.destroyDotAt', 'invalid tile position', { x, y });
			return false;
		}
		if (!this.grid.isInside(x, y)) {
			console.error('LevelProgress.destroyDotAt', 'position is outside grid', { x, y });
			return false;
		}
		const id = this.key(x, y);
		if (this.collected.has(id)) {
			return false;
		}
		const tile = this.grid.tileAt(x, y);
		if (tile !== 'DT') {
			return false;
		}
		if (this.remainingDotsValue <= 0) {
			return false;
		}
		this.collected.add(id);
		this.remainingDotsValue = Math.max(0, this.remainingDotsValue - 1);
		this.destroyedDotsValue += 1;
		return true;
	}

	collectAt(x: number, y: number): void {
		if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) {
			console.error('LevelProgress.collectAt', 'invalid tile position', { x, y });
			return;
		}
		if (!this.grid.isInside(x, y)) {
			console.error('LevelProgress.collectAt', 'position is outside grid', { x, y });
			return;
		}
		const id = this.key(x, y);
		if (this.collected.has(id)) {
			return;
		}
		const tile = this.grid.tileAt(x, y);
		if (tile === 'DT') {
			if (this.remainingDotsValue <= 0) {
				return;
			}
			this.collected.add(id);
			this.remainingDotsValue = Math.max(0, this.remainingDotsValue - 1);
			this.scoreModel.add(SCORE_TABLE.dot);
			this.events.emit('audio:cue', { cue: 'dot' });
			return;
		}
		if (tile === 'EU') {
			if (this.remainingEnergizersValue <= 0) {
				return;
			}
			this.collected.add(id);
			this.remainingEnergizersValue = Math.max(0, this.remainingEnergizersValue - 1);
			this.scoreModel.add(SCORE_TABLE.energizer);
			this.pendingEnergizerValue = true;
			this.events.emit('audio:cue', { cue: 'energizer' });
		}
	}

	collectDotOnly(x: number, y: number): void {
		if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) {
			console.error('LevelProgress.collectDotOnly', 'invalid tile position', { x, y });
			return;
		}
		if (!this.grid.isInside(x, y)) {
			console.error('LevelProgress.collectDotOnly', 'position is outside grid', { x, y });
			return;
		}
		const id = this.key(x, y);
		if (this.collected.has(id)) {
			return;
		}
		const tile = this.grid.tileAt(x, y);
		if (tile !== 'DT') {
			return;
		}
		if (this.remainingDotsValue <= 0) {
			return;
		}
		this.collected.add(id);
		this.remainingDotsValue = Math.max(0, this.remainingDotsValue - 1);
		this.scoreModel.add(SCORE_TABLE.dot);
		this.events.emit('audio:cue', { cue: 'dot' });
	}

	resetDots(): void {
		this.collected.clear();
		this.remainingDotsValue = this.grid.dotCount;
		this.remainingEnergizersValue = this.grid.energizerCount;
		this.pendingEnergizerValue = false;
		this.destroyedDotsValue = 0;
	}

	reset(): void {
		this.collected.clear();
		this.remainingDotsValue = this.grid.dotCount;
		this.remainingEnergizersValue = this.grid.energizerCount;
		this.pendingEnergizerValue = false;
		this.destroyedDotsValue = 0;
		this.scoreModel.reset();
	}

	private key(x: number, y: number): string {
		return `${x}:${y}`;
	}
}
