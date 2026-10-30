import type { GridService } from '../maze/GridService';
import type { LevelProgress } from '../level/LevelProgress';
import { PlayerModel } from './PlayerModel';
import type { PlayerDirection, PlayerTile } from './PlayerModel';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';

const VECTORS: Record<PlayerDirection, { x: number; y: number }> = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 }
};
const EPSILON = 1e-6;
const IMPULSE_SPEED = 1.5;
const RECOIL_SPEED = 9;
const DASH_SPEED = 10;
const DASH_INVULNERABILITY = 0.5;
const TRAIN_TRAIL_LENGTH = 96;
/** A turn pressed this far (in tiles) past a junction still takes it. */
const LATE_TURN = 0.15;

export class PlayerService {
	private readonly grid: GridService;
	private readonly progress: LevelProgress;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly player: PlayerModel;
	private speedModifierValue = 1;
	private trainActiveValue = false;
	private trailValue: PlayerTile[] = [];
	private lastTrailTileValue: PlayerTile | null = null;
	private recoilRemainingValue = 0;
	private recoilDirectionValue: PlayerDirection | null = null;
	private dashRemainingValue = 0;
	private dashDirectionValue: PlayerDirection | null = null;
	private movementLockedValue = false;

	constructor(grid: GridService, progress: LevelProgress, events: EventBus<PacmanEventMap>) {
		if (!grid) {
			console.error('PlayerService.constructor', 'missing grid service');
			throw new Error('PlayerService.constructor: missing grid service');
		}
		if (!progress) {
			console.error('PlayerService.constructor', 'missing level progress');
			throw new Error('PlayerService.constructor: missing level progress');
		}
		if (!events) {
			console.error('PlayerService.constructor', 'missing event bus');
			throw new Error('PlayerService.constructor: missing event bus');
		}
		this.grid = grid;
		this.progress = progress;
		this.events = events;
		this.player = new PlayerModel(grid.playerSpawn, 6);
	}

	get tile(): PlayerTile {
		return this.player.tile;
	}

	get position(): { x: number; y: number } {
		return this.player.position;
	}

	get facing(): PlayerDirection | null {
		return this.player.facing;
	}

	get desired(): PlayerDirection | null {
		return this.player.desired;
	}

	get isInvulnerable(): boolean {
		return this.player.isInvulnerable;
	}

	get invulnerableTimer(): number {
		return this.player.invulnerableTimer;
	}

	get isRecoiling(): boolean {
		return this.recoilRemainingValue > 0;
	}

	get isDashing(): boolean {
		return this.dashRemainingValue > 0;
	}

	get trail(): readonly PlayerTile[] {
		return this.trailValue;
	}

	get isMovementLocked(): boolean {
		return this.movementLockedValue;
	}

	get baseSpeed(): number {
		return this.player.speed;
	}

	setSpeedModifier(value: number): void {
		if (!Number.isFinite(value) || value <= 0) {
			console.error('PlayerService.setSpeedModifier', 'invalid modifier', value);
			return;
		}
		this.speedModifierValue = value;
	}

	setDesiredDirection(direction: PlayerDirection): void {
		this.player.setDesired(direction);
		const facing = this.player.facing;
		if (
			!this.player.target ||
			!facing ||
			direction === facing ||
			this.isRecoiling ||
			this.isDashing ||
			this.movementLockedValue
		) {
			return;
		}
		if (direction === this.oppositeDirection(facing)) {
			// a reversal never waits for the next tile: turn round on the spot, as in the arcade
			this.player.reverse(direction);
			return;
		}
		if (this.player.progress <= LATE_TURN && this.canMoveFrom(this.player.tile, direction)) {
			// pressed a moment after passing the turn: step back onto the junction and take it
			this.player.cancelMove();
		}
	}

	setTrainMode(value: boolean): void {
		this.trainActiveValue = value;
		if (!value) {
			this.clearTrail();
		}
	}

	setMovementLocked(value: boolean): void {
		this.movementLockedValue = value;
	}

	grantInvulnerability(seconds: number): void {
		this.player.grantInvulnerability(seconds);
	}

	startRecoilBackward(tiles: number): void {
		if (this.isRecoiling || this.isDashing) {
			return;
		}
		if (!Number.isFinite(tiles) || tiles <= 0) {
			console.error('PlayerService.startRecoilBackward', 'invalid tile count', tiles);
			return;
		}
		const facing = this.player.facing;
		if (!facing) {
			return;
		}
		this.recoilDirectionValue = this.oppositeDirection(facing);
		this.recoilRemainingValue = Math.floor(tiles);
		this.player.setDesired(this.recoilDirectionValue);
	}

