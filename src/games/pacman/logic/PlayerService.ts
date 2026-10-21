import type { GridService } from './GridService';
import type { LevelProgress } from './LevelProgress';
import { PlayerModel } from './PlayerModel';
import type { PlayerDirection, PlayerTile } from './PlayerModel';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';

const VECTORS: Record<PlayerDirection, { x: number; y: number }> = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 }
};
const DIRECTIONS: readonly PlayerDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
const EPSILON = 1e-6;
const BOLT_SPEED = 12;
const BOLT_MAX_TILES = 8;
const BOLT_LOOKAHEAD = 3;

export class PlayerService {
	private readonly grid: GridService;
	private readonly progress: LevelProgress;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly player: PlayerModel;
	private speedModifierValue = 1;
	private boltRemainingValue = 0;
	private boltDirectionValue: PlayerDirection | null = null;

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
		return this.player.isInvulnerable || this.isBolting;
	}

	get isBolting(): boolean {
		return this.boltRemainingValue > 0;
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
	}

	startBolt(direction: PlayerDirection): void {
		if (this.isBolting) {
			return;
		}
		this.boltRemainingValue = BOLT_MAX_TILES;
		this.boltDirectionValue = direction;
		this.player.setDesired(direction);
	}

	reset(): void {
		this.player.reset(this.grid.playerSpawn);
		this.endBolt();
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('PlayerService.update', 'invalid delta time', dt);
			return;
		}
		if (this.isBolting) {
			this.updateBolt(dt);
			return;
		}
		let remaining = Math.min(0.25, Math.max(0, dt));
		this.player.decreaseInvulnerability(remaining);
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
			const step = this.player.speed * this.speedModifierValue * remaining;
			if (step < needed) {
				this.player.addProgress(step);
				remaining = 0;
			} else {
				remaining -= needed / (this.player.speed * this.speedModifierValue);
				this.player.completeMove();
				if (this.handleArrival()) {
					break;
				}
			}
		}
		if (guard >= 512) {
			console.error('PlayerService.update', 'movement guard exhausted');
		}
	}

	private updateBolt(dt: number): void {
		let remaining = Math.min(0.25, Math.max(0, dt));
		this.player.decreaseInvulnerability(remaining);
		let guard = 0;
		while (remaining > EPSILON && this.boltRemainingValue > 0 && guard < 512) {
			guard += 1;
			if (!this.player.target) {
				const direction = this.chooseBoltDirection();
				if (!direction) {
					this.endBolt();
					break;
				}
				const target = this.targetFor(this.player.tile, direction);
				if (!this.grid.isPlayerWalkable(target.x, target.y)) {
					this.endBolt();
					break;
				}
				this.player.beginMove(direction, target);
				this.boltDirectionValue = direction;
			}
			const needed = Math.max(0, 1 - this.player.progress);
			if (needed <= EPSILON) {
				this.player.completeMove();
				this.handleBoltArrival();
				continue;
			}
			const step = BOLT_SPEED * remaining;
			if (step < needed) {
				this.player.addProgress(step);
				remaining = 0;
			} else {
				remaining -= needed / BOLT_SPEED;
				this.player.completeMove();
				this.handleBoltArrival();
			}
		}
		if (guard >= 512) {
			console.error('PlayerService.updateBolt', 'movement guard exhausted');
		}
	}

	private handleBoltArrival(): void {
		this.boltRemainingValue = Math.max(0, this.boltRemainingValue - 1);
		const tile = this.player.tile;
		this.progress.collectDotOnly(tile.x, tile.y);
		if (this.boltRemainingValue <= 0) {
			this.endBolt();
		}
	}

	private endBolt(): void {
		this.boltRemainingValue = 0;
		this.boltDirectionValue = null;
	}

	private chooseBoltDirection(): PlayerDirection | null {
		const facing = this.boltDirectionValue;
		const opposite = facing ? this.oppositeDirection(facing) : null;
		const desired = this.player.desired;
		const candidates: PlayerDirection[] = [];
		for (const direction of DIRECTIONS) {
			if (direction === opposite) {
				continue;
			}
			const target = this.targetFor(this.player.tile, direction);
			if (this.grid.isPlayerWalkable(target.x, target.y)) {
				candidates.push(direction);
			}
		}
		if (candidates.length === 0) {
			return null;
		}
		if (candidates.length === 1) {
			return candidates[0];
		}
		if (desired && candidates.includes(desired) && this.countDotsAhead(desired) > 0) {
			return desired;
		}
		let best: PlayerDirection | null = null;
		let bestDots = -1;
		for (const direction of candidates) {
			const dots = this.countDotsAhead(direction);
			if (dots > bestDots) {
				bestDots = dots;
				best = direction;
			}
		}
		return best ?? candidates[0];
	}

	private countDotsAhead(direction: PlayerDirection): number {
		let count = 0;
		let x = this.player.tile.x;
		let y = this.player.tile.y;
		const vector = VECTORS[direction];
		for (let step = 0; step < BOLT_LOOKAHEAD; step += 1) {
			x += vector.x;
			y += vector.y;
			if (!this.grid.isInside(x, y)) {
				break;
			}
			const tile = this.grid.tileAt(x, y);
			if (tile === 'WL' || tile === 'ES') {
				break;
			}
			if (tile === 'DT' && !this.progress.isCollected(x, y)) {
				count += 1;
			}
		}
		return count;
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
}