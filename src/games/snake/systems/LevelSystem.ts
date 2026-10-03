import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridService } from '../logic/grid/GridService.js';
import { GridModel } from '../logic/grid/GridModel.js';
import type { SeededRNG } from '../logic/SeededRNG.js';
import type { MovementSystem } from './MovementSystem.js';
import type { BitRegisterSystem } from './BitRegisterSystem.js';
import type { BitTokenSystem } from './BitTokenSystem.js';
import type { SpawnSystem } from './SpawnSystem.js';
import type { FxCoordinator } from '../view/fx/FxCoordinator.js';
import type { CanvasManager } from '../core/CanvasManager.js';
import type { RenderPipeline } from '../core/RenderPipeline.js';
import { GameplayConfig, getLevelTuning } from '../config/index.js';

export interface LevelDeps {
	movement: MovementSystem;
	bitRegister: BitRegisterSystem;
	bitToken: BitTokenSystem;
	spawn: SpawnSystem;
	fx: FxCoordinator;
	canvasManager: CanvasManager;
	renderPipeline: RenderPipeline;
}

export class LevelSystem extends SystemBase {
	public readonly name = 'LevelSystem';

	private readonly service: GridService;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;

	private readonly growthCols: number;
	private readonly growthRows: number;
	private readonly maxCols: number;
	private readonly maxRows: number;

	private deps: LevelDeps | null = null;

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
		service: GridService,
		rng: SeededRNG,
		snakeId: EntityId,
		growthCols: number,
		growthRows: number,
		maxCols: number,
		maxRows: number
	) {
		super(world);

		this.service = service;
		this.rng = rng;
		this.snakeId = snakeId;
		this.growthCols = growthCols;
		this.growthRows = growthRows;
		this.maxCols = maxCols;
		this.maxRows = maxRows;
		this.requiredSequences = getLevelTuning(this.level).sequencesToOpenExit;
	}

	public setDependencies(deps: LevelDeps): void {
		this.deps = deps;
	}

	public update(_deltaMS: number): void {
		// Логика уровня работает через прямые вызовы.
	}

	public onSequenceCompleted(): void {
		if (this.finalActive || this.exitSpawned) {
			return;
		}

		this.completedSequences = this.completedSequences + 1;

		if (this.completedSequences >= this.requiredSequences) {
			this.spawnExit();
		}
	}

	public onExitReached(): void {
		this.expand();
	}

	public onEndlessStarted(): void {
		this.endless = true;
		this.finalActive = false;
		this.completedSequences = 0;
		this.exitSpawned = false;
	}

	private spawnExit(): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		const grid = this.service.grid;

		const minCol = GameplayConfig.EXIT_MARGIN;
		const maxCol = grid.cols - GameplayConfig.EXIT_MARGIN - 1;
		const minRow = GameplayConfig.EXIT_MARGIN;
		const maxRow = grid.rows - GameplayConfig.EXIT_MARGIN - 1;

		for (let attempt = 0; attempt < GameplayConfig.MAX_EXIT_SPAWN_ATTEMPTS; attempt++) {
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

			this.service.writer.setExit(col, row);

			this.exitCol = col;
			this.exitRow = row;
			this.exitSpawned = true;

			this.clearFieldForExit();

			this.deps.spawn.suppress();
			this.deps.bitToken.suppress();
			this.deps.fx.onExitOpened();

			return;
		}

		throw new Error('LevelSystem: no free cell for exit');
	}

	private clearFieldForExit(): void {
		this.service.model.clearAllFood();
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
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		const oldGrid = this.service.grid;
		const atMaxSize = oldGrid.cols >= this.maxCols && oldGrid.rows >= this.maxRows;

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

		const newModel = new GridModel(newCols, newRows);

		const offsetCol = Math.floor((newCols - oldGrid.cols) / 2);
		const offsetRow = Math.floor((newRows - oldGrid.rows) / 2);

		this.service.replaceModel(newModel);
		this.service.writer.buildPerimeter();

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

			this.service.writer.setOccupied(position.col, position.row);
		}

		const tokens = this.world.query(['bitPowerUp']).entities;

		for (const tokenId of tokens) {
			this.world.destroyEntity(tokenId);
		}

		this.destroyAllFood();

		this.exitSpawned = false;
		this.exitCol = -1;
		this.exitRow = -1;
		this.completedSequences = 0;

		this.level = this.level + 1;
		this.requiredSequences = getLevelTuning(this.level).sequencesToOpenExit;

		this.deps.movement.onLevelExpanded(this.level);
		this.deps.bitRegister.onLevelExpanded(this.level);
		this.deps.bitToken.onLevelExpanded(this.level);
		this.deps.spawn.unsuppress();
		this.deps.renderPipeline.setLevel(this.level);
		this.deps.fx.onLevelExpanded(this.level);
		this.deps.canvasManager.resizeToGrid();
	}

	private startFinal(): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		this.finalActive = true;
		this.exitSpawned = false;
		this.completedSequences = 0;

		if (this.exitCol >= 0 && this.exitRow >= 0) {
			this.service.writer.clearExit(this.exitCol, this.exitRow);
			this.exitCol = -1;
			this.exitRow = -1;
		}

		this.deps.bitRegister.onFinalStarted();
		this.deps.bitToken.suppress();
		this.deps.spawn.unsuppress();
		this.deps.renderPipeline.setFinalMode(true);
	}

	private continueEndless(): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		if (this.exitCol >= 0 && this.exitRow >= 0) {
			this.service.writer.clearExit(this.exitCol, this.exitRow);
			this.exitCol = -1;
			this.exitRow = -1;
		}

		this.exitSpawned = false;
		this.completedSequences = 0;
		this.level = this.level + 1;

		this.deps.movement.onLevelExpanded(this.level);
		this.deps.bitRegister.onLevelExpanded(this.level);
		this.deps.bitToken.onLevelExpanded(this.level);
		this.deps.spawn.unsuppress();
		this.deps.renderPipeline.setLevel(this.level);
		this.deps.canvasManager.resizeToGrid();
	}
}
