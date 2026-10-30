import type { GhostService } from '../actors/GhostService';
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

/**
 * The lair code's reward on level 7: once the code is solved the ghosts stop and vanish
 * (`vanish`), the lair gate slides open (`door`), and the Easter egg waits in the lair's
 * centre (`egg`) until Pac-Man walks in and takes it (`spent`).
 */
export type EasterEggPhase = 'waiting' | 'vanish' | 'door' | 'egg' | 'spent';

const REQUIRED_LEVEL = 7;
/** Seconds the ghosts take to vanish. */
export const EGG_VANISH_TIME = 1.2;
/** Seconds the lair gate takes to open. */
export const EGG_DOOR_TIME = 0.8;

export class EasterEggService {
	private readonly levelValue: number;
	private readonly grid: GridService;
	private readonly ghosts: GhostService;
	private readonly lairCode: LairCodeService | null;
	private readonly progress: LevelProgress;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly scoreModel: ScoreModel;
	private phaseValue: EasterEggPhase = 'waiting';
	/** Seconds left in the `vanish` or `door` phase. */
	private timerValue = 0;
	private spawnTileValue: GridPoint | null = null;
	private secretRequestedValue = false;

	constructor(
		level: number,
		grid: GridService,
		ghosts: GhostService,
		lairCode: LairCodeService | null,
		progress: LevelProgress,
		events: EventBus<PacmanEventMap>,
		scoreModel: ScoreModel
	) {
		if (!Number.isFinite(level) || level < 1) {
			console.error('EasterEggService.constructor', 'invalid level', level);
			throw new Error('EasterEggService.constructor: level must be positive');
		}
		if (!grid) {
			console.error('EasterEggService.constructor', 'missing grid service');
			throw new Error('EasterEggService.constructor: missing grid service');
		}
		if (!ghosts) {
			console.error('EasterEggService.constructor', 'missing ghost service');
			throw new Error('EasterEggService.constructor: missing ghost service');
		}
		if (!progress) {
			console.error('EasterEggService.constructor', 'missing level progress');
			throw new Error('EasterEggService.constructor: missing level progress');
		}
		if (!events) {
			console.error('EasterEggService.constructor', 'missing event bus');
			throw new Error('EasterEggService.constructor: missing event bus');
		}
		if (!scoreModel) {
			console.error('EasterEggService.constructor', 'missing score model');
			throw new Error('EasterEggService.constructor: missing score model');
		}
		this.levelValue = Math.floor(level);
		this.grid = grid;
		this.ghosts = ghosts;
		this.lairCode = lairCode ?? null;
		this.progress = progress;
		this.events = events;
		this.scoreModel = scoreModel;
	}

	get phase(): EasterEggPhase {
		return this.phaseValue;
	}

	/** How far the ghosts have vanished, 0..1. */
	get vanishProgress(): number {
		if (this.phaseValue === 'waiting') {
			return 0;
		}
		if (this.phaseValue === 'vanish') {
			return 1 - this.timerValue / EGG_VANISH_TIME;
		}
		return 1;
	}

	/** How far the lair gate is open, 0..1. */
	get doorOpen(): number {
		if (this.phaseValue === 'waiting' || this.phaseValue === 'vanish') {
			return 0;
		}
		if (this.phaseValue === 'door') {
			return 1 - this.timerValue / EGG_DOOR_TIME;
		}
		return 1;
	}

	/** Pac-Man may walk into the lair once the gate is fully open. */
	get lairOpen(): boolean {
		return this.phaseValue === 'egg' || this.phaseValue === 'spent';
	}

	get eggPosition(): { x: number; y: number } {
		const tile = this.spawnTileValue;
		if (!tile) {
			console.error('EasterEggService.eggPosition', 'spawn tile is not assigned');
			return { x: 0, y: 0 };
		}
		return { x: tile.x + 0.5, y: tile.y + 0.5 };
	}

	reset(): void {
		this.phaseValue = 'waiting';
		this.timerValue = 0;
		this.spawnTileValue = null;
		this.secretRequestedValue = false;
	}

	update(dt: number, player: PlayerService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('EasterEggService.update', 'invalid delta time', dt);
			return;
		}
		if (!player) {
			console.error('EasterEggService.update', 'missing player service');
			return;
		}
		if (this.levelValue !== REQUIRED_LEVEL || !this.lairCode || !this.lairCode.active) {
			return;
		}
		if (this.phaseValue === 'waiting') {
			if (this.lairCode.open) {
				this.startVanish();
			}
			return;
		}
		if (this.phaseValue === 'vanish') {
			this.timerValue = Math.max(0, this.timerValue - dt);
			if (this.timerValue <= 0) {
				this.phaseValue = 'door';
				this.timerValue = EGG_DOOR_TIME;
			}
			return;
		}
		if (this.phaseValue === 'door') {
			this.timerValue = Math.max(0, this.timerValue - dt);
			if (this.timerValue <= 0) {
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

	/** Dev: the ghosts are sent away and the egg waits in the open lair now. */
	debugSpawn(): void {
		this.ghosts.banish();
		this.spawnEgg();
	}

	private startVanish(): void {
		this.ghosts.banish();
		this.phaseValue = 'vanish';
		this.timerValue = EGG_VANISH_TIME;
		debugLog(this.events, 'spawn', 'lair code: the ghosts vanish');
	}

	private spawnEgg(): void {
		const tile = this.grid.lairEggTile();
		if (!tile) {
			console.error('EasterEggService.spawnEgg', 'lair tile is not found');
			this.phaseValue = 'spent';
			return;
		}
		this.spawnTileValue = tile;
		this.phaseValue = 'egg';
		this.events.emit('audio:cue', { cue: 'egg-spawn' });
		debugLog(this.events, 'spawn', 'Easter egg');
	}

	private collect(): void {
		const converted = this.progress.convertRemainingDots();
		this.scoreModel.add(converted * SCORE_TABLE.dot);
		this.scoreModel.add(SCORE_TABLE.easterEgg);
		const tile = this.spawnTileValue;
		if (tile) {
			const points = converted * SCORE_TABLE.dot + SCORE_TABLE.easterEgg;
			this.events.emit('fx:event', { kind: 'egg', x: tile.x + 0.5, y: tile.y + 0.5, points });
		}
		this.phaseValue = 'spent';
		this.secretRequestedValue = true;
		this.events.emit('audio:cue', { cue: 'egg-collect' });
		debugLog(this.events, 'spawn', 'Easter egg taken');
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
