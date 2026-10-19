export type GhostKind = 'BLINKY' | 'PINKY' | 'INKY' | 'CLYDE';

export type GhostState =
	| 'lair'
	| 'exiting'
	| 'active'
	| 'frightened'
	| 'eyes'
	| 'hypnotized'
	| 'enraged';

export type GhostDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GhostTile {
	readonly x: number;
	readonly y: number;
}

export class GhostModel {
	private readonly kindValue: GhostKind;
	private tileValue: GhostTile;
	private targetValue: GhostTile | null = null;
	private facingValue: GhostDirection | null = null;
	private progressValue = 0;
	private readonly speedValue: number;
	private stateValue: GhostState = 'lair';
	private exitTimerValue: number;
	private forceReverseValue = false;

	constructor(kind: GhostKind, spawn: GhostTile, speed: number, exitDelay: number) {
		if (!Number.isInteger(spawn.x) || !Number.isInteger(spawn.y) || spawn.x < 0 || spawn.y < 0) {
			console.error('GhostModel.constructor', 'invalid spawn', { kind, spawn });
			throw new Error('GhostModel.constructor: invalid spawn');
		}

		if (!Number.isFinite(speed) || speed <= 0) {
			console.error('GhostModel.constructor', 'invalid speed', { kind, speed });
			throw new Error('GhostModel.constructor: speed must be positive');
		}

		if (!Number.isFinite(exitDelay) || exitDelay < 0) {
			console.error('GhostModel.constructor', 'invalid exit delay', { kind, exitDelay });
			throw new Error('GhostModel.constructor: exit delay must be non-negative');
		}

		this.kindValue = kind;
		this.tileValue = { x: spawn.x, y: spawn.y };
		this.speedValue = speed;
		this.exitTimerValue = exitDelay;
	}

	get kind(): GhostKind {
		return this.kindValue;
	}

	get tile(): GhostTile {
		return this.tileValue;
	}

	get target(): GhostTile | null {
		return this.targetValue;
	}

	get facing(): GhostDirection | null {
		return this.facingValue;
	}

	get progress(): number {
		return this.progressValue;
	}

	get speed(): number {
		return this.speedValue;
	}

	get state(): GhostState {
		return this.stateValue;
	}

	get exitTimer(): number {
		return this.exitTimerValue;
	}

	get forceReverse(): boolean {
		return this.forceReverseValue;
	}

	get position(): { x: number; y: number } {
		const baseX = this.tileValue.x + 0.5;
		const baseY = this.tileValue.y + 0.5;

		if (!this.targetValue) {
			return { x: baseX, y: baseY };
		}

		const t = Math.min(1, Math.max(0, this.progressValue));
		const dx = this.targetValue.x - this.tileValue.x;
		const dy = this.targetValue.y - this.tileValue.y;

		return { x: baseX + dx * t, y: baseY + dy * t };
	}

	setState(state: GhostState): void {
		this.stateValue = state;
	}

	setForceReverse(value: boolean): void {
		this.forceReverseValue = value;
	}

	decreaseExitTimer(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('GhostModel.decreaseExitTimer', 'invalid delta time', dt);
			return;
		}

		this.exitTimerValue = Math.max(0, this.exitTimerValue - dt);
	}

	beginMove(direction: GhostDirection, target: GhostTile): void {
		if (!Number.isInteger(target.x) || !Number.isInteger(target.y) || target.x < 0 || target.y < 0) {
			console.error('GhostModel.beginMove', 'invalid target', { kind: this.kindValue, target });
			throw new Error('GhostModel.beginMove: invalid target');
		}

		const distance = Math.abs(target.x - this.tileValue.x) + Math.abs(target.y - this.tileValue.y);

		if (distance !== 1) {
			console.error('GhostModel.beginMove', 'target is not adjacent', {
				kind: this.kindValue,
				current: this.tileValue,
				target
			});
			throw new Error('GhostModel.beginMove: target is not adjacent');
		}

		this.facingValue = direction;
		this.targetValue = { x: target.x, y: target.y };
		this.progressValue = 0;
	}

	addProgress(amount: number): void {
		if (!Number.isFinite(amount) || amount < 0) {
			console.error('GhostModel.addProgress', 'invalid progress amount', {
				kind: this.kindValue,
				amount
			});
			return;
		}

		this.progressValue = Math.min(1, this.progressValue + amount);
	}

	completeMove(): void {
		if (!this.targetValue) {
			console.error('GhostModel.completeMove', 'no active move', { kind: this.kindValue });
			return;
		}

		this.tileValue = this.targetValue;
		this.targetValue = null;
		this.progressValue = 0;
	}

	teleportTo(destination: GhostTile): void {
		if (
			!Number.isInteger(destination.x) ||
			!Number.isInteger(destination.y) ||
			destination.x < 0 ||
			destination.y < 0
		) {
			console.error('GhostModel.teleportTo', 'invalid destination', {
				kind: this.kindValue,
				destination
			});
			throw new Error('GhostModel.teleportTo: invalid destination');
		}

		this.tileValue = { x: destination.x, y: destination.y };
		this.targetValue = null;
		this.progressValue = 0;
	}

	reset(spawn: GhostTile, exitDelay: number): void {
		if (!Number.isInteger(spawn.x) || !Number.isInteger(spawn.y) || spawn.x < 0 || spawn.y < 0) {
			console.error('GhostModel.reset', 'invalid spawn', { kind: this.kindValue, spawn });
			throw new Error('GhostModel.reset: invalid spawn');
		}

		if (!Number.isFinite(exitDelay) || exitDelay < 0) {
			console.error('GhostModel.reset', 'invalid exit delay', { kind: this.kindValue, exitDelay });
			throw new Error('GhostModel.reset: exit delay must be non-negative');
		}

		this.tileValue = { x: spawn.x, y: spawn.y };
		this.targetValue = null;
		this.facingValue = null;
		this.progressValue = 0;
		this.stateValue = 'lair';
		this.exitTimerValue = exitDelay;
		this.forceReverseValue = false;
	}
}