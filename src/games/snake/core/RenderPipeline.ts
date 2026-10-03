import type { World } from './ecs/World.js';
import type { EntityId } from './ecs/types.js';
import type { GridService } from '../logic/grid/GridService.js';
import type { DirectorStateType } from './Events.js';
import { WorldRenderer } from '../view/world/WorldRenderer.js';
import { OverlayRenderer } from '../view/overlay/OverlayRenderer.js';
import { FxCoordinator } from '../view/fx/FxCoordinator.js';
import type { HudAdapter } from '../view/hud/HudAdapter.js';
import { GameplayConfig } from '../config/index.js';
import { Container, Graphics } from 'pixi.js';
import type { BiomeManager } from '../biomes/index.js';

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
	private readonly stage: Container;
	private readonly cellSize: number;
	private readonly biomeManager: BiomeManager;
	private readonly hud: HudAdapter;

	private readonly shakeLayer: Container;
	private readonly overlay: Graphics;
	private readonly overlayLayer: Container;

	private readonly worldRenderer: WorldRenderer;
	private readonly overlayRenderer: OverlayRenderer;

	private level = 1;
	private time = 0;
	private finalMode = false;
	private cachedWidth = -1;

	private stateChangedHandler:
		((payload: { previous: DirectorStateType; current: DirectorStateType }) => void) | null = null;

	constructor(
		world: World,
		service: GridService,
		snakeId: EntityId,
		stage: Container,
		cellSize: number,
		biomeManager: BiomeManager,
		hud: HudAdapter
	) {
		this.world = world;
		this.service = service;
		this.snakeId = snakeId;
		this.stage = stage;
		this.cellSize = cellSize;
		this.biomeManager = biomeManager;
		this.hud = hud;

		this.shakeLayer = new Container();
		this.overlay = new Graphics();
		this.overlayLayer = new Container();

		this.worldRenderer = new WorldRenderer(
			this.shakeLayer,
			world,
			service,
			snakeId,
			cellSize,
			biomeManager
		);

		this.fx = new FxCoordinator(this.shakeLayer, world, snakeId, service, cellSize, biomeManager);

		this.overlayRenderer = new OverlayRenderer(this.overlay, this.overlayLayer, biomeManager);

		this.fx.onHudShake = () => {
			// Пока тряска DOM-HUD не нужна.
			// Если позже понадобится — можно пробросить отдельный UI-колбэк.
		};

		this.stage.addChild(this.shakeLayer);
		this.stage.addChild(this.overlay);
		this.stage.addChild(this.overlayLayer);

		this.stateChangedHandler = (payload) => {
			this.overlayRenderer.setState(payload.current);
		};

		this.world.events.on('director:stateChanged', this.stateChangedHandler);
	}

	public setLevel(level: number): void {
		this.level = level;
		this.worldRenderer.setLevel(level);
	}

	public setFinalMode(finalMode: boolean): void {
		this.finalMode = finalMode;
	}

	public forceRender(): void {
		this.update(0);
	}

	public setNewRecord(isNew: boolean): void {
		this.overlayRenderer.setNewRecord(isNew);
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

		this.worldRenderer.update(deltaMS, sequenceState.targetBits.length);
		this.fx.update(deltaMS);
		this.fx.drawFx();

		this.overlayRenderer.setScore(score);
		this.overlayRenderer.update(deltaMS, width, height, this.cellSize);

		const comboMultiplier = Math.min(
			Math.max(1, sequenceState.streak),
			GameplayConfig.COMBO_MAX_MULTIPLIER
		);

		this.hud.update({
			level: this.level,
			score,
			movesLeft: sequenceState.movesLeft,
			targetBits: sequenceState.targetBits,
			activeBits: sequenceState.activeBits,
			comboMultiplier,
			finalMode: this.finalMode
		});
	}

	public dispose(): void {
		if (this.stateChangedHandler !== null) {
			this.world.events.off('director:stateChanged', this.stateChangedHandler);
			this.stateChangedHandler = null;
		}

		this.worldRenderer.dispose();
		this.fx.dispose();
		this.overlayRenderer.dispose();
		this.hud.destroy();

		this.stage.removeChild(this.shakeLayer);
		this.stage.removeChild(this.overlay);
		this.stage.removeChild(this.overlayLayer);

		this.shakeLayer.destroy({ children: true });
		this.overlay.destroy();
		this.overlayLayer.destroy({ children: true });
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
