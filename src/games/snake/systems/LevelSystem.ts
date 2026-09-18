import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridHolder } from '../logic/GridHolder.js';
import { GridBitmask } from '../logic/GridBitmask.js';
import type { SeededRNG } from '../logic/SeededRNG.js';
import { GameplayConfig, getLevelTuning } from '../config/index.js';

const MAX_EXIT_SPAWN_ATTEMPTS = 200;

export class LevelSystem extends SystemBase {
	public readonly name = 'LevelSystem';
	private readonly holder: GridHolder;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;
	private readonly growthCols: number;
	private readonly growthRows: number;
	private readonly maxCols: number;
	private readonly maxRows: number;
	private level = 1;
	private completedSequences = 0;
	private requiredSequences: number;
	private exitSpawned = false;

	constructor(
		world: World,
		holder: GridHolder,
		rng: SeededRNG,
		snakeId: EntityId,
		growthCols: number,
		growthRows: number,
		maxCols: number,
		maxRows: number
	) {
		super(world);
		this.holder = holder;
		this.rng = rng;
		this.snakeId = snakeId;
		this.growthCols = growthCols;
		this.growthRows = growthRows;
		this.maxCols = maxCols;
		this.maxRows = maxRows;
		this.requiredSequences = getLevelTuning(this.level).sequencesToOpenExit;
		this.world.events.on('sequence:completed', this.onSequenceCompleted);
		this.world.events.on('collision:exit', this.onExitReached);
	}

	private get grid(): GridBitmask {
		return this.holder.grid;
	}

	public update(_deltaMS: number): void {
		// Логика уровня работает через события.
	}

	private onSequenceCompleted = (): void => {
		this.completedSequences = this.completedSequences + 1;
		if (!this.exitSpawned && this.completedSequences >= this.requiredSequences) {
			this.spawnExit();
		}
	};

	private onExitReached = (): void => {
		this.world.events.emit('exit:entered', { entity: this.snakeId });
		this.expand();
	};

	private spawnExit(): void {
		const grid = this.grid;
		for (let attempt = 0; attempt < MAX_EXIT_SPAWN_ATTEMPTS; attempt++) {
			const col = this.rng.nextInt(grid.cols);
			const row = this.rng.nextInt(grid.rows);
			if (!grid.withinBounds(col, row)) {
				continue;
			}
			if (grid.isWall(col, row)) {
				continue;
			}
			if (grid.isOccupied(col, row)) {
				continue;
			}
			if (grid.isFood(col, row)) {
				continue;
			}
			if (grid.isExit(col, row)) {
				continue;
			}
			if (this.isTokenAt(col, row)) {
				continue;
			}
			grid.setExit(col, row);
			this.exitSpawned = true;
			this.clearFieldForExit();
			this.world.events.emit('score:add', {
				points: GameplayConfig.POINTS_EXIT_OPENED
			});
			this.world.events.emit('exit:opened', {
				entity: this.snakeId
			});
			return;
		}
		throw new Error('LevelSystem: no free cell for exit');
	}

	// Фаза выхода: на поле остаются только змейка и выход.
	// Сначала чистим сами, затем событие глушит повторный спавн в SpawnSystem/BitTokenSystem.
	private clearFieldForExit(): void {
		this.grid.clearAllFood();
		const tokens = this.world.query(['bitPowerUp']).entities;
		for (const tokenId of tokens) {
			this.world.destroyEntity(tokenId);
		}
	}

	private isTokenAt(col: number, row: number): boolean {
		const tokens = this.world.query(['bitPowerUp', 'gridPosition']).entities;
		for (const tokenId of tokens) {
			const tokenPos = this.world.getComponent(tokenId, 'gridPosition');
			if (tokenPos === undefined) {
				continue;
			}
			if (tokenPos.col === col && tokenPos.row === row) {
				return true;
			}
		}
		return false;
	}

	private expand(): void {
		const oldGrid = this.holder.grid;
		let newCols = oldGrid.cols + this.growthCols;
		let newRows = oldGrid.rows + this.growthRows;
		if (newCols > this.maxCols) {
			newCols = this.maxCols;
		}
		if (newRows > this.maxRows) {
			newRows = this.maxRows;
		}
		if (newCols < oldGrid.cols) {
			newCols = oldGrid.cols;
		}
		if (newRows < oldGrid.rows) {
			newRows = oldGrid.rows;
		}

		const newGrid = new GridBitmask(newCols, newRows);
		newGrid.buildPerimeter();

		const offsetCol = Math.floor((newCols - oldGrid.cols) / 2);
		const offsetRow = Math.floor((newRows - oldGrid.rows) / 2);

		// Сначала подменяем поле, чтобы все дальнейшие записи шли уже в новую маску.
		this.holder.grid = newGrid;

		// Переносим змейку по офсету.
		const segments = this.world.query(['snakeSegment', 'gridPosition']).entities;
		for (const entity of segments) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			const position = this.world.getComponent(entity, 'gridPosition');
			if (segment === undefined || position === undefined) {
				continue;
			}
			if (segment.snakeId !== this.snakeId) {
				continue;
			}
			position.col = position.col + offsetCol;
			position.row = position.row + offsetRow;
			newGrid.setOccupied(position.col, position.row);
		}

		// Старые токены на новом уровне не нужны.
		const tokens = this.world.query(['bitPowerUp']).entities;
		for (const tokenId of tokens) {
			this.world.destroyEntity(tokenId);
		}

		this.exitSpawned = false;
		this.completedSequences = 0;
		this.level = this.level + 1;
		this.requiredSequences = getLevelTuning(this.level).sequencesToOpenExit;

		this.world.events.emit('score:add', {
			points: GameplayConfig.POINTS_LEVEL_ENTERED
		});
		this.world.events.emit('level:expanded', {
			level: this.level
		});
	}
}