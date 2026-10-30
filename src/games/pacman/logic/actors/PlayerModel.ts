export type PlayerDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface PlayerTile {
	readonly x: number;
	readonly y: number;
}

const RESPAWN_INVULNERABILITY = 2;
const TELEPORT_INVULNERABILITY = 0.5;
const TELEPORT_IMPULSE = 0.3;

export class PlayerModel {
	private tileValue: PlayerTile;
	private targetValue: PlayerTile | null = null;
	private facingValue: PlayerDirection | null = null;
	private desiredValue: PlayerDirection | null = null;
	private progressValue = 0;
	private readonly speedValue: number;
	private invulnerableValue = 0;
	private impulseValue = 0;

	constructor(spawn: PlayerTile, speed = 6) {
		if (!Number.isInteger(spawn.x) || !Number.isInteger(spawn.y) || spawn.x < 0 || spawn.y < 0) {
			console.error('PlayerModel.constructor', 'invalid spawn', spawn);
			throw new Error('PlayerModel.constructor: invalid spawn');
		}
		if (!Number.isFinite(speed) || speed <= 0) {
			console.error('PlayerModel.constructor', 'invalid speed', speed);
			throw new Error('PlayerModel.constructor: speed must be positive');
		}
		this.tileValue = { x: spawn.x, y: spawn.y };
		this.speedValue = speed;
	}

	get tile(): PlayerTile {
		return this.tileValue;
	}

	get target(): PlayerTile | null {
		return this.targetValue;
	}

	get facing(): PlayerDirection | null {
		return this.facingValue;
	}

	get desired(): PlayerDirection | null {
		return this.desiredValue;
	}

	get progress(): number {
		return this.progressValue;
	}

	get speed(): number {
		return this.speedValue;
	}

	get isInvulnerable(): boolean {
		return this.invulnerableValue > 0;
	}

	get invulnerableTimer(): number {
		return this.invulnerableValue;
	}

	get isImpulsing(): boolean {
		return this.impulseValue > 0;
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

	setDesired(direction: PlayerDirection): void {
		this.desiredValue = direction;
	}

	grantInvulnerability(seconds: number): void {
		if (!Number.isFinite(seconds) || seconds < 0) {
			console.error('PlayerModel.grantInvulnerability', 'invalid duration', seconds);
			return;
		}
		this.invulnerableValue = Math.max(this.invulnerableValue, seconds);
	}

	beginMove(direction: PlayerDirection, target: PlayerTile): void {
		if (
			!Number.isInteger(target.x) ||
			!Number.isInteger(target.y) ||
			target.x < 0 ||
			target.y < 0
		) {
			console.error('PlayerModel.beginMove', 'invalid target', target);
			throw new Error('PlayerModel.beginMove: invalid target');
		}
		const distance = Math.abs(target.x - this.tileValue.x) + Math.abs(target.y - this.tileValue.y);
		if (distance !== 1) {
			console.error('PlayerModel.beginMove', 'target is not adjacent', {
				current: this.tileValue,
				target
			});
			throw new Error('PlayerModel.beginMove: target is not adjacent');
		}
		this.facingValue = direction;
		this.targetValue = { x: target.x, y: target.y };
		this.progressValue = 0;
	}

	/** Turns round mid-move: heads back to the tile it left, from the same spot. */
	reverse(direction: PlayerDirection): void {
		if (!this.targetValue) {
			return;
		}
		const from = this.tileValue;
		this.tileValue = this.targetValue;
		this.targetValue = from;
		this.progressValue = 1 - this.progressValue;
		this.facingValue = direction;
	}

	/** Drops the move just begun: back on the tile it was leaving. */
	cancelMove(): void {
		this.targetValue = null;
		this.progressValue = 0;
	}

	addProgress(amount: number): void {
		if (!Number.isFinite(amount) || amount < 0) {
			console.error('PlayerModel.addProgress', 'invalid progress amount', amount);
			return;
		}
		this.progressValue = Math.min(1, this.progressValue + amount);
	}

	completeMove(): void {
		if (!this.targetValue) {
			console.error('PlayerModel.completeMove', 'no active move');
			return;
		}
		this.tileValue = this.targetValue;
		this.targetValue = null;
		this.progressValue = 0;
	}

	teleportTo(destination: PlayerTile): void {
		if (
			!Number.isInteger(destination.x) ||
			!Number.isInteger(destination.y) ||
			destination.x < 0 ||
			destination.y < 0
		) {
			console.error('PlayerModel.teleportTo', 'invalid destination', destination);
			throw new Error('PlayerModel.teleportTo: invalid destination');
		}
		this.tileValue = { x: destination.x, y: destination.y };
		this.targetValue = null;
		this.progressValue = 0;
		const currentInvulnerability = Number.isFinite(this.invulnerableValue)
			? Math.max(0, this.invulnerableValue)
			: 0;
		this.invulnerableValue = Math.max(currentInvulnerability, TELEPORT_INVULNERABILITY);
		this.impulseValue = TELEPORT_IMPULSE;
	}

	decreaseInvulnerability(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('PlayerModel.decreaseInvulnerability', 'invalid delta time', dt);
			return;
		}
		this.invulnerableValue = Math.max(0, this.invulnerableValue - dt);
	}

	decreaseImpulse(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('PlayerModel.decreaseImpulse', 'invalid delta time', dt);
			return;
		}
		this.impulseValue = Math.max(0, this.impulseValue - dt);
	}

	reset(spawn: PlayerTile): void {
		if (!Number.isInteger(spawn.x) || !Number.isInteger(spawn.y) || spawn.x < 0 || spawn.y < 0) {
			console.error('PlayerModel.reset', 'invalid spawn', spawn);
			throw new Error('PlayerModel.reset: invalid spawn');
		}
		this.tileValue = { x: spawn.x, y: spawn.y };
		this.targetValue = null;
		this.facingValue = null;
		this.desiredValue = null;
		this.progressValue = 0;
		this.invulnerableValue = RESPAWN_INVULNERABILITY;
		this.impulseValue = 0;
	}
}