	startDash(tiles: number): void {
		if (this.isDashing || this.isRecoiling) {
			return;
		}
		if (!Number.isFinite(tiles) || tiles <= 0) {
			console.error('PlayerService.startDash', 'invalid tile count', tiles);
			return;
		}
		const facing = this.player.facing;
		if (!facing) {
			return;
		}
		this.dashDirectionValue = facing;
		this.dashRemainingValue = Math.floor(tiles);
		this.player.setDesired(facing);
		this.player.grantInvulnerability(DASH_INVULNERABILITY);
	}

	reset(): void {
		this.player.reset(this.grid.playerSpawn);
		this.endRecoil();
		this.endDash();
		this.clearTrail();
		this.movementLockedValue = false;
	}

	getTrainTarget(offset: number): PlayerTile {
		const tile = this.player.tile;
		if (!this.trainActiveValue) {
			return tile;
		}
		if (!Number.isFinite(offset) || offset <= 0) {
			return tile;
		}
		if (this.trailValue.length === 0) {
			return tile;
		}
		const index = Math.min(this.trailValue.length - 1, Math.max(0, Math.floor(offset) - 1));
		const target = this.trailValue[index];
		return target ? target : tile;
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('PlayerService.update', 'invalid delta time', dt);
			return;
		}

		if (this.movementLockedValue) {
			const remaining = Math.min(0.25, Math.max(0, dt));
			this.player.decreaseInvulnerability(remaining);
			this.player.decreaseImpulse(remaining);
			return;
		}

