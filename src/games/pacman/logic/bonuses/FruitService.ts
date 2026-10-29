import type { PlayerService } from '../actors/PlayerService';
import type { LevelProgress } from '../level/LevelProgress';
import type { ScoreModel } from '../level/ScoreModel';
import type { GridService } from '../maze/GridService';
import type { SpawnLocator } from '../maze/SpawnLocator';
import type { GridPoint } from '../maze/GridModel';
import type { GameProfile } from '../rules/HypnosisService';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import type { FruitKind } from './fruitCatalog';
import { fruitForLevel, randomFruitKind } from './fruitCatalog';
import { SCORE_TABLE } from '../../config/scoreConfig';
import { ACTOR_CONTACT_DISTANCE_SQ } from '../../config/actorConfig';

export type { FruitKind };

const DEFAULT_FRUIT_DURATION = 12;
const FRUIT_THRESHOLDS: readonly number[] = [70, 170];

export class FruitService {
	private readonly profileValue: GameProfile;
	private readonly levelValue: number;
	private readonly grid: GridService;
	private readonly locator: SpawnLocator;
	private readonly progress: LevelProgress;
	private readonly scoreModel: ScoreModel;
	private readonly events: EventBus<PacmanEventMap>;
	private activeKindValue: FruitKind | null = null;
	private spawnTileValue: GridPoint | null = null;
	private timerValue = 0;
	private fruitDurationValue = DEFAULT_FRUIT_DURATION;
	private spawnedCountValue = 0;

	constructor(
		profile: GameProfile,
		level: number,
		grid: GridService,
		locator: SpawnLocator,
		progress: LevelProgress,
		scoreModel: ScoreModel,
		events: EventBus<PacmanEventMap>
	) {
		if (profile !== 'pacman' && profile !== 'ms-pacman') {
			console.error('FruitService.constructor', 'invalid profile', profile);
			throw new Error('FruitService.constructor: invalid profile');
		}
		if (!Number.isFinite(level) || level < 1) {
			console.error('FruitService.constructor', 'invalid level', level);
			throw new Error('FruitService.constructor: level must be positive');
		}
		if (!grid) {
			console.error('FruitService.constructor', 'missing grid service');
			throw new Error('FruitService.constructor: missing grid service');
		}
		if (!locator) {
			console.error('FruitService.constructor', 'missing spawn locator');
			throw new Error('FruitService.constructor: missing spawn locator');
		}
		if (!progress) {
			console.error('FruitService.constructor', 'missing level progress');
			throw new Error('FruitService.constructor: missing level progress');
		}
		if (!scoreModel) {
			console.error('FruitService.constructor', 'missing score model');
			throw new Error('FruitService.constructor: missing score model');
		}
		if (!events) {
			console.error('FruitService.constructor', 'missing event bus');
			throw new Error('FruitService.constructor: missing event bus');
		}
		this.profileValue = profile;
		this.levelValue = Math.floor(level);
		this.grid = grid;
		this.locator = locator;
		this.progress = progress;
		this.scoreModel = scoreModel;
		this.events = events;
	}

	get active(): FruitKind | null {
		return this.activeKindValue;
	}

	get timer(): number {
		return this.timerValue;
	}

	get position(): { x: number; y: number } {
		const tile = this.spawnTileValue;
		if (!tile) {
			console.error('FruitService.position', 'spawn tile is not assigned');
			return { x: 0, y: 0 };
		}
		return { x: tile.x + 0.5, y: tile.y + 0.5 };
	}

	setFruitDuration(value: number): void {
		if (!Number.isFinite(value) || value <= 0) {
			console.error('FruitService.setFruitDuration', 'invalid duration', value);
			return;
		}
		this.fruitDurationValue = value;
	}

	reset(): void {
		this.activeKindValue = null;
		this.spawnTileValue = null;
		this.timerValue = 0;
		this.spawnedCountValue = 0;
	}

	update(dt: number, player: PlayerService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('FruitService.update', 'invalid delta time', dt);
			return;
		}
		if (!player) {
			console.error('FruitService.update', 'missing player service');
			return;
		}
		if (this.activeKindValue) {
			this.timerValue = Math.max(0, this.timerValue - dt);
			if (this.timerValue <= 0) {
				this.expire();
				return;
			}
			const playerPosition = player.position;
			const fruitPosition = this.position;
			const dx = playerPosition.x - fruitPosition.x;
			const dy = playerPosition.y - fruitPosition.y;
			if (dx * dx + dy * dy <= ACTOR_CONTACT_DISTANCE_SQ) {
				this.collect();
			}
			return;
		}
		if (this.spawnedCountValue >= FRUIT_THRESHOLDS.length) {
			return;
		}
		const threshold = FRUIT_THRESHOLDS[this.spawnedCountValue];
		if (typeof threshold !== 'number' || !Number.isFinite(threshold)) {
			console.error('FruitService.update', 'invalid spawn threshold', {
				index: this.spawnedCountValue
			});
			return;
		}
		if (this.progress.remainingDots > 0 && this.progress.collectedDots >= threshold) {
			this.spawn();
		}
	}

	private spawn(): void {
		const kind =
			this.profileValue === 'ms-pacman' ? randomFruitKind() : fruitForLevel(this.levelValue);
		const tile = this.chooseSpawnTile();
		if (!tile) {
			return;
		}
		this.spawnTileValue = tile;
		this.activeKindValue = kind;
		this.timerValue = this.fruitDurationValue;
		this.events.emit('audio:cue', { cue: 'fruit-spawn' });
	}

	private chooseSpawnTile(): GridPoint | null {
		const pad = this.findFruitPad();
		if (pad) {
			return pad;
		}
		return this.locator.findSafeTile(this.levelValue + this.spawnedCountValue);
	}

	private findFruitPad(): GridPoint | null {
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (this.grid.tileAt(x, y) === 'FT') {
					return { x, y };
				}
			}
		}
		return null;
	}

	private collect(): void {
		const kind = this.activeKindValue;
		if (!kind) {
			return;
		}
		this.scoreModel.add(SCORE_TABLE.fruit[kind]);
		this.activeKindValue = null;
		this.spawnTileValue = null;
		this.timerValue = 0;
		this.spawnedCountValue += 1;
		this.events.emit('audio:cue', { cue: 'fruit-collect' });
	}

	private expire(): void {
		this.activeKindValue = null;
		this.spawnTileValue = null;
		this.timerValue = 0;
		this.spawnedCountValue += 1;
		this.events.emit('audio:cue', { cue: 'fruit-expire' });
	}
}
