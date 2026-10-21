import type { PlayerService } from './PlayerService';
import type { LevelProgress } from './LevelProgress';
import type { ScoreModel } from './ScoreModel';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';

export type FruitKind = 'CF' | 'SF' | 'OF' | 'AF' | 'MF' | 'GF' | 'BF' | 'KF';

const FRUIT_ORDER: readonly FruitKind[] = ['CF', 'SF', 'OF', 'AF', 'MF', 'GF', 'BF', 'KF'];
const FRUIT_SCORES: Record<FruitKind, number> = {
	CF: 100,
	SF: 300,
	OF: 500,
	AF: 700,
	MF: 1000,
	GF: 2000,
	BF: 3000,
	KF: 5000
};
const DEFAULT_FRUIT_DURATION = 12;
const FRUIT_DOT_STEP = 40;
const FRUIT_SPAWN = { x: 12, y: 9 };
const CONTACT_DISTANCE_SQ = 0.25;

export class FruitService {
	private readonly progress: LevelProgress;
	private readonly scoreModel: ScoreModel;
	private readonly events: EventBus<PacmanEventMap>;
	private activeKindValue: FruitKind | null = null;
	private timerValue = 0;
	private fruitDurationValue = DEFAULT_FRUIT_DURATION;
	private spawnedCountValue = 0;
	private nextThresholdValue = FRUIT_DOT_STEP;

	constructor(
		progress: LevelProgress,
		scoreModel: ScoreModel,
		events: EventBus<PacmanEventMap>
	) {
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
		return {
			x: FRUIT_SPAWN.x + 0.5,
			y: FRUIT_SPAWN.y + 0.5
		};
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
		this.timerValue = 0;
		this.spawnedCountValue = 0;
		this.nextThresholdValue = FRUIT_DOT_STEP;
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
			if (dx * dx + dy * dy <= CONTACT_DISTANCE_SQ) {
				this.collect();
			}
			return;
		}
		if (this.progress.remainingDots > 0 && this.progress.collectedDots >= this.nextThresholdValue) {
			this.spawn();
		}
	}

	private spawn(): void {
		const index = Math.min(this.spawnedCountValue, FRUIT_ORDER.length - 1);
		const kind = FRUIT_ORDER[index];
		if (!kind) {
			console.error('FruitService.spawn', 'missing fruit kind', { index });
			return;
		}
		this.activeKindValue = kind;
		this.timerValue = this.fruitDurationValue;
		this.events.emit('audio:cue', { cue: 'fruit-spawn' });
	}

	private collect(): void {
		const kind = this.activeKindValue;
		if (!kind) {
			return;
		}
		this.scoreModel.add(FRUIT_SCORES[kind]);
		this.activeKindValue = null;
		this.timerValue = 0;
		this.spawnedCountValue += 1;
		this.nextThresholdValue += FRUIT_DOT_STEP;
		this.events.emit('audio:cue', { cue: 'fruit-collect' });
	}

	private expire(): void {
		this.activeKindValue = null;
		this.timerValue = 0;
		this.spawnedCountValue += 1;
		this.nextThresholdValue += FRUIT_DOT_STEP;
		this.events.emit('audio:cue', { cue: 'fruit-expire' });
	}
}