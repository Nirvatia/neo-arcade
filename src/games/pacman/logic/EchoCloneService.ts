import type { GridService } from './GridService';
import type { LevelProgress } from './LevelProgress';
import type { SpawnLocator } from './SpawnLocator';
import type { PlayerService } from './PlayerService';
import type { GridPoint } from './GridModel';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';

export type EchoClonePhase = 'waiting' | 'token' | 'clone' | 'spent';

export type EchoDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface EchoTile {
	readonly x: number;
	readonly y: number;
}

const VECTORS: Record<EchoDirection, { x: number; y: number }> = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 }
};
const DIRECTIONS: readonly EchoDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
const SPAWN_THRESHOLD = 0.6;
const TOKEN_DURATION = 8;
const CLONE_DURATION = 4;
const CLONE_SPEED = 6;
const DENSITY_RADIUS = 2;
const CONTACT_DISTANCE_SQ = 0.25;
const EPSILON = 1e-6;

export class EchoCloneService {
	private readonly grid: GridService;
	private readonly progress: LevelProgress;
	private readonly locator: SpawnLocator;
	private readonly events: EventBus<PacmanEventMap>;
	private phaseValue: EchoClonePhase = 'waiting';
	private tokenTileValue: GridPoint | null = null;
	private tokenTimerValue = 0;
	private cloneTileValue: EchoTile | null = null;
	private cloneTargetValue: EchoTile | null = null;
	private cloneFacingValue: EchoDirection | null = null;
	private cloneProgressValue = 0;
	private cloneTimerValue = 0;
	private hotspotValue: EchoTile | null = null;

	constructor(
		grid: GridService,
		progress: LevelProgress,
		locator: SpawnLocator,
		events: EventBus<PacmanEventMap>
	) {
		if (!grid) {
			console.error('EchoCloneService.constructor', 'missing grid service');
			throw new Error('EchoCloneService.constructor: missing grid service');
		}
		if (!progress) {
			console.error('EchoCloneService.constructor', 'missing level progress');
			throw new Error('EchoCloneService.constructor: missing level progress');
		}
		if (!locator) {
			console.error('EchoCloneService.constructor', 'missing spawn locator');
			throw new Error('EchoCloneService.constructor: missing spawn locator');
		}
		if (!events) {
			console.error('EchoCloneService.constructor', 'missing event bus');
			throw new Error('EchoCloneService.constructor: missing event bus');
		}
		this.grid = grid;
		this.progress = progress;
		this.locator = locator;
		this.events = events;
	}

	get phase(): EchoClonePhase {
		return this.phaseValue;
	}

	get timer(): number {
		if (this.phaseValue === 'clone') {
			return this.cloneTimerValue;
		}
		if (this.phaseValue === 'token') {
			return this.tokenTimerValue;
		}
		return 0;
	}

	get facing(): EchoDirection | null {
		if (this.phaseValue !== 'clone') {
			return null;
		}
		return this.cloneFacingValue;
	}

	get position(): { x: number; y: number } {
		if (this.phaseValue === 'clone') {
			const tile = this.cloneTileValue;
			if (!tile) {
				console.error('EchoCloneService.position', 'clone tile is not assigned');
				return { x: 0, y: 0 };
			}
			const baseX = tile.x + 0.5;
			const baseY = tile.y + 0.5;
			if (!this.cloneTargetValue) {
				return { x: baseX, y: baseY };
			}
			const t = Math.min(1, Math.max(0, this.cloneProgressValue));
			const dx = this.cloneTargetValue.x - tile.x;
			const dy = this.cloneTargetValue.y - tile.y;
			return { x: baseX + dx * t, y: baseY + dy * t };
		}
		const tile = this.tokenTileValue;
		if (!tile) {
			console.error('EchoCloneService.position', 'token tile is not assigned');
			return { x: 0, y: 0 };
		}
		return { x: tile.x + 0.5, y: tile.y + 0.5 };
	}

	reset(): void {
		this.phaseValue = 'waiting';
		this.tokenTileValue = null;
		this.tokenTimerValue = 0;
		this.cloneTileValue = null;
		this.cloneTargetValue = null;
		this.cloneFacingValue = null;
		this.cloneProgressValue = 0;
		this.cloneTimerValue = 0;
		this.hotspotValue = null;
	}

