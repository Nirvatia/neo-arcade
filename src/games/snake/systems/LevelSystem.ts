import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridHolder } from '../logic/GridHolder.js';
import { GridBitmask } from '../logic/GridBitmask.js';
import type { SeededRNG } from '../logic/SeededRNG.js';
import { GameplayConfig, getLevelTuning } from '../config/index.js';

const MAX_EXIT_SPAWN_ATTEMPTS = 200;
// Выход не спавнится вплотную к периметру.
const EXIT_MARGIN = 2;

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
	private exitCol = -1;
	private exitRow = -1;
	private finalActive = false;
	private endless = false;

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
		this.world.events.on('game:endless', this.onEndlessStarted);
	}

	private get grid(): GridBitmask {
		return this.holder.grid;
	}

	public update(_deltaMS: number): void {
		// Логика уровня работает через события.
	}

	private onSequenceCompleted = (): void => {
		if (this.finalActive || this.exitSpawned) {
			return;
		}
		this.completedSequences = this.completedSequences + 1;
		if (this.completedSequences >= this.requiredSequences) {
			this.spawnExit();
		}
	};

	private onExitReached = (): void => {
		this.world.events.emit('exit:entered', { entity: this.snakeId });
		this.expand();
	};

	private onEndlessStarted = (): void => {
		this.endless = true;
		this.finalActive = false;
		this.completedSequences = 0;
		this.exitSpawned = false;
	};

	private spawnExit(): void {
		const grid = this.grid;
		const minCol = EXIT_MARGIN;
		const maxCol = grid.cols - EXIT_MARGIN - 1;
		const minRow = EXIT_MARGIN;
		const maxRow = grid.rows - EXIT_MARGIN - 1;
		for (let attempt = 0; attempt < MAX_EXIT_SPAWN_ATTEMPTS; attempt++) {
			const col = minCol + this.rng.nextInt(maxCol - minCol + 1);
			const row = minRow + this.rng.nextInt(maxRow - minRow + 1);
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
			this.exitCol = col;
			this.exitRow = row;
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
// Сначала чистим сами, затем событие глушит повторный спавн
// в SpawnSystem и BitTokenSystem.
private clearFieldForExit(): void {
	this.grid.clearAllFood();

	// Обязательно уничтожаем сами сущности еды.
	// Иначе сетка очищена, а старые еды остаются жить,
	// и после выхода/финала/эндлесса SpawnSystem спавнит новую пачку.
	this.destroyAllFood();

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

	private destroyAllFood(): void {
	const foods = this.world.query(['food']).entities;
	for (const foodId of foods) {
		this.world.destroyEntity(foodId);
	}
}

private expand(): void {
	const oldGrid = this.holder.grid;
	const atMaxSize = oldGrid.cols >= this.maxCols && oldGrid.rows >= this.maxRows;

	// Расширяться некуда: либо финал, либо цикл эндлесса.
	if (atMaxSize) {
		if (this.endless) {
			this.continueEndless();
		} else {
			this.startFinal();
		}
		return;
	}

	let newCols = oldGrid.cols + this.growthCols;
	let newRows = oldGrid.rows + this.growthRows;

	if (newCols > this.maxCols) {
		newCols = this.maxCols;
	}

	if (newRows > this.maxRows) {
		newRows = this.maxRows;
	}

	const newGrid = new GridBitmask(newCols, newRows);
	newGrid.buildPerimeter();

	const offsetCol = Math.floor((newCols - oldGrid.cols) / 2);
	const offsetRow = Math.floor((newRows - oldGrid.rows) / 2);

	// Сначала подменяем поле, чтобы все дальнейшие записи шли в новую маску.
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

	// Старые токены в новом секторе не нужны.
	const tokens = this.world.query(['bitPowerUp']).entities;
	for (const tokenId of tokens) {
		this.world.destroyEntity(tokenId);
	}

	// Старая еда тоже не должна переезжать в новый сектор.
	// Сетка уже новая и пустая, поэтому удаляем сами сущности.
	this.destroyAllFood();

	this.exitSpawned = false;
	this.exitCol = -1;
	this.exitRow = -1;
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

	// Поле упёрлось в максимум: запускаем финальную последовательность.
	private startFinal(): void {
		this.finalActive = true;
		this.exitSpawned = false;
		this.completedSequences = 0;
		// Выход убираем, чтобы в финале его нельзя было войти повторно.
		if (this.exitCol >= 0 && this.exitRow >= 0) {
			this.grid.clearExit(this.exitCol, this.exitRow);
			this.exitCol = -1;
			this.exitRow = -1;
		}
		this.world.events.emit('final:started', {});
	}

	// Эндлесс: поле уже максимальное, просто открываем следующий цикл.
	private continueEndless(): void {
		if (this.exitCol >= 0 && this.exitRow >= 0) {
			this.grid.clearExit(this.exitCol, this.exitRow);
			this.exitCol = -1;
			this.exitRow = -1;
		}
		this.exitSpawned = false;
		this.completedSequences = 0;
		this.level = this.level + 1;
		this.world.events.emit('level:expanded', {
			level: this.level
		});
	}
}