import type { PlayerService } from './PlayerService';
import type { LevelProgress } from './LevelProgress';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';

export type GoldenEggPhase = 'waiting' | 'egg' | 'exit' | 'spent';

const EGG_DELAY = 20;
const EGG_DURATION = 10;
const EGG_TILE = { x: 12, y: 15 };
const EXIT_TILE = { x: 12, y: 23 };
const CONTACT_DISTANCE_SQ = 0.25;

export class GoldenEggService {
	private readonly progress: LevelProgress;
	private readonly events: EventBus<PacmanEventMap>;
	private phaseValue: GoldenEggPhase = 'waiting';
	private delayValue = EGG_DELAY;
	private eggTimerValue = 0;
	private exitReachedValue = false;

	constructor(progress: LevelProgress, events: EventBus<PacmanEventMap>) {
		if (!progress) {
			console.error('GoldenEggService.constructor', 'missing level progress');
			throw new Error('GoldenEggService.constructor: missing level progress');
		}

		if (!events) {
			console.error('GoldenEggService.constructor', 'missing event bus');
			throw new Error('GoldenEggService.constructor: missing event bus');
		}

		this.progress = progress;
		this.events = events;
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
		return { x: EGG_TILE.x + 0.5, y: EGG_TILE.y + 0.5 };
	}

	get exitPosition(): { x: number; y: number } {
		return { x: EXIT_TILE.x + 0.5, y: EXIT_TILE.y + 0.5 };
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
				this.phaseValue = 'exit';
				this.eggTimerValue = 0;
				this.events.emit('audio:cue', { cue: 'egg-collect' });
				this.events.emit('audio:cue', { cue: 'exit-open' });
			}

			return;
		}

		if (this.phaseValue === 'exit') {
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