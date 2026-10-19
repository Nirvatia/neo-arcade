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

const EPSILON = 1e-6;

export class PlayerService {
	private readonly grid: GridService;
	private readonly progress: LevelProgress;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly player: PlayerModel;

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

	get isInvulnerable(): boolean {
		return this.player.isInvulnerable;
	}

	setDesiredDirection(direction: PlayerDirection): void {
		this.player.setDesired(direction);
	}

	reset(): void {
		this.player.reset(this.grid.playerSpawn);
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('PlayerService.update', 'invalid delta time', dt);
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

			const step = this.player.speed * remaining;

			if (step < needed) {
				this.player.addProgress(step);
				remaining = 0;
			} else {
				remaining -= needed / this.player.speed;
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