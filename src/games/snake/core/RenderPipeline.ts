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
	targetVersion: number;
	activeVersion: number;
	targetKey: string;
	activeKey: string;
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
	private lastTargetVersion = -1;
	private lastCollectorVersion = -1;
	
	private readonly sequenceState: SequenceState = {
		targetBits: [],
		activeBits: [],
		movesLeft: 0,
		streak: 0,
		targetVersion: -1,
		activeVersion: -1,
		targetKey: '',
		activeKey: ''
	};
	
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
		
		this.readSequenceState();
		const score = this.getScore();
		const tuning = getLevelTuning(this.level);
		
		this.worldRenderer.update(deltaMS, this.sequenceState.targetBits.length);
		this.fx.update(deltaMS);
		this.overlay.setScore(score);
		this.overlay.setProgress(this.level, tuning.biomeIndex, tuning.infinite);
		
		this.surface.clear();
		const ctx = this.surface.ctx;
		ctx.save();
		const shake = this.fx.getShakeOffset();
		ctx.translate(shake.x, shake.y);
		this.worldRenderer.draw(ctx);
		this.fx.draw(ctx, width, height);
		ctx.restore();
		
		const comboMultiplier = Math.min(
			Math.max(1, this.sequenceState.streak),
			GameplayConfig.COMBO_MAX_MULTIPLIER
		);
		
		this.hud.update({
			biomeIndex: tuning.biomeIndex,
			biomeLevel: tuning.biomeLevel,
			infinite: tuning.infinite,
			score,
			movesLeft: this.sequenceState.movesLeft,
			targetBits: this.sequenceState.targetBits,
			activeBits: this.sequenceState.activeBits,
			targetKey: this.sequenceState.targetKey,
			activeKey: this.sequenceState.activeKey,
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

	private readSequenceState(): void {
		const targets = this.world.query(['targetSequence']).entities;
		const targetEntity = targets[0];
		if (targetEntity !== undefined) {
			const target = this.world.getComponent(targetEntity, 'targetSequence');
			if (target !== undefined && target.version !== this.lastTargetVersion) {
				this.lastTargetVersion = target.version;
				this.sequenceState.targetVersion = target.version;
				this.sequenceState.movesLeft = target.movesLeft;
				this.sequenceState.streak = target.streak;
				this.sequenceState.targetBits = target.bits.slice(0, target.requiredBits);
				this.sequenceState.targetKey = this.sequenceState.targetBits.join('');
			}
		}
		
		const collectors = this.world.query(['bitCollector']).entities;
		const collectorEntity = collectors[0];
		if (collectorEntity !== undefined) {
			const collector = this.world.getComponent(collectorEntity, 'bitCollector');
			if (collector !== undefined && collector.version !== this.lastCollectorVersion) {
				this.lastCollectorVersion = collector.version;
				this.sequenceState.activeVersion = collector.version;
				this.sequenceState.activeBits = collector.collected.slice(0, collector.count);
				this.sequenceState.activeKey = this.sequenceState.activeBits.join('');
			}
		}
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