export type TeleportId = '0A' | '0B' | '0C';

export type TileType =
	| 'WL'
	| 'DT'
	| 'EU'
	| 'ES'
	| 'LE'
	| 'LT'
	| 'PM'
	| 'BY'
	| 'PY'
	| 'IY'
	| 'CE'
	| 'RT'
	| 'GU'
	| 'SW'
	| 'LU'
	| TeleportId;

export type GhostKind = 'BLINKY' | 'PINKY' | 'INKY' | 'CLYDE';

export interface GridPoint {
	readonly x: number;
	readonly y: number;
}

const TELEPORT_TOKENS: ReadonlySet<string> = new Set<string>(['0A', '0B', '0C']);

const KNOWN_TOKENS: ReadonlySet<string> = new Set<string>([
	'WL',
	'DT',
	'EU',
	'ES',
	'LE',
	'LT',
	'PM',
	'BY',
	'PY',
	'IZ',
	'CE',
	'RT',
	'GU',
	'SW',
	'LU',
	'0A',
	'0B',
	'0C'
]);

export function isTeleportId(token: string): token is TeleportId {
	return TELEPORT_TOKENS.has(token);
}

function isTileToken(token: string): token is TileType {
	return KNOWN_TOKENS.has(token);
}

export class GridModel {
	readonly width: number;
	readonly height: number;
	readonly dotCount: number;
	readonly energizerCount: number;
	readonly playerSpawn: GridPoint;
	readonly ghostSpawns: Record<GhostKind, GridPoint>;
	readonly switchSpawn: GridPoint | null;
	readonly trapSpawn: GridPoint | null;
	readonly eggSpawn: GridPoint | null;
	readonly extraLifeSpawns: readonly GridPoint[];
	private readonly tiles: ReadonlyArray<ReadonlyArray<TileType>>;
	private readonly teleportPositions: ReadonlyMap<TeleportId, ReadonlyArray<GridPoint>>;

	constructor(raw: readonly string[]) {
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
		let switchSpawn: GridPoint | null = null;
		let trapSpawn: GridPoint | null = null;
		let eggSpawn: GridPoint | null = null;
		const extraLifeSpawns: GridPoint[] = [];
		const teleportPositions = new Map<TeleportId, GridPoint[]>();
		for (let y = 0; y < raw.length; y += 1) {
			const row = raw[y];
			if (typeof row !== 'string') {
				console.error('GridModel.constructor', 'invalid row type', { y });
				throw new Error('GridModel.constructor: invalid row type');
			}
			const trimmed = row.trim();
			if (trimmed.length === 0) {
				console.error('GridModel.constructor', 'empty row', { y });
				throw new Error('GridModel.constructor: empty row');
			}
			const tokens = trimmed.split(/\s+/);
			if (width === 0) {
				width = tokens.length;
			} else if (tokens.length !== width) {
				console.error('GridModel.constructor', 'row width mismatch', {
					y,
					expected: width,
					actual: tokens.length
				});
				throw new Error('GridModel.constructor: row width mismatch');
			}
			const tileRow: TileType[] = [];
			for (let x = 0; x < tokens.length; x += 1) {
				const token = tokens[x];
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
				if (token === 'SW') {
					if (switchSpawn) {
						console.error('GridModel.constructor', 'duplicate lair switch', { x, y });
						throw new Error('GridModel.constructor: duplicate lair switch');
					}
					switchSpawn = { x, y };
				}
				if (token === 'RT') {
					if (trapSpawn) {
						console.error('GridModel.constructor', 'duplicate rune trap', { x, y });
						throw new Error('GridModel.constructor: duplicate rune trap');
					}
					trapSpawn = { x, y };
				}
				if (token === 'GU') {
					if (eggSpawn) {
						console.error('GridModel.constructor', 'duplicate golden egg', { x, y });
						throw new Error('GridModel.constructor: duplicate golden egg');
					}
					eggSpawn = { x, y };
				}
				if (token === 'LU') {
					extraLifeSpawns.push({ x, y });
				}
				if (isTeleportId(token)) {
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
		this.switchSpawn = switchSpawn;
		this.trapSpawn = trapSpawn;
		this.eggSpawn = eggSpawn;
		this.extraLifeSpawns = extraLifeSpawns;
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

	getTeleportDestination(id: TeleportId, x: number, y: number): GridPoint | undefined {
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