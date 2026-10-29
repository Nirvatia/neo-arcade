import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import type { GhostKind } from '../actors/GhostModel';

export interface LairCodeSnapshot {
	readonly active: boolean;
	readonly open: boolean;
	readonly stepIndex: number;
	readonly expected: GhostKind | null;
	readonly stepPulse: number;
	readonly openPulse: number;
}

const REQUIRED_LEVEL = 7;
const CODE: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const STEP_PULSE_DURATION = 0.6;
const OPEN_PULSE_DURATION = 2;

export class LairCodeService {
	private readonly levelValue: number;
	private readonly events: EventBus<PacmanEventMap>;
	private stepIndexValue = 0;
	private openValue = false;
	private stepPulseValue = 0;
	private openPulseValue = 0;

	constructor(level: number, events: EventBus<PacmanEventMap>) {
		if (!Number.isFinite(level) || level < 1) {
			console.error('LairCodeService.constructor', 'invalid level', level);
			throw new Error('LairCodeService.constructor: level must be positive');
		}
		if (!events) {
			console.error('LairCodeService.constructor', 'missing event bus');
			throw new Error('LairCodeService.constructor: missing event bus');
		}
		this.levelValue = Math.floor(level);
		this.events = events;
	}

	get active(): boolean {
		return this.levelValue === REQUIRED_LEVEL;
	}

	get open(): boolean {
		return this.openValue;
	}

	get stepIndex(): number {
		return this.stepIndexValue;
	}

	get expected(): GhostKind | null {
		const expected = CODE[this.stepIndexValue];
		return expected ?? null;
	}

	get stepPulse(): number {
		return this.stepPulseValue;
	}

	get openPulse(): number {
		return this.openPulseValue;
	}

	get snapshot(): LairCodeSnapshot {
		return {
			active: this.active,
			open: this.openValue,
			stepIndex: this.stepIndexValue,
			expected: this.expected,
			stepPulse: this.stepPulseValue,
			openPulse: this.openPulseValue
		};
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('LairCodeService.update', 'invalid delta time', dt);
			return;
		}
		this.stepPulseValue = Math.max(0, this.stepPulseValue - dt);
		this.openPulseValue = Math.max(0, this.openPulseValue - dt);
	}

	register(kind: GhostKind): void {
		if (!this.active || this.openValue) {
			return;
		}
		if (!this.isValidKind(kind)) {
			console.error('LairCodeService.register', 'invalid ghost kind', kind);
			return;
		}
		const expected = CODE[this.stepIndexValue];
		if (kind !== expected) {
			return;
		}
		this.stepIndexValue += 1;
		this.stepPulseValue = STEP_PULSE_DURATION;
		if (this.stepIndexValue >= CODE.length) {
			this.openValue = true;
			this.openPulseValue = OPEN_PULSE_DURATION;
			this.events.emit('audio:cue', { cue: 'exit-open' });
			return;
		}
		this.events.emit('audio:cue', { cue: 'egg-spawn' });
	}

	reset(): void {
		this.stepIndexValue = 0;
		this.openValue = false;
		this.stepPulseValue = 0;
		this.openPulseValue = 0;
	}

	private isValidKind(kind: GhostKind): boolean {
		return kind === 'BLINKY' || kind === 'PINKY' || kind === 'INKY' || kind === 'CLYDE';
	}
}
