import type { GridMatrix, TeleportType, TileType } from '../config/gridConfig';
import { isTeleportToken, isTileToken } from '../config/gridConfig';

export type { GridMatrix, TeleportType, TileType };

export type GhostKind = 'BLINKY' | 'PINKY' | 'INKY' | 'CLYDE';

export interface GridPoint {
	readonly x: number;
	readonly y: number;
}

export class GridModel {
	readonly width: number;
	readonly height: number;
	readonly dotCount: number;
	readonly energizerCount: number;
	readonly playerSpawn: GridPoint;
	readonly ghostSpawns: Record<GhostKind, GridPoint>;
	private readonly tiles: ReadonlyArray<ReadonlyArray<TileType>>;
	private readonly teleportPositions: ReadonlyMap<TeleportType, ReadonlyArray<GridPoint>>;

	constructor(raw: GridMatrix) {
		if (!Array.isArray(raw) || raw.length === 0) {
			console.error('GridModel.constructor', 'level map is empty');
			throw new Error('GridModel.constructor: level map is empty');
		}
		const rows: TileType[][] = [];
		let width = 0;
		let dotCount = 0;
		let energizerCount = 0;
		let playerSpawn: GridPoint | null = null;
		const ghostSpawns: { [K in GhostKind]: GridPoint | null } = {
			BLINKY: null,
			PINKY: null,
			INKY: null,
			CLYDE: null
		};
		const teleportPositions = new Map<TeleportType, GridPoint[]>();
		for (let y = 0; y < raw.length; y += 1) {
			const row = raw[y];
			if (!Array.isArray(row) || row.length === 0) {
				console.error('GridModel.constructor', 'invalid row', { y });
				throw new Error('GridModel.constructor: invalid row');
			}
			if (width === 0) {
				width = row.length;
			} else if (row.length !== width) {
				console.error('GridModel.constructor', 'row width mismatch', {
					y,
					expected: width,
					actual: row.length
				});
				throw new Error('GridModel.constructor: row width mismatch');
			}
			const tileRow: TileType[] = [];
			for (let x = 0; x < row.length; x += 1) {
				const token = row[x];
				if (typeof token !== 'string' || !isTileToken(token)) {
					console.error('GridModel.constructor', 'unknown tile token', { x, y, token });
					throw new Error('GridModel.constructor: unknown tile token');
				}
				if (token === 'DT') {
					dotCount += 1;
				}
				if (token === 'EU') {
					energizerCount += 1;
				}
				if (token === 'PM') {
					if (playerSpawn) {
						console.error('GridModel.constructor', 'duplicate player spawn', { x, y });
						throw new Error('GridModel.constructor: duplicate player spawn');
					}
					playerSpawn = { x, y };
				}
				if (token === 'BY') {
					if (ghostSpawns.BLINKY) {
						console.error('GridModel.constructor', 'duplicate ghost spawn', { token, x, y });
						throw new Error('GridModel.constructor: duplicate ghost spawn');
					}
					ghostSpawns.BLINKY = { x, y };
				}
				if (token === 'PY') {
					if (ghostSpawns.PINKY) {
						console.error('GridModel.constructor', 'duplicate ghost spawn', { token, x, y });
						throw new Error('GridModel.constructor: duplicate ghost spawn');
					}
					ghostSpawns.PINKY = { x, y };
				}
				if (token === 'IY') {
					if (ghostSpawns.INKY) {
						console.error('GridModel.constructor', 'duplicate ghost spawn', { token, x, y });
						throw new Error('GridModel.constructor: duplicate ghost spawn');
					}
					ghostSpawns.INKY = { x, y };
				}
				if (token === 'CE') {
					if (ghostSpawns.CLYDE) {
						console.error('GridModel.constructor', 'duplicate ghost spawn', { token, x, y });
						throw new Error('GridModel.constructor: duplicate ghost spawn');
					}
					ghostSpawns.CLYDE = { x, y };
				}
				if (isTeleportToken(token)) {
					let positions = teleportPositions.get(token);
					if (!positions) {
						positions = [];
						teleportPositions.set(token, positions);
					}
					positions.push({ x, y });
				}
				tileRow.push(token);
			}
			rows.push(tileRow);
		}
		if (width <= 0 || rows.length <= 0) {
			console.error('GridModel.constructor', 'invalid grid size', {
				width,
				height: rows.length
			});
			throw new Error('GridModel.constructor: invalid grid size');
		}
		if (!playerSpawn) {
			console.error('GridModel.constructor', 'missing player spawn');
			throw new Error('GridModel.constructor: missing player spawn');
		}
		const blinkySpawn = ghostSpawns.BLINKY;
		const pinkySpawn = ghostSpawns.PINKY;
		const inkySpawn = ghostSpawns.INKY;
		const clydeSpawn = ghostSpawns.CLYDE;
		if (!blinkySpawn || !pinkySpawn || !inkySpawn || !clydeSpawn) {
			console.error('GridModel.constructor', 'missing ghost spawns');
			throw new Error('GridModel.constructor: missing ghost spawns');
		}
		for (const [id, positions] of teleportPositions) {
			if (positions.length !== 2) {
				console.error('GridModel.constructor', 'invalid teleport pair', {
					id,
					count: positions.length
				});
				throw new Error('GridModel.constructor: invalid teleport pair');
			}
		}
		this.width = width;
		this.height = rows.length;
		this.dotCount = dotCount;
		this.energizerCount = energizerCount;
		this.playerSpawn = playerSpawn;
		this.ghostSpawns = {
			BLINKY: blinkySpawn,
			PINKY: pinkySpawn,
			INKY: inkySpawn,
			CLYDE: clydeSpawn
		};
		this.tiles = rows;
		this.teleportPositions = teleportPositions;
	}

	isInside(x: number, y: number): boolean {
		return (
			Number.isInteger(x) &&
			Number.isInteger(y) &&
			x >= 0 &&
			y >= 0 &&
			x < this.width &&
			y < this.height
		);
	}

	tileAt(x: number, y: number): TileType {
		if (!this.isInside(x, y)) {
			return 'ES';
		}
		const row = this.tiles[y];
		if (!row) {
			console.error('GridModel.tileAt', 'missing row', { x, y });
			return 'ES';
		}
		const tile = row[x];
		if (!tile) {
			console.error('GridModel.tileAt', 'missing tile', { x, y });
			return 'ES';
		}
		return tile;
	}

	getTeleportDestination(id: TeleportType, x: number, y: number): GridPoint | undefined {
		const positions = this.teleportPositions.get(id);
		if (!positions) {
			return undefined;
		}
		const first = positions[0];
		const second = positions[1];
		if (!first || !second) {
			console.error('GridModel.getTeleportDestination', 'invalid teleport pair', { id, x, y });
			return undefined;
		}
		if (first.x === x && first.y === y) {
			return second;
		}
		if (second.x === x && second.y === y) {
			return first;
		}
		return undefined;
	}
}