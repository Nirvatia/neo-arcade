import type { PlayerService } from '../actors/PlayerService';
import type { LevelProgress } from '../level/LevelProgress';
import type { ScoreModel } from '../level/ScoreModel';
import type { GridService } from '../maze/GridService';
import type { LairCodeService } from '../rules/LairCodeService';
import type { GridPoint } from '../maze/GridModel';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { SCORE_TABLE } from '../../config/scoreConfig';
import { ACTOR_CONTACT_DISTANCE_SQ } from '../../config/actorConfig';
import { debugLog } from '../debug/debugLog';

export type GoldenEggPhase = 'waiting' | 'egg' | 'spent';

const REQUIRED_LEVEL = 7;
const EGG_OPEN_DELAY = 1;

export class GoldenEggService {
	private readonly levelValue: number;
	private readonly grid: GridService;
	private readonly lairCode: LairCodeService | null;
	private readonly progress: LevelProgress;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly scoreModel: ScoreModel;
	private phaseValue: GoldenEggPhase = 'waiting';
	private delayValue = 0;
	private spawnTileValue: GridPoint | null = null;
	private secretRequestedValue = false;

	constructor(
		level: number,
		grid: GridService,
		lairCode: LairCodeService | null,
		progress: LevelProgress,
		events: EventBus<PacmanEventMap>,
		scoreModel: ScoreModel
	) {
		if (!Number.isFinite(level) || level < 1) {
			console.error('GoldenEggService.constructor', 'invalid level', level);
			throw new Error('GoldenEggService.constructor: level must be positive');
		}
		if (!grid) {
			console.error('GoldenEggService.constructor', 'missing grid service');
			throw new Error('GoldenEggService.constructor: missing grid service');
		}
		if (!progress) {
			console.error('GoldenEggService.constructor', 'missing level progress');
			throw new Error('GoldenEggService.constructor: missing level progress');
		}
		if (!events) {
			console.error('GoldenEggService.constructor', 'missing event bus');
			throw new Error('GoldenEggService.constructor: missing event bus');
		}
		if (!scoreModel) {
			console.error('GoldenEggService.constructor', 'missing score model');
			throw new Error('GoldenEggService.constructor: missing score model');
		}
		this.levelValue = Math.floor(level);
		this.grid = grid;
		this.lairCode = lairCode ?? null;
		this.progress = progress;
		this.events = events;
		this.scoreModel = scoreModel;
	}

	get phase(): GoldenEggPhase {
		return this.phaseValue;
	}

	get eggPosition(): { x: number; y: number } {
		const tile = this.spawnTileValue;
		if (!tile) {
			console.error('GoldenEggService.eggPosition', 'spawn tile is not assigned');
			return { x: 0, y: 0 };
		}
		return { x: tile.x + 0.5, y: tile.y + 0.5 };
	}

	reset(): void {
		this.phaseValue = 'waiting';
		this.delayValue = 0;
		this.spawnTileValue = null;
		this.secretRequestedValue = false;
	}

	update(dt: number, player: PlayerService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('GoldenEggService.update', 'invalid delta time', dt);
			return;
		}
		if (!player) {
			console.error('GoldenEggService.update', 'missing player service');
			return;
		}
		if (this.levelValue !== REQUIRED_LEVEL || !this.lairCode || !this.lairCode.active) {
			return;
		}
		if (this.phaseValue === 'waiting') {
			if (!this.lairCode.open) {
				return;
			}
			if (this.delayValue <= 0) {
				this.delayValue = EGG_OPEN_DELAY;
			}
			this.delayValue = Math.max(0, this.delayValue - dt);
			if (this.delayValue <= 0) {
				this.spawnEgg();
			}
			return;
		}
		if (this.phaseValue === 'egg') {
			if (this.touchesPlayer(player, this.eggPosition)) {
				this.collect();
			}
		}
	}

	consumeSecretRequested(): boolean {
		const requested = this.secretRequestedValue;
		this.secretRequestedValue = false;
		return requested;
	}

	/** Dev: the egg appears in the lair now. */
	debugSpawn(): void {
		this.spawnEgg();
	}

	private spawnEgg(): void {
		const tile = this.grid.lairEggTile();
		if (!tile) {
			console.error('GoldenEggService.spawnEgg', 'lair tile is not found');
			this.phaseValue = 'spent';
			return;
		}
		this.spawnTileValue = tile;
		this.phaseValue = 'egg';
		this.events.emit('audio:cue', { cue: 'egg-spawn' });
		debugLog(this.events, 'spawn', 'golden egg');
	}

	private collect(): void {
		const converted = this.progress.convertRemainingDots();
		this.scoreModel.add(converted * SCORE_TABLE.dot);
		this.scoreModel.add(SCORE_TABLE.goldenEgg);
		const tile = this.spawnTileValue;
		if (tile) {
			const points = converted * SCORE_TABLE.dot + SCORE_TABLE.goldenEgg;
			this.events.emit('fx:event', { kind: 'egg', x: tile.x + 0.5, y: tile.y + 0.5, points });
		}
		this.phaseValue = 'spent';
		this.secretRequestedValue = true;
		this.events.emit('audio:cue', { cue: 'egg-collect' });
		debugLog(this.events, 'spawn', 'golden egg taken');
	}

	private touchesPlayer(player: PlayerService, center: { x: number; y: number }): boolean {
		const position = player.position;
		const dx = position.x - center.x;
		const dy = position.y - center.y;
		if (dx * dx + dy * dy <= ACTOR_CONTACT_DISTANCE_SQ) {
			return true;
		}
		const tile = player.tile;
		return tile.x === center.x - 0.5 && tile.y === center.y - 0.5;
	}
}