		if (this.isDashing) {
			this.updateDash(dt);
			this.recordTrail();
			return;
		}
		if (this.isRecoiling) {
			this.updateRecoil(dt);
			this.recordTrail();
			return;
		}
		let remaining = Math.min(0.25, Math.max(0, dt));
		this.player.decreaseInvulnerability(remaining);
		this.player.decreaseImpulse(remaining);
		const speed = this.effectiveSpeed();
		let guard = 0;
		while (remaining > EPSILON && guard < 512) {
			guard += 1;
			if (!this.player.target) {
				const direction = this.chooseDirection();
				if (!direction) {
					break;
				}
				const target = this.targetFor(this.player.tile, direction);
				if (!this.grid.isPlayerWalkable(target.x, target.y)) {
					break;
				}
				this.player.beginMove(direction, target);
			}
			const needed = Math.max(0, 1 - this.player.progress);
			if (needed <= EPSILON) {
				this.player.completeMove();
				if (this.handleArrival()) {
					break;
				}
				continue;
			}
			const step = speed * remaining;
			if (step < needed) {
				this.player.addProgress(step);
				remaining = 0;
			} else {
				remaining -= needed / speed;
				this.player.completeMove();
				if (this.handleArrival()) {
					break;
				}
			}
		}
		if (guard >= 512) {
			console.error('PlayerService.update', 'movement guard exhausted');
		}
		this.recordTrail();
	}

	private updateRecoil(dt: number): void {
		let remaining = Math.min(0.25, Math.max(0, dt));
		this.player.decreaseInvulnerability(remaining);
		this.player.decreaseImpulse(remaining);
		let guard = 0;
		while (remaining > EPSILON && this.recoilRemainingValue > 0 && guard < 512) {
			guard += 1;
			if (!this.player.target) {
				const direction = this.recoilDirectionValue;
				if (!direction) {
					this.endRecoil();
					break;
				}
				const target = this.targetFor(this.player.tile, direction);
				if (!this.grid.isPlayerWalkable(target.x, target.y)) {
					this.endRecoil();
					break;
				}
				this.player.beginMove(direction, target);
			}
			const needed = Math.max(0, 1 - this.player.progress);
			if (needed <= EPSILON) {
				this.player.completeMove();
				this.handleRecoilArrival();
				continue;
			}
			const step = RECOIL_SPEED * remaining;
			if (step < needed) {
				this.player.addProgress(step);
				remaining = 0;
			} else {
				remaining -= needed / RECOIL_SPEED;
				this.player.completeMove();
				this.handleRecoilArrival();
			}
		}
		if (guard >= 512) {
			console.error('PlayerService.updateRecoil', 'movement guard exhausted');
		}
	}

	private updateDash(dt: number): void {
		let remaining = Math.min(0.25, Math.max(0, dt));
		this.player.decreaseInvulnerability(remaining);
		this.player.decreaseImpulse(remaining);
		let guard = 0;
		while (remaining > EPSILON && this.dashRemainingValue > 0 && guard < 512) {
			guard += 1;
			if (!this.player.target) {
				const direction = this.dashDirectionValue;
				if (!direction) {
					this.endDash();
					break;
				}
				const target = this.targetFor(this.player.tile, direction);
				if (!this.grid.isPlayerWalkable(target.x, target.y)) {
					this.endDash();
					break;
				}
				this.player.beginMove(direction, target);
			}
			const needed = Math.max(0, 1 - this.player.progress);
			if (needed <= EPSILON) {
				this.player.completeMove();
				this.handleDashArrival();
				continue;
			}
			const step = DASH_SPEED * remaining;
			if (step < needed) {
				this.player.addProgress(step);
				remaining = 0;
			} else {
				remaining -= needed / DASH_SPEED;
				this.player.completeMove();
				this.handleDashArrival();
			}
		}
		if (guard >= 512) {
			console.error('PlayerService.updateDash', 'movement guard exhausted');
		}
	}

	private handleRecoilArrival(): void {
		this.recoilRemainingValue = Math.max(0, this.recoilRemainingValue - 1);
		this.handleArrival();
		if (this.recoilRemainingValue <= 0) {
			this.endRecoil();
		}
	}

	private handleDashArrival(): void {
		this.dashRemainingValue = Math.max(0, this.dashRemainingValue - 1);
		this.handleArrival();
		if (this.dashRemainingValue <= 0) {
			this.endDash();
		}
	}

	private endRecoil(): void {
		this.recoilRemainingValue = 0;
		this.recoilDirectionValue = null;
	}

	private endDash(): void {
		this.dashRemainingValue = 0;
		this.dashDirectionValue = null;
	}

	private effectiveSpeed(): number {
		const base = this.player.speed * this.speedModifierValue;
		if (this.player.isImpulsing) {
			return base * IMPULSE_SPEED;
		}
		return base;
	}

	private chooseDirection(): PlayerDirection | null {
		const desired = this.player.desired;
		if (desired && this.canMoveFrom(this.player.tile, desired)) {
			return desired;
		}
		const facing = this.player.facing;
		if (facing && this.canMoveFrom(this.player.tile, facing)) {
			return facing;
		}
		return null;
	}

	private canMoveFrom(tile: PlayerTile, direction: PlayerDirection): boolean {
		const target = this.targetFor(tile, direction);
		return this.grid.isPlayerWalkable(target.x, target.y);
	}

	private targetFor(tile: PlayerTile, direction: PlayerDirection): PlayerTile {
		const vector = VECTORS[direction];
		return { x: tile.x + vector.x, y: tile.y + vector.y };
	}

	private oppositeDirection(direction: PlayerDirection): PlayerDirection {
		if (direction === 'UP') {
			return 'DOWN';
		}
		if (direction === 'DOWN') {
			return 'UP';
		}
		if (direction === 'LEFT') {
			return 'RIGHT';
		}
		return 'LEFT';
	}

	private handleArrival(): boolean {
		const tile = this.player.tile;
		this.progress.collectAt(tile.x, tile.y);
		if (!this.grid.isTeleport(tile.x, tile.y)) {
			return false;
		}
		const destination = this.grid.teleportDestination(tile.x, tile.y);
		if (!destination) {
			console.error('PlayerService.handleArrival', 'missing teleport destination', tile);
			return false;
		}
		this.player.teleportTo(destination);
		this.events.emit('audio:cue', { cue: 'teleport' });
		this.progress.collectAt(destination.x, destination.y);
		return true;
	}

	private recordTrail(): void {
		if (!this.trainActiveValue) {
			return;
		}
		const tile = this.player.tile;
		if (
			this.lastTrailTileValue &&
			this.lastTrailTileValue.x === tile.x &&
			this.lastTrailTileValue.y === tile.y
		) {
			return;
		}
		this.lastTrailTileValue = { x: tile.x, y: tile.y };
		this.trailValue.unshift({ x: tile.x, y: tile.y });
		if (this.trailValue.length > TRAIN_TRAIL_LENGTH) {
			this.trailValue.pop();
		}
	}

	private clearTrail(): void {
		this.trailValue = [];
		this.lastTrailTileValue = null;
	}
}
