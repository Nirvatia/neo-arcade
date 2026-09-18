import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridHolder } from '../logic/GridHolder.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import { DirectorState, type DirectorStateType } from '../core/Events.js';
import { GridView } from '../view/GridView.js';
import { FoodView } from '../view/FoodView.js';
import { SnakeView, type SnakeSegmentRender } from '../view/SnakeView.js';
import { TokenView, type TokenRender } from '../view/TokenView.js';
import { DomHud, type HudState } from '../view/DomHud.js';
import { Palette, MonoFont } from '../view/Palette.js';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MAX_STREAK_GROWTH } from './BitRegisterSystem.js';

interface SequenceState {
	targetBits: (0 | 1)[];
	activeBits: (0 | 1)[];
	movesLeft: number;
	streak: number;
}

const OVERLAY_ALPHA = 0.85;
const HINT_GAP = 14;
const HINT_LINE_HEIGHT = 22;

export class RenderSystem extends SystemBase {
	public readonly name = 'RenderSystem';
	private readonly holder: GridHolder;
	private readonly snakeId: EntityId;
	private readonly stage: Container;
	private readonly cellSize: number;
	private readonly gridView: GridView;
	private readonly foodView: FoodView;
	private readonly tokenView: TokenView;
	private readonly snakeView: SnakeView;
	private readonly hud: DomHud;
	private readonly overlay: Graphics;
	private readonly overlayLayer: Container;
	private readonly mainText: Text;
	private readonly subText: Text;
	private readonly hintKeys: Text[] = [];
	private readonly hintActions: Text[] = [];
	private cachedWallGrid: GridBitmask | null = null;
	private cachedWidth = -1;
	private level = 1;
	private time = 0;
	private state: DirectorStateType = DirectorState.MENU;
	private lastOverlayState: DirectorStateType | null = null;

