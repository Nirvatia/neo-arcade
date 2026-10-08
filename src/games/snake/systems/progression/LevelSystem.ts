import { SystemBase } from '../../engine/ecs/SystemBase.js';
import { GridModel } from '../../logic/grid/GridModel.js';
import {
	GameplayConfig,
	FxConfig,
	getLevelTuning,
	getBiomeForLevel,
	BIOME_PROGRESSION
} from '../../config/index.js';
import type { MovementSystem } from '../movement/MovementSystem.js';
import type { BitRegisterSystem } from '../puzzle/BitRegisterSystem.js';
import type { BitTokenSystem } from '../puzzle/BitTokenSystem.js';
import type { SpawnSystem } from '../spawn/SpawnSystem.js';
import type { ScoreSystem } from './ScoreSystem.js';
import type { InputSystem } from '../movement/InputSystem.js';
import type { FxCoordinator } from '$games/snake/render/fx/FxCoordinator.js';
import type { CanvasManager } from '$games/snake/canvas/CanvasManager.js';
import type { RenderPipeline } from '$games/snake/core/RenderPipeline.js';
import type { SeededRNG } from '$games/snake/logic/math/SeededRNG.js';
import type { GridService } from '$games/snake/logic/grid/GridService.js';
import type { EntityId } from '$games/snake/engine/ecs/types.js';
import type { World } from '$games/snake/engine/ecs/World.js';

export interface LevelDeps {
	movement: MovementSystem;
	bitRegister: BitRegisterSystem;
	bitToken: BitTokenSystem;
	spawn: SpawnSystem;
	score: ScoreSystem;
	input: InputSystem;
	fx: FxCoordinator;
	canvasManager: CanvasManager;
	renderPipeline: RenderPipeline;
}

interface BiomeTransition {
	newLevel: number;
	growthCols: number;
	growthRows: number;
	infinite: boolean;
	elapsedMS: number;
	applied: boolean;
}

/**
 * LevelSystem новой прогрессии.
 *
 * Смена биома теперь проигрывается как анимированный переход:
 * - поле расширяется только при смене биома;
 * - в момент пика перехода меняется биом и пересобирается поле;
 * - на время перехода движение и ввод замораживаются.
 */
export class LevelSystem extends SystemBase {
	public readonly name = 'LevelSystem';

	private readonly service: GridService;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;
	private readonly maxCols: number;
	private readonly maxRows: number;

	private deps: LevelDeps | null = null;
	private level = 1;
	private completedSequences = 0;
	private requiredSequences: number;
	private exitSpawned = false;
	private exitCol = -1;
	private exitRow = -1;
	private transition: BiomeTransition | null = null;

	constructor(
		world: World,
		service: GridService,
		rng: SeededRNG,
		snakeId: EntityId,
		maxCols: number,
		maxRows: number
	) {
		super(world);

		this.service = service;
		this.rng = rng;
		this.snakeId = snakeId;
		this.maxCols = maxCols;
		this.maxRows = maxRows;
		this.requiredSequences = getLevelTuning(this.level).sequencesToOpenExit;
	}

	public setDependencies(deps: LevelDeps): void {
		this.deps = deps;
	}

	public update(deltaMS: number): void {
		if (this.transition !== null) {
			this.updateTransition(deltaMS);
		}
	}

	public onSequenceCompleted(): void {
		const tuning = getLevelTuning(this.level);

		if (tuning.infinite) {
			return;
		}

		if (this.exitSpawned) {
			return;
		}

		this.completedSequences = this.completedSequences + 1;

		if (this.completedSequences >= this.requiredSequences) {
			this.spawnExit();
		}
	}

	public onExitReached(): void {
		const tuning = getLevelTuning(this.level);

		if (tuning.infinite) {
			return;
		}

		this.completeLevel();
	}

	private updateTransition(deltaMS: number): void {
		if (this.deps === null || this.transition === null) {
			return;
		}

		const transition = this.transition;
		transition.elapsedMS = transition.elapsedMS + deltaMS;

		const progress = Math.min(
			1,
			transition.elapsedMS / FxConfig.BIOME_TRANSITION_MS
		);

		this.deps.fx.setBiomeTransitionProgress(progress);

		if (!transition.applied && progress >= FxConfig.BIOME_TRANSITION_PEAK) {
			this.applyBiomeChange(transition);
			transition.applied = true;
		}

		if (progress >= 1) {
			this.finishTransition();
		}
	}

	private completeLevel(): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		const current = getBiomeForLevel(this.level);
		const progression = BIOME_PROGRESSION[current.biomeIndex];

		if (progression === undefined) {
			return;
		}

		const isLastLevelOfBiome =
			!progression.infinite && current.biomeLevel >= progression.levels;

