import type { World } from '../engine/ecs/World.js';
import type { EntityId } from '../engine/ecs/types.js';
import type { GridService } from '../logic/grid/GridService.js';
import type { DirectorStateType } from './Events.js';
import { WorldRenderer } from '../render/world/WorldRenderer.js';
import { GameplayConfig, getLevelTuning } from '../config/index.js';
import type { BiomeManager } from '../biomes/index.js';
import type { OverlayAdapter } from '../ui/overlay/SvelteOverlayAdapter.js';
import type { CanvasSurface } from '../canvas/CanvasSurface.js';
import type { HudAdapter } from '../ui/hud/HudAdapter.js';
import { FxCoordinator } from '../render/fx/FxCoordinator.js';

interface SequenceState {
	targetBits: (0 | 1)[];
	activeBits: (0 | 1)[];
	movesLeft: number;
	streak: number;
}

export class RenderPipeline {
	public readonly fx: FxCoordinator;

	private readonly world: World;
	private readonly service: GridService;
	private readonly snakeId: EntityId;
	private readonly surface: CanvasSurface;
	private readonly cellSize: number;
	private readonly biomeManager: BiomeManager;
	private readonly hud: HudAdapter;
	private readonly worldRenderer: WorldRenderer;
	private readonly overlay: OverlayAdapter;

	private level = 1;
	private time = 0;
	private cachedWidth = -1;

	private stateChangedHandler:
		| ((payload: { previous: DirectorStateType; current: DirectorStateType }) => void)
		| null = null;

	constructor(
		world: World,
		service: GridService,
		snakeId: EntityId,
		surface: CanvasSurface,
		cellSize: number,
		biomeManager: BiomeManager,
		hud: HudAdapter,
		overlay: OverlayAdapter
	) {
		this.world = world;
		this.service = service;
		this.snakeId = snakeId;
		this.surface = surface;
		this.cellSize = cellSize;
		this.biomeManager = biomeManager;
		this.hud = hud;
		this.worldRenderer = new WorldRenderer(world, service, snakeId, cellSize, biomeManager);
		this.fx = new FxCoordinator(world, snakeId, service, cellSize, biomeManager);
		this.overlay = overlay;

		this.stateChangedHandler = (payload): void => {
			this.overlay.setState(payload.current);
		};

		this.world.events.on('director:stateChanged', this.stateChangedHandler);
	}

	public setLevel(level: number): void {
		this.level = level;
		this.worldRenderer.setLevel(level);
	}

	public setNewRecord(isNew: boolean): void {
		this.overlay.setNewRecord(isNew);
	}

	public forceRender(): void {
		this.update(0);
	}

	public update(deltaMS: number): void {
		this.time = this.time + deltaMS;

		const grid = this.service.grid;
		const width = grid.cols * this.cellSize;
		const height = grid.rows * this.cellSize;

		if (this.cachedWidth !== width) {
			this.hud.setWidth(width);
			this.cachedWidth = width;
		}

		const sequenceState = this.readSequenceState();
		const score = this.getScore();
		const tuning = getLevelTuning(this.level);

		this.worldRenderer.update(deltaMS, sequenceState.targetBits.length);
		this.fx.update(deltaMS);

		this.overlay.setScore(score);
		this.overlay.setProgress(this.level, tuning.biomeIndex, tuning.infinite);

		// ===== Отрисовка =====

		this.surface.clear();

		const ctx = this.surface.ctx;
		ctx.save();

		const shake = this.fx.getShakeOffset();
		ctx.translate(shake.x, shake.y);

		this.worldRenderer.draw(ctx);
		this.fx.draw(ctx, width, height);

		ctx.restore();

		const comboMultiplier = Math.min(
			Math.max(1, sequenceState.streak),
			GameplayConfig.COMBO_MAX_MULTIPLIER
		);

		this.hud.update({
			biomeIndex: tuning.biomeIndex,
			biomeLevel: tuning.biomeLevel,
			infinite: tuning.infinite,
			score,
			movesLeft: sequenceState.movesLeft,
			targetBits: sequenceState.targetBits,
			activeBits: sequenceState.activeBits,
			comboMultiplier
		});
	}

	public dispose(): void {
		if (this.stateChangedHandler !== null) {
			this.world.events.off('director:stateChanged', this.stateChangedHandler);
			this.stateChangedHandler = null;
		}

		this.worldRenderer.dispose();
		this.fx.dispose();
		this.overlay.destroy();
		this.hud.destroy();
	}

	private readSequenceState(): SequenceState {
		let targetBits: (0 | 1)[] = [];
		let activeBits: (0 | 1)[] = [];
		let movesLeft = 0;
		let streak = 0;

		const targets = this.world.query(['targetSequence']).entities;
		const targetEntity = targets[0];

		if (targetEntity !== undefined) {
			const target = this.world.getComponent(targetEntity, 'targetSequence');

			if (target !== undefined) {
				targetBits = target.bits.slice();
				movesLeft = target.movesLeft;
				streak = target.streak;
			}
		}

		const collectors = this.world.query(['bitCollector']).entities;

		for (const entity of collectors) {
			const collector = this.world.getComponent(entity, 'bitCollector');

			if (collector !== undefined && collector.snakeId === this.snakeId) {
				activeBits = collector.collected.slice();
			}
		}

		return { targetBits, activeBits, movesLeft, streak };
	}

	private getScore(): number {
		const scoreEntities = this.world.query(['score']).entities;
		const scoreEntity = scoreEntities[0];

		if (scoreEntity === undefined) {
			return 0;
		}

		const score = this.world.getComponent(scoreEntity, 'score');

		return score === undefined ? 0 : score.value;
	}
}