	constructor(
		world: World,
		holder: GridHolder,
		snakeId: EntityId,
		stage: Container,
		cellSize: number,
		canvasParent: HTMLElement
	) {
		super(world);
		this.holder = holder;
		this.snakeId = snakeId;
		this.stage = stage;
		this.cellSize = cellSize;
		this.gridView = new GridView(cellSize);
		this.foodView = new FoodView(cellSize);
		this.tokenView = new TokenView(cellSize);
		this.snakeView = new SnakeView(cellSize);
		this.hud = new DomHud(canvasParent);
		this.overlay = new Graphics();
		this.overlayLayer = new Container();
		this.mainText = new Text({
			text: '',
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: 18,
				fontWeight: '700',
				fill: Palette.amber,
				letterSpacing: 2
			})
		});
		this.mainText.anchor.set(0.5, 0.5);
		this.subText = new Text({
			text: '',
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: 13,
				fontWeight: '600',
				fill: Palette.light,
				letterSpacing: 2
			})
		});
		this.subText.anchor.set(0.5, 0.5);
		this.overlayLayer.addChild(this.mainText);
		this.overlayLayer.addChild(this.subText);
		this.stage.addChild(this.gridView.container);
		this.stage.addChild(this.foodView.container);
		this.stage.addChild(this.tokenView.container);
		this.stage.addChild(this.snakeView.container);
		this.stage.addChild(this.overlay);
		this.stage.addChild(this.overlayLayer);
		this.world.events.on('director:stateChanged', (payload) => {
			this.state = payload.current;
		});
		this.world.events.on('level:expanded', (payload) => {
			this.level = payload.level;
		});
	}

	private get grid(): GridBitmask {
		return this.holder.grid;
	}

	public forceRender(): void {
		this.update(0);
	}

	public update(deltaMS: number): void {
		this.time = this.time + deltaMS;
		const width = this.grid.cols * this.cellSize;
		if (this.cachedWidth !== width) {
			this.hud.setWidth(width);
			this.cachedWidth = width;
		}
		if (this.cachedWallGrid !== this.grid) {
			this.gridView.renderBackground(this.grid);
			this.gridView.renderWalls(this.grid);
			this.cachedWallGrid = this.grid;
		}
		this.gridView.renderExit(this.grid, this.time);
		this.foodView.render(this.grid, this.time);
		const sequenceState = this.readSequenceState();
		this.renderSnake(sequenceState.targetBits.length);
		this.renderTokens();
		this.renderOverlay(width);
		const status = this.describeState();
		const hudState: HudState = {
			level: this.level,
			score: this.getScore(),
			movesLeft: sequenceState.movesLeft,
			targetBits: sequenceState.targetBits,
			activeBits: sequenceState.activeBits,
			status: status.text,
			statusColor: status.color,
			nextGrowth: Math.min(sequenceState.streak + 1, MAX_STREAK_GROWTH)
		};
		this.hud.update(hudState);
	}

	public dispose(): void {
		this.stage.removeChild(this.gridView.container);
		this.stage.removeChild(this.foodView.container);
		this.stage.removeChild(this.tokenView.container);
		this.stage.removeChild(this.snakeView.container);
		this.stage.removeChild(this.overlay);
		this.stage.removeChild(this.overlayLayer);
		this.gridView.container.destroy({ children: true });
		this.foodView.container.destroy({ children: true });
		this.tokenView.container.destroy({ children: true });
		this.snakeView.container.destroy({ children: true });
		this.overlay.destroy();
		this.overlayLayer.destroy({ children: true });
		this.hud.destroy();
	}

	private describeState(): { text: string; color: number } {
		if (this.state === DirectorState.MENU) {
			return { text: 'READY', color: Palette.gray };
		}
		if (this.state === DirectorState.PAUSED) {
			return { text: 'PAUSED', color: Palette.amber };
		}
		if (this.state === DirectorState.GAME_OVER) {
			return { text: 'GAME OVER', color: Palette.coral };
		}
		return { text: '', color: Palette.gray };
	}

	private renderOverlay(width: number): void {
		this.overlay.clear();
		if (this.state === DirectorState.PLAYING) {
			this.overlayLayer.visible = false;
			this.lastOverlayState = DirectorState.PLAYING;
			return;
		}
		this.overlayLayer.visible = true;
		this.overlay.rect(0, 0, width, this.grid.rows * this.cellSize);
		this.overlay.fill({ color: 0x04060a, alpha: OVERLAY_ALPHA });
		if (this.lastOverlayState !== this.state) {
			this.lastOverlayState = this.state;
			this.rebuildOverlayContent();
		}
		const cx = width / 2;
		const cy = (this.grid.rows * this.cellSize) / 2;
		if (this.state === DirectorState.MENU) {
			this.mainText.x = cx;
			this.mainText.y = cy - 44;
			this.subText.visible = false;
			this.positionHints(cx, cy + 4);
		} else {
			this.mainText.x = cx;
			this.mainText.y = cy - 14;
			this.subText.visible = true;
			this.subText.x = cx;
			this.subText.y = cy + 22;
			this.hideHints();
		}
	}

	private rebuildOverlayContent(): void {
		for (const hint of this.hintKeys) {
			hint.destroy();
		}
		for (const hint of this.hintActions) {
			hint.destroy();
		}
		this.hintKeys.length = 0;
		this.hintActions.length = 0;
		if (this.state === DirectorState.MENU) {
			this.mainText.text = 'PRESS ENTER TO START';
			(this.mainText.style as TextStyle).fill = Palette.amber;
			(this.mainText.style as TextStyle).fontSize = 18;
			const hints = [
				{ keys: '↑↓←→ / WASD', action: 'MOVE' },
				{ keys: 'SPACE / ESC', action: 'PAUSE' },
				{ keys: 'M', action: 'MUTE' }
			];
			for (const hint of hints) {
				const keys = this.createHintText(hint.keys);
				keys.anchor.set(1, 0.5);
				const action = this.createHintText(hint.action);
				action.anchor.set(0, 0.5);
				(action.style as TextStyle).fill = Palette.gray;
				this.overlayLayer.addChild(keys);
				this.overlayLayer.addChild(action);
				this.hintKeys.push(keys);
				this.hintActions.push(action);
			}
			return;
		}
		if (this.state === DirectorState.PAUSED) {
			this.mainText.text = 'PAUSED';
			(this.mainText.style as TextStyle).fill = Palette.amber;
			(this.mainText.style as TextStyle).fontSize = 30;
			this.subText.text = 'PRESS SPACE OR ENTER';
			return;
		}
		if (this.state === DirectorState.GAME_OVER) {
			this.mainText.text = 'GAME OVER';
			(this.mainText.style as TextStyle).fill = Palette.coral;
			(this.mainText.style as TextStyle).fontSize = 30;
			this.subText.text = 'PRESS ENTER TO RESTART';
		}
	}

	private createHintText(text: string): Text {
		return new Text({
			text,
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: 12,
				fontWeight: '600',
				fill: Palette.light,
				letterSpacing: 1.5
			})
		});
	}

	private positionHints(cx: number, startY: number): void {
		for (let i = 0; i < this.hintKeys.length; i++) {
			const keys = this.hintKeys[i];
			const action = this.hintActions[i];
			if (keys === undefined || action === undefined) {
				continue;
			}
			const y = startY + i * HINT_LINE_HEIGHT;
			keys.visible = true;
			keys.x = cx - HINT_GAP;
			keys.y = y;
			action.visible = true;
			action.x = cx + HINT_GAP;
			action.y = y;
		}
	}

	private hideHints(): void {
		for (const hint of this.hintKeys) {
			hint.visible = false;
		}
		for (const hint of this.hintActions) {
			hint.visible = false;
		}
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

	private renderSnake(activeLength: number): void {
		const segments: SnakeSegmentRender[] = [];
		const entities = this.world.query(['snakeSegment', 'gridPosition']).entities;
		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			const position = this.world.getComponent(entity, 'gridPosition');
			if (segment === undefined || position === undefined) {
				continue;
			}
			if (segment.snakeId !== this.snakeId) {
				continue;
			}
			segments.push({
				col: position.col,
				row: position.row,
				bit: segment.bit,
				order: segment.order,
				active: segment.order < activeLength
			});
		}
		segments.sort((a, b) => b.order - a.order);
		this.snakeView.render(segments);
	}

	private renderTokens(): void {
		const tokens: TokenRender[] = [];
		const entities = this.world.query(['bitPowerUp', 'gridPosition']).entities;
		for (const entity of entities) {
			const tokenPos = this.world.getComponent(entity, 'gridPosition');
			const token = this.world.getComponent(entity, 'bitPowerUp');
			if (tokenPos === undefined || token === undefined) {
				continue;
			}
			tokens.push({
				col: tokenPos.col,
				row: tokenPos.row,
				op: token.op
			});
		}
		this.tokenView.render(tokens, this.time);
	}

	private getScore(): number {
		const scoreEntities = this.world.query(['score']).entities;
		const scoreEntity = scoreEntities[0];
		if (scoreEntity === undefined) {
			return 0;
		}
		const score = this.world.getComponent(scoreEntity, 'score');
		if (score === undefined) {
			return 0;
		}
		return score.value;
	}
}