		if (isLastLevelOfBiome) {
			this.advanceBiome();
		} else {
			this.advanceLevelWithinBiome();
		}
	}

	private advanceLevelWithinBiome(): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		this.clearExit();

		this.level = this.level + 1;
		this.completedSequences = 0;
		this.exitSpawned = false;

		const tuning = getLevelTuning(this.level);
		this.requiredSequences = tuning.sequencesToOpenExit;

		this.deps.movement.setStepInterval(tuning.stepIntervalMS);
		this.deps.bitRegister.onLevelExpanded(this.level);
		this.deps.bitToken.onLevelExpanded(this.level);
		this.deps.spawn.unsuppress();
		this.deps.renderPipeline.setLevel(this.level);
	}

	private advanceBiome(): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		const newLevel = this.level + 1;
		const newTuning = getLevelTuning(newLevel);
		const newBiome = getBiomeForLevel(newLevel);
		const progression = BIOME_PROGRESSION[newBiome.biomeIndex];

		if (progression === undefined) {
			return;
		}

		this.startBiomeTransition(
			newLevel,
			progression.gridGrowth.cols,
			progression.gridGrowth.rows,
			newTuning.infinite
		);
	}

	private startBiomeTransition(
		newLevel: number,
		growthCols: number,
		growthRows: number,
		infinite: boolean
	): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		this.transition = {
			newLevel,
			growthCols,
			growthRows,
			infinite,
			elapsedMS: 0,
			applied: false
		};

		this.deps.movement.setFrozen(true);
		this.deps.input.setFrozen(true);
		this.deps.spawn.suppress();
		this.deps.bitToken.suppress();
		this.deps.fx.beginBiomeTransition();
	}

	private applyBiomeChange(transition: BiomeTransition): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		this.expandField(
			transition.growthCols,
			transition.growthRows,
			transition.infinite
		);

		this.clearExit();

		this.level = transition.newLevel;
		this.completedSequences = 0;
		this.exitSpawned = false;

		const tuning = getLevelTuning(this.level);
		this.requiredSequences = tuning.sequencesToOpenExit;

		this.deps.movement.onLevelExpanded(this.level);
		this.deps.bitRegister.onBiomeChanged(this.level);
		this.deps.bitToken.onLevelExpanded(this.level);
		this.deps.spawn.unsuppress();
		this.deps.score.onBiomeCompleted();
		this.deps.renderPipeline.setLevel(this.level);
		this.deps.canvasManager.resizeToGrid();
		this.deps.fx.showBiomeTitle(this.level);
	}

	private finishTransition(): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		this.deps.fx.endBiomeTransition();
		this.deps.movement.setFrozen(false);
		this.deps.input.setFrozen(false);
		this.transition = null;
	}

	private expandField(growthCols: number, growthRows: number, wrap: boolean): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		const oldGrid = this.service.grid;

		let newCols = oldGrid.cols + growthCols;
		let newRows = oldGrid.rows + growthRows;

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

		const offsetCol = Math.floor((newCols - oldGrid.cols) / 2);
		const offsetRow = Math.floor((newRows - oldGrid.rows) / 2);

		const newModel = new GridModel(newCols, newRows, wrap);
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

		this.destroyAllFood();

		const tokens = this.world.query(['bitPowerUp']).entities;

		for (const tokenId of tokens) {
			this.world.destroyEntity(tokenId);
		}
	}

	private spawnExit(): void {
		if (this.deps === null) {
			throw new Error('LevelSystem: dependencies not set.');
		}

		const tuning = getLevelTuning(this.level);

		if (tuning.infinite) {
			return;
		}

		const grid = this.service.grid;

		const minCol = GameplayConfig.EXIT_MARGIN;
		const maxCol = grid.cols - GameplayConfig.EXIT_MARGIN - 1;
		const minRow = GameplayConfig.EXIT_MARGIN;
		const maxRow = grid.rows - GameplayConfig.EXIT_MARGIN - 1;

		if (maxCol < minCol || maxRow < minRow) {
			throw new Error('LevelSystem: field is too small for exit.');
		}

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

		throw new Error('LevelSystem: no free cell for exit.');
	}

	private clearFieldForExit(): void {
		this.service.model.clearAllFood();
		this.destroyAllFood();

		const tokens = this.world.query(['bitPowerUp']).entities;

		for (const tokenId of tokens) {
			this.world.destroyEntity(tokenId);
		}
	}

	private clearExit(): void {
		if (this.exitCol >= 0 && this.exitRow >= 0) {
			this.service.writer.clearExit(this.exitCol, this.exitRow);
		}

		this.exitCol = -1;
		this.exitRow = -1;
		this.exitSpawned = false;
	}

	private destroyAllFood(): void {
		const foods = this.world.query(['food']).entities;

		for (const foodId of foods) {
			this.world.destroyEntity(foodId);
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
}