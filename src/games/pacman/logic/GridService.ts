import { isTeleportId } from './GridModel';
import type { GhostKind, GridModel, GridPoint, TileType } from './GridModel';

export class GridService {
	private readonly model: GridModel;

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

	tileAt(x: number, y: number): TileType {
		return this.model.tileAt(x, y);
	}

	isInside(x: number, y: number): boolean {
		return this.model.isInside(x, y);
	}

	isWalkable(x: number, y: number): boolean {
		return this.model.tileAt(x, y) !== 'WL';
	}

	isPlayerWalkable(x: number, y: number): boolean {
		if (!this.isInside(x, y)) {
			return false;
		}

		const tile = this.tileAt(x, y);

		return (
			tile !== 'WL' &&
			tile !== 'ES' &&
			tile !== 'LE' &&
			tile !== 'LT' &&
			tile !== 'BY' &&
			tile !== 'PY' &&
			tile !== 'IY' &&
			tile !== 'CE'
		);
	}

	isGhostWalkable(x: number, y: number, allowLair: boolean): boolean {
		if (!this.isInside(x, y)) {
			return false;
		}

		const tile = this.tileAt(x, y);

		if (tile === 'WL' || tile === 'ES' || tile === 'RT') {
			return false;
		}

		if (allowLair) {
			return true;
		}

		return (
			tile !== 'LE' &&
			tile !== 'LT' &&
			tile !== 'BY' &&
			tile !== 'PY' &&
			tile !== 'IY' &&
			tile !== 'CE'
		);
	}

	isDot(x: number, y: number): boolean {
		return this.model.tileAt(x, y) === 'DT';
	}

	isEnergizer(x: number, y: number): boolean {
		return this.model.tileAt(x, y) === 'EU';
	}

	isTeleport(x: number, y: number): boolean {
		return isTeleportId(this.model.tileAt(x, y));
	}

	teleportDestination(x: number, y: number): GridPoint | undefined {
		const tile = this.model.tileAt(x, y);

		if (!isTeleportId(tile)) {
			return undefined;
		}

		return this.model.getTeleportDestination(tile, x, y);
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
}