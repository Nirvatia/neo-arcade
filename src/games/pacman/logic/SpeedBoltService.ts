import type { PlayerService } from './PlayerService';
import type { LevelProgress } from './LevelProgress';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';

const BOLT_SPAWN = { x: 12, y: 15 };
const BOLT_DURATION = 8;
const BOLT_THRESHOLD = 0.5;
const CONTACT_DISTANCE_SQ = 0.25;

export class SpeedBoltService {
	private readonly progress: LevelProgress;
	private readonly events: EventBus<PacmanEventMap>;
	private activeValue = false;
	private consumedValue = false;
	private timerValue = 0;
	private pendingActivationValue = false;

	constructor(progress: LevelProgress, events: EventBus<PacmanEventMap>) {
		if (!progress) {
			console.error('SpeedBoltService.constructor', 'missing level progress');
			throw new Error('SpeedBoltService.constructor: missing level progress');
		}
		if (!events) {
			console.error('SpeedBoltService.constructor', 'missing event bus');
			throw new Error('SpeedBoltService.constructor: missing event bus');
		}
		this.progress = progress;
		this.events = events;
	}

	get active(): boolean {
		return this.activeValue;
	}

	get timer(): number {
		return this.timerValue;
	}

	get position(): { x: number; y: number } {
		return { x: BOLT_SPAWN.x + 0.5, y: BOLT_SPAWN.y + 0.5 };
	}

	reset(): void {
		this.activeValue = false;
		this.consumedValue = false;
		this.timerValue = 0;
		this.pendingActivationValue = false;
	}

	update(dt: number, player: PlayerService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('SpeedBoltService.update', 'invalid delta time', dt);
			return;
		}
		if (!player) {
			console.error('SpeedBoltService.update', 'missing player service');
			return;
		}
		if (this.consumedValue) {
			return;
		}
		if (!this.activeValue) {
			if (this.progress.collectionRatio >= BOLT_THRESHOLD && this.progress.remainingDots > 0) {
				this.activeValue = true;
				this.timerValue = BOLT_DURATION;
				this.events.emit('audio:cue', { cue: 'fruit-spawn' });
			}
			return;
		}
		this.timerValue = Math.max(0, this.timerValue - dt);
		if (this.timerValue <= 0) {
			this.activeValue = false;
			return;
		}
		if (this.touchesPlayer(player)) {
			this.activeValue = false;
			this.consumedValue = true;
			this.pendingActivationValue = true;
			this.events.emit('audio:cue', { cue: 'power-start' });
		}
	}

	consumeActivation(): boolean {
		const pending = this.pendingActivationValue;
		this.pendingActivationValue = false;
		return pending;
	}

	private touchesPlayer(player: PlayerService): boolean {
		const position = player.position;
		const center = this.position;
		const dx = position.x - center.x;
		const dy = position.y - center.y;
		if (dx * dx + dy * dy <= CONTACT_DISTANCE_SQ) {
			return true;
		}
		const tile = player.tile;
		return tile.x === center.x - 0.5 && tile.y === center.y - 0.5;
	}
}