	debugSpawn(): void {
		if (this.phaseValue === 'token' || this.phaseValue === 'clone') {
			return;
		}
		const tile = this.locator.findSafeTile(this.progress.collectedDots) ?? this.findAnyDotTile();
		if (!tile) {
			console.error('EchoCloneService.debugSpawn', 'no spawn tile available');
			return;
		}
		this.tokenTileValue = tile;
		this.tokenTimerValue = TOKEN_DURATION;
		this.phaseValue = 'token';
		this.events.emit('audio:cue', { cue: 'fruit-spawn' });
	}

	update(dt: number, player: PlayerService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('EchoCloneService.update', 'invalid delta time', dt);
			return;
		}
		if (!player) {
			console.error('EchoCloneService.update', 'missing player service');
			return;
		}
		if (this.phaseValue === 'waiting') {
			if (this.progress.collectionRatio >= SPAWN_THRESHOLD && this.progress.remainingDots > 0) {
				this.spawnToken();
			}
			return;
		}
		if (this.phaseValue === 'token') {
			this.tokenTimerValue = Math.max(0, this.tokenTimerValue - dt);
			if (this.tokenTimerValue <= 0) {
				this.phaseValue = 'spent';
				this.tokenTileValue = null;
				this.events.emit('audio:cue', { cue: 'fruit-expire' });
				return;
			}
			if (this.touchesPlayer(player)) {
				this.activate();
			}
			return;
		}
		if (this.phaseValue === 'clone') {
			this.cloneTimerValue = Math.max(0, this.cloneTimerValue - dt);
			if (this.cloneTimerValue <= 0) {
				this.finishClone();
				return;
			}
			this.moveClone(dt);
		}
	}

	private spawnToken(): void {
		const tile = this.locator.findSafeTile(this.progress.collectedDots);
		if (!tile) {
			return;
		}
		this.tokenTileValue = tile;
		this.tokenTimerValue = TOKEN_DURATION;
		this.phaseValue = 'token';
		this.events.emit('audio:cue', { cue: 'fruit-spawn' });
	}

	private activate(): void {
		const spawn = this.findDensityCenter();
		if (!spawn) {
			this.phaseValue = 'spent';
			this.tokenTileValue = null;
			this.tokenTimerValue = 0;
			return;
		}
		this.cloneTileValue = { x: spawn.x, y: spawn.y };
		this.cloneTargetValue = null;
		this.cloneFacingValue = null;
		this.cloneProgressValue = 0;
		this.cloneTimerValue = CLONE_DURATION;
		this.hotspotValue = null;
		this.tokenTileValue = null;
		this.tokenTimerValue = 0;
		this.phaseValue = 'clone';
		this.events.emit('audio:cue', { cue: 'power-start' });
	}

	private moveClone(dt: number): void {
		let remaining = Math.min(0.25, Math.max(0, dt));
		let guard = 0;
		while (remaining > EPSILON && this.phaseValue === 'clone' && guard < 512) {
			guard += 1;
			if (!this.cloneTargetValue) {
				if (!this.cloneTileValue) {
					console.error('EchoCloneService.moveClone', 'clone tile is not assigned');
					this.finishClone();
					return;
				}
				const direction = this.chooseDirection();
				if (!direction) {
					this.finishClone();
					return;
				}
				const target = this.targetFor(this.cloneTileValue, direction);
				if (!this.grid.isPlayerWalkable(target.x, target.y)) {
					this.finishClone();
					return;
				}
				this.cloneFacingValue = direction;
				this.cloneTargetValue = target;
				this.cloneProgressValue = 0;
			}
			const needed = Math.max(0, 1 - this.cloneProgressValue);
			if (needed <= EPSILON) {
				this.completeMove();
				this.handleArrival();
				continue;
			}
			const step = CLONE_SPEED * remaining;
			if (step < needed) {
				this.cloneProgressValue = Math.min(1, this.cloneProgressValue + step);
				remaining = 0;
			} else {
				remaining -= needed / CLONE_SPEED;
				this.completeMove();
				this.handleArrival();
			}
		}
		if (guard >= 512) {
			console.error('EchoCloneService.moveClone', 'movement guard exhausted');
		}
	}

	private completeMove(): void {
		if (!this.cloneTargetValue || !this.cloneTileValue) {
			return;
		}
		this.cloneTileValue = this.cloneTargetValue;
		this.cloneTargetValue = null;
		this.cloneProgressValue = 0;
	}

	private handleArrival(): void {
		const tile = this.cloneTileValue;
		if (!tile) {
			return;
		}
		this.progress.collectDotOnly(tile.x, tile.y);
		if (this.progress.remainingDots <= 0) {
			this.finishClone();
			return;
		}
		const hotspot = this.hotspotValue;
		if (hotspot && tile.x === hotspot.x && tile.y === hotspot.y) {
			this.hotspotValue = null;
		}
	}

	private chooseDirection(): EchoDirection | null {
		const tile = this.cloneTileValue;
		if (!tile) {
			return null;
		}
		const hotspot = this.ensureHotspot();
		if (!hotspot) {
			return null;
		}
		const candidates: EchoDirection[] = [];
		for (const direction of DIRECTIONS) {
			const target = this.targetFor(tile, direction);
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
		const facing = this.cloneFacingValue;
		const opposite = facing ? this.oppositeDirection(facing) : null;
		let choices = candidates;
		if (opposite) {
			const filtered = candidates.filter((direction) => direction !== opposite);
			if (filtered.length > 0) {
				choices = filtered;
			}
		}
		let best: EchoDirection | null = null;
		let bestScore = Number.POSITIVE_INFINITY;
		for (const direction of choices) {
			const candidate = this.targetFor(tile, direction);
			const score = this.distanceSq(candidate, hotspot);
			if (score < bestScore) {
				bestScore = score;
				best = direction;
			}
		}
		return best ?? choices[0];
	}

	private ensureHotspot(): EchoTile | null {
		const current = this.hotspotValue;
		if (current) {
			if (
				this.grid.tileAt(current.x, current.y) === 'DT' &&
				!this.progress.isCollected(current.x, current.y)
			) {
				return current;
			}
		}
		const next = this.findDensityCenter();
		this.hotspotValue = next;
		return next;
	}

	private findDensityCenter(): GridPoint | null {
		let best: GridPoint | null = null;
		let bestDensity = -1;
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (this.grid.tileAt(x, y) !== 'DT') {
					continue;
				}
				if (this.progress.isCollected(x, y)) {
					continue;
				}
				const density = this.countDensity(x, y);
				if (density > bestDensity) {
					bestDensity = density;
					best = { x, y };
				}
			}
		}
		return best;
	}

	private findAnyDotTile(): GridPoint | null {
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (this.grid.tileAt(x, y) !== 'DT') {
					continue;
				}
				if (this.progress.isCollected(x, y)) {
					continue;
				}
				return { x, y };
			}
		}
		return null;
	}

	private countDensity(x: number, y: number): number {
		let count = 0;
		for (let dy = -DENSITY_RADIUS; dy <= DENSITY_RADIUS; dy += 1) {
			for (let dx = -DENSITY_RADIUS; dx <= DENSITY_RADIUS; dx += 1) {
				const nx = x + dx;
				const ny = y + dy;
				if (!this.grid.isInside(nx, ny)) {
					continue;
				}
				if (this.grid.tileAt(nx, ny) !== 'DT') {
					continue;
				}
				if (this.progress.isCollected(nx, ny)) {
					continue;
				}
				count += 1;
			}
		}
		return count;
	}

	private finishClone(): void {
		if (this.phaseValue !== 'clone') {
			return;
		}
		this.phaseValue = 'spent';
		this.cloneTargetValue = null;
		this.cloneProgressValue = 0;
		this.events.emit('audio:cue', { cue: 'power-end' });
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

	private targetFor(tile: EchoTile, direction: EchoDirection): EchoTile {
		const vector = VECTORS[direction];
		return { x: tile.x + vector.x, y: tile.y + vector.y };
	}

	private oppositeDirection(direction: EchoDirection): EchoDirection {
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

	private distanceSq(a: EchoTile, b: EchoTile): number {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		return dx * dx + dy * dy;
	}
}
