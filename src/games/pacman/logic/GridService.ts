import type { GhostKind, GridModel, GridPoint, TileType } from './GridModel';
import { isTeleportToken } from '../config/gridConfig';
import { isLairToken } from './LairExit';

export class GridService {
	private readonly model: GridModel;
	private lairOpenValue = false;
	private lairEggTileValue: GridPoint | null = null;
	private lairEggTileResolved = false;
	private readonly voidBlockedTiles = new Set<string>();

	constructor(model: GridModel) {
		if (
			!model ||
			!Number.isFinite(model.width) ||
			model.width <= 0 ||
			!Number.isFinite(model.height) ||
			model.height <= 0
		) {
			console.error('GridService.constructor', 'invalid grid model');
			throw new Error('GridService.constructor: invalid grid model');
		}
		this.model = model;
	}

	get width(): number {
		return this.model.width;
	}

	get height(): number {
		return this.model.height;
	}

	get dotCount(): number {
		return this.model.dotCount;
	}

	get energizerCount(): number {
		return this.model.energizerCount;
	}

	get playerSpawn(): GridPoint {
		return this.model.playerSpawn;
	}

	get ghostSpawns(): Record<GhostKind, GridPoint> {
		return this.model.ghostSpawns;
	}

	get lairOpen(): boolean {
		return this.lairOpenValue;
	}

	setLairOpen(value: boolean): void {
		this.lairOpenValue = value;
	}

	tileAt(x: number, y: number): TileType {
		return this.model.tileAt(x, y);
	}

	isInside(x: number, y: number): boolean {
		return this.model.isInside(x, y);
	}

	/** Inside the maze and not a wall; the empty ES border around the maze is never walkable. */
	isWalkable(x: number, y: number): boolean {
		if (!this.isInside(x, y)) {
			return false;
		}
		const tile = this.model.tileAt(x, y);
		return tile !== 'WL' && tile !== 'ES';
	}

	isPlayerWalkable(x: number, y: number): boolean {
		if (!this.isInside(x, y)) {
			return false;
		}
		const tile = this.tileAt(x, y);
		if (tile === 'WL' || tile === 'ES') {
			return false;
		}
		if (this.voidBlockedTiles.has(`${x},${y}`)) {
			return false;
		}
		if (isLairToken(tile)) {
			return this.lairOpenValue;
		}
		return true;
	}

	isGhostWalkable(x: number, y: number, allowLair: boolean): boolean {
		if (!this.isInside(x, y)) {
			return false;
		}
		const tile = this.tileAt(x, y);
		if (tile === 'WL' || tile === 'ES') {
			return false;
		}
		if (allowLair) {
			return true;
		}
		return !isLairToken(tile);
	}

	isDot(x: number, y: number): boolean {
		return this.model.tileAt(x, y) === 'DT';
	}

	isEnergizer(x: number, y: number): boolean {
		return this.model.tileAt(x, y) === 'EU';
	}

	isTeleport(x: number, y: number): boolean {
		return isTeleportToken(this.model.tileAt(x, y));
	}

	teleportDestination(x: number, y: number): GridPoint | undefined {
		const tile = this.model.tileAt(x, y);
		if (!isTeleportToken(tile)) {
			return undefined;
		}
		return this.model.getTeleportDestination(tile, x, y);
	}

	bossSpawn(): GridPoint | null {
		for (let y = 0; y < this.height; y += 1) {
			for (let x = 0; x < this.width; x += 1) {
				if (this.tileAt(x, y) === 'DB') {
					return { x, y };
				}
			}
		}
		return null;
	}

	setVoidBlocked(x: number, y: number, blocked: boolean): void {
		const key = `${x},${y}`;
		if (blocked) {
			this.voidBlockedTiles.add(key);
		} else {
			this.voidBlockedTiles.delete(key);
		}
	}

	clearVoidBlocked(): void {
		this.voidBlockedTiles.clear();
	}

	isVoidBlocked(x: number, y: number): boolean {
		return this.voidBlockedTiles.has(`${x},${y}`);
	}

	lairEggTile(): GridPoint | null {
		if (this.lairEggTileResolved) {
			return this.lairEggTileValue;
		}
		this.lairEggTileResolved = true;
		for (let y = 0; y < this.height; y += 1) {
			for (let x = 0; x < this.width; x += 1) {
				if (this.tileAt(x, y) === 'LT') {
					this.lairEggTileValue = { x, y };
					return this.lairEggTileValue;
				}
			}
		}
		for (let y = 0; y < this.height; y += 1) {
			for (let x = 0; x < this.width; x += 1) {
				if (this.tileAt(x, y) === 'LE') {
					this.lairEggTileValue = { x, y };
					return this.lairEggTileValue;
				}
			}
		}
		this.lairEggTileValue = null;
		return null;
	}

	neighbors(x: number, y: number): GridPoint[] {
		const candidates: GridPoint[] = [
			{ x: x - 1, y },
			{ x: x + 1, y },
			{ x, y: y - 1 },
			{ x, y: y + 1 }
		];
		return candidates.filter((point) => this.model.isInside(point.x, point.y));
	}

	walkableNeighbors(x: number, y: number): GridPoint[] {
		return this.neighbors(x, y).filter((point) => this.isWalkable(point.x, point.y));
	}

	exitsCount(x: number, y: number): number {
		return this.walkableNeighbors(x, y).length;
	}
}
