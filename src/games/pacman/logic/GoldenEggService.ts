import type { PlayerService } from './PlayerService';
import type { LevelProgress } from './LevelProgress';
import type { ScoreModel } from './ScoreModel';
import type { GridService } from './GridService';
import type { GridPoint } from './GridModel';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';

export type GoldenEggPhase = 'waiting' | 'egg' | 'exit' | 'spent';

const EGG_DELAY = 30;
const EGG_DURATION = 10;
const EXIT_DURATION = 5;
const EGG_SCORE = 500;
const CONTACT_DISTANCE_SQ = 0.25;
const FALLBACK_EGG_TILE: GridPoint = { x: 12, y: 15 };

export class GoldenEggService {
	private readonly progress: LevelProgress;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly scoreModel: ScoreModel;
	private readonly grid: GridService;
	private phaseValue: GoldenEggPhase = 'waiting';
	private delayValue = EGG_DELAY;
	private eggTimerValue = 0;
	private exitReachedValue = false;

	constructor(
		progress: LevelProgress,
		events: EventBus<PacmanEventMap>,
		scoreModel: ScoreModel,
		grid: GridService
	) {
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
		if (!grid) {
			console.error('GoldenEggService.constructor', 'missing grid service');
			throw new Error('GoldenEggService.constructor: missing grid service');
		}
		this.progress = progress;
		this.events = events;
		this.scoreModel = scoreModel;
		this.grid = grid;
	}

	get phase(): GoldenEggPhase {
		return this.phaseValue;
	}

	get eggTimer(): number {
		return this.eggTimerValue;
	}

	get exitOpen(): boolean {
		return this.phaseValue === 'exit';
	}

	get eggPosition(): { x: number; y: number } {
		const tile = this.eggTile();
		return { x: tile.x + 0.5, y: tile.y + 0.5 };
	}

	get exitPosition(): { x: number; y: number } {
		return this.eggPosition;
	}

	reset(): void {
		this.phaseValue = 'waiting';
		this.delayValue = EGG_DELAY;
		this.eggTimerValue = 0;
		this.exitReachedValue = false;
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
		if (this.phaseValue === 'waiting') {
			this.delayValue = Math.max(0, this.delayValue - dt);
			if (this.delayValue > 0) {
				return;
			}
			if (this.progress.remainingDots <= 0) {
				this.phaseValue = 'spent';
				return;
			}
			this.phaseValue = 'egg';
			this.eggTimerValue = EGG_DURATION;
			this.events.emit('audio:cue', { cue: 'egg-spawn' });
			return;
		}
		if (this.phaseValue === 'egg') {
			this.eggTimerValue = Math.max(0, this.eggTimerValue - dt);
			if (this.eggTimerValue <= 0) {
				this.phaseValue = 'spent';
				return;
			}
			if (this.touchesPlayer(player, this.eggPosition)) {
				this.scoreModel.add(EGG_SCORE);
				this.phaseValue = 'exit';
				this.eggTimerValue = EXIT_DURATION;
				this.events.emit('audio:cue', { cue: 'egg-collect' });
				this.events.emit('audio:cue', { cue: 'exit-open' });
			}
			return;
		}
		if (this.phaseValue === 'exit') {
			this.eggTimerValue = Math.max(0, this.eggTimerValue - dt);
			if (this.eggTimerValue <= 0) {
				this.phaseValue = 'spent';
				return;
			}
			if (this.touchesPlayer(player, this.exitPosition)) {
				this.exitReachedValue = true;
				this.phaseValue = 'spent';
				this.events.emit('audio:cue', { cue: 'exit-enter' });
			}
		}
	}

	consumeExitReached(): boolean {
		const reached = this.exitReachedValue;
		this.exitReachedValue = false;
		return reached;
	}

	private eggTile(): GridPoint {
		const spawn = this.grid.eggSpawn;
		if (spawn) {
			return spawn;
		}
		return FALLBACK_EGG_TILE;
	}

	private touchesPlayer(player: PlayerService, center: { x: number; y: number }): boolean {
		const position = player.position;
		const dx = position.x - center.x;
		const dy = position.y - center.y;
		if (dx * dx + dy * dy <= CONTACT_DISTANCE_SQ) {
			return true;
		}
		const tile = player.tile;
		return tile.x === center.x - 0.5 && tile.y === center.y - 0.5;
	}
}