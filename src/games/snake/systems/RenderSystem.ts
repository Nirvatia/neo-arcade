import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridHolder } from '../logic/GridHolder.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import { DirectorState, type DirectorStateType } from '../core/Events.js';
import type { Direction } from '../components/index.js';
import { GridView } from '../view/GridView.js';
import { FoodView } from '../view/FoodView.js';
import { SnakeView, type SnakeSegmentRender } from '../view/SnakeView.js';
import { TokenView, type TokenRender } from '../view/TokenView.js';
import { DomHud, type HudState } from '../view/DomHud.js';
import { Palette, MonoFont } from '../view/Palette.js';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MAX_STREAK_GROWTH } from './BitRegisterSystem.js';
import type { Biome, BiomeManager, OverlayPalette } from '../biomes/index.js';

interface SequenceState {
	targetBits: (0 | 1)[];
	activeBits: (0 | 1)[];
	movesLeft: number;
	streak: number;
}

interface FxParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	color: number;
	lifeMS: number;
	maxLifeMS: number;
}

interface FxFloat {
	el: Text;
	lifeMS: number;
	maxLifeMS: number;
	vy: number;
}

const OVERLAY_COLOR = 0x050507;
const OVERLAY_ALPHA = 0.93;
const HINT_GAP = 14;
const HINT_LINE_HEIGHT = 24;
const MAX_PARTICLES = 320;
const WAVE_MS = 550;
const FAIL_MS = 400;

export class RenderSystem extends SystemBase {
	public readonly name = 'RenderSystem';
	private readonly holder: GridHolder;
	private readonly snakeId: EntityId;
	private readonly stage: Container;
	private readonly cellSize: number;
	private readonly biomeManager: BiomeManager;
	private readonly gridView: GridView;
	private readonly foodView: FoodView;
	private readonly tokenView: TokenView;
	private readonly snakeView: SnakeView;
	private readonly hud: DomHud;
	private readonly shakeLayer: Container;
	private readonly fxGraphics: Graphics;
	private readonly floatLayer: Container;
	private readonly overlay: Graphics;
	private readonly overlayLayer: Container;
	private readonly mainText: Text;
	private readonly subText: Text;
	private readonly hintKeys: Text[] = [];
	private readonly hintActions: Text[] = [];
	private readonly particles: FxParticle[] = [];
	private readonly floats: FxFloat[] = [];
	private cachedWallGrid: GridBitmask | null = null;
	private cachedWidth = -1;
	private level = 1;
	private time = 0;
	private state: DirectorStateType = DirectorState.MENU;
	private lastOverlayState: DirectorStateType | null = null;
	private finalMode = false;
	private shakeMag = 0;
	private flashAlpha = 0;
	private flashColor = 0xf0f0f2;
	private waveAt = -1;
	private failAt = -1;
	private headFlash = 0;

	constructor(
		world: World,
		holder: GridHolder,
		snakeId: EntityId,
		stage: Container,
		cellSize: number,
		canvasParent: HTMLElement,
		biomeManager: BiomeManager
	) {
		super(world);
		this.holder = holder;
		this.snakeId = snakeId;
		this.stage = stage;
		this.cellSize = cellSize;
		this.biomeManager = biomeManager;

		const biome = biomeManager.biome;
		this.gridView = new GridView(cellSize, biomeManager);
		this.foodView = new FoodView(cellSize, biomeManager);
		this.foodView.setWorld(this.world);
		this.tokenView = new TokenView(cellSize, biomeManager);
		this.snakeView = new SnakeView(cellSize, biomeManager);
		this.snakeView.setLevel(1);
		this.hud = new DomHud(canvasParent);
		this.shakeLayer = new Container();
		this.fxGraphics = new Graphics();
		this.floatLayer = new Container();
		this.overlay = new Graphics();
		this.overlayLayer = new Container();
		this.mainText = new Text({
			text: '',
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: 20,
				fontWeight: '400',
				fill: Palette.form,
				letterSpacing: 8
			})
		});
		this.mainText.anchor.set(0.5, 0.5);
		this.subText = new Text({
			text: '',
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: 13,
				fontWeight: '500',
				fill: Palette.gray,
				letterSpacing: 2
			})
		});
		this.subText.anchor.set(0.5, 0.5);
		this.overlayLayer.addChild(this.mainText);
		this.overlayLayer.addChild(this.subText);
		this.shakeLayer.addChild(this.gridView.container);
		this.shakeLayer.addChild(biomeManager.biome.getAmbientContainer());
		this.shakeLayer.addChild(this.foodView.container);
		this.shakeLayer.addChild(this.tokenView.container);
		this.shakeLayer.addChild(this.snakeView.container);
		this.shakeLayer.addChild(this.fxGraphics);
		this.shakeLayer.addChild(this.floatLayer);
		this.stage.addChild(this.shakeLayer);
		this.stage.addChild(this.overlay);
		this.stage.addChild(this.overlayLayer);

		this.foodView.setWorld(world);

		this.world.events.on('director:stateChanged', (payload) => {
			this.state = payload.current;
		});
		this.world.events.on('level:expanded', this.onLevelExpanded);
		this.world.events.on('final:started', this.onFinalStarted);
		this.world.events.on('game:endless', this.onEndlessStarted);
		this.world.events.on('collision:food', this.onFoodEaten);
		this.world.events.on('sequence:completed', this.onSequenceCompleted);
		this.world.events.on('sequence:failed', this.onSequenceFailed);
		this.world.events.on('exit:opened', this.onExitOpened);
		this.biomeManager.onBiomeChanged = this.onBiomeChanged;
	}

	private get overlayPalette(): OverlayPalette {
		return this.biomeManager.biome.overlay;
	}

	private onFinalStarted = (): void => {
		this.finalMode = true;
	};
	private onEndlessStarted = (): void => {
		this.finalMode = false;
	};
	private onLevelExpanded = (payload: { level: number }): void => {
		this.level = payload.level;
		this.snakeView.setLevel(payload.level);
		this.biomeManager.setLevel(payload.level);
		this.flash(0xf0f0f2, 0.45);
		this.addShake(4);
		this.floatText(
			(this.grid.cols * this.cellSize) / 2,
			(this.grid.rows * this.cellSize) / 2,
			`LEVEL ${payload.level}`,
			Palette.form,
			22
		);
	};
	private onFoodEaten = (): void => {
		this.headFlash = 1;
		const cell = this.findSegmentCell(0);
		if (cell !== null) {
			this.burst(cell.x, cell.y, 6, Palette.form, 130);
			this.floatText(cell.x, cell.y - 14, '+10', Palette.formDim, 13);
		}
	};
	private onSequenceCompleted = (): void => {
		const cell = this.findSegmentCell(0);
		if (cell !== null) {
			this.burst(cell.x, cell.y, 12, Palette.form, 190);
			this.floatText(cell.x, cell.y - 16, '+100', Palette.form, 18);
		}
		this.waveAt = this.time;
		this.addShake(3);
	};
	private onSequenceFailed = (): void => {
		const cell = this.findTailCell();
		if (cell !== null) {
			this.burst(cell.x, cell.y, 8, Palette.ghost, 140);
			this.floatText(cell.x, cell.y - 14, '-25', Palette.warn, 16);
		}
		this.failAt = this.time;
		this.addShake(6);
		this.hud.shakeCurrent();
	};
	private onExitOpened = (): void => {
		const cell = this.findExitCell();
		if (cell !== null) {
			this.burst(cell.x, cell.y, 10, Palette.accent, 150);
			this.floatText(cell.x, cell.y - 16, '+50', Palette.accent, 13);
		}
	};

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
			this.cachedWallGrid = this.grid;
		}
		this.gridView.renderExit(this.grid, this.time);
		this.biomeManager.biome.updateAmbient(
			deltaMS,
			this.time,
			this.cellSize,
			this.grid.cols,
			this.grid.rows
		);
		this.foodView.render(this.time);
		const sequenceState = this.readSequenceState();
		this.renderSnake(sequenceState.targetBits.length);
		this.renderTokens();
		this.updateFx(deltaMS);
		this.drawFx();
		this.renderOverlay(width);
		const hudState: HudState = {
			level: this.level,
			score: this.getScore(),
			movesLeft: sequenceState.movesLeft,
			targetBits: sequenceState.targetBits,
			activeBits: sequenceState.activeBits,
			nextGrowth: Math.min(sequenceState.streak + 1, MAX_STREAK_GROWTH),
			finalMode: this.finalMode
		};
		this.hud.update(hudState);
	}

	public dispose(): void {
		this.biomeManager.onBiomeChanged = null;

		this.stage.removeChild(this.shakeLayer);
		this.stage.removeChild(this.overlay);
		this.stage.removeChild(this.overlayLayer);
		this.shakeLayer.destroy({ children: true });
		this.overlay.destroy();
		this.overlayLayer.destroy({ children: true });
		this.tokenView.destroy();
		this.hud.destroy();
		this.particles.length = 0;
		this.floats.length = 0;
	}
	private renderOverlay(width: number): void {
		this.overlay.clear();
		if (this.state === DirectorState.PLAYING) {
			this.overlayLayer.visible = false;
			this.lastOverlayState = DirectorState.PLAYING;
			return;
		}

		const height = this.grid.rows * this.cellSize;
		this.overlayLayer.visible = true;

		// Фон оверлея рисует биом.
		this.biomeManager.biome.renderOverlay(this.overlay, width, height, this.time, this.cellSize);

		// Центр для позиционирования текстов.
		const cx = width / 2;
		const cy = height / 2;

		if (this.lastOverlayState !== this.state) {
			this.lastOverlayState = this.state;
			this.rebuildOverlayContent();
		}

		if (this.state === DirectorState.MENU) {
			this.mainText.x = cx;
			this.mainText.y = cy - 48;
			this.subText.visible = false;
			this.positionHints(cx, cy + 6);
		} else {
			this.mainText.x = cx;
			this.mainText.y = cy - 16;
			this.subText.visible = true;
			this.subText.x = cx;
			this.subText.y = cy + 24;
			this.hideHints();
		}
	}

	private rebuildOverlayContent(): void {
		const op = this.overlayPalette;
		for (const h of this.hintKeys) h.destroy();
		for (const h of this.hintActions) h.destroy();
		this.hintKeys.length = 0;
		this.hintActions.length = 0;

		if (this.state === DirectorState.MENU) {
			this.mainText.text = 'PRESS ENTER TO START';
			(this.mainText.style as TextStyle).fill = op.title;
			(this.mainText.style as TextStyle).fontSize = 22;
			(this.mainText.style as TextStyle).letterSpacing = 6;
			this.subText.visible = false;

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
				(keys.style as TextStyle).fill = op.hintKey;
				(action.style as TextStyle).fill = op.hintAction;
				this.overlayLayer.addChild(keys);
				this.overlayLayer.addChild(action);
				this.hintKeys.push(keys);
				this.hintActions.push(action);
			}
			return;
		}

		if (this.state === DirectorState.PAUSED) {
			this.mainText.text = 'PAUSED';
			(this.mainText.style as TextStyle).fill = op.title;
			(this.mainText.style as TextStyle).fontSize = 32;
			(this.mainText.style as TextStyle).letterSpacing = 10;
			this.subText.text = 'PRESS SPACE OR ENTER';
			(this.subText.style as TextStyle).fill = op.subtitle;
			(this.subText.style as TextStyle).fontSize = 14;
			return;
		}

		if (this.state === DirectorState.GAME_OVER) {
			this.mainText.text = 'GAME OVER';
			(this.mainText.style as TextStyle).fill = op.warn;
			(this.mainText.style as TextStyle).fontSize = 32;
			(this.mainText.style as TextStyle).letterSpacing = 8;
			this.subText.text = 'PRESS ENTER TO RESTART';
			(this.subText.style as TextStyle).fill = op.subtitle;
			(this.subText.style as TextStyle).fontSize = 14;
			return;
		}

		if (this.state === DirectorState.VICTORY) {
			this.mainText.text = 'MEMORY COMPLETE';
			(this.mainText.style as TextStyle).fill = op.success;
			(this.mainText.style as TextStyle).fontSize = 28;
			(this.mainText.style as TextStyle).letterSpacing = 6;
			this.subText.text = 'PRESS ENTER FOR ENDLESS MODE';
			(this.subText.style as TextStyle).fill = op.subtitle;
			(this.subText.style as TextStyle).fontSize = 14;
		}
	}

	private createHintText(text: string): Text {
		return new Text({
			text,
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: 13,
				fontWeight: '600',
				fill: Palette.form,
				letterSpacing: 1.5
			})
		});
	}

	private positionHints(cx: number, startY: number): void {
		for (let i = 0; i < this.hintKeys.length; i++) {
			const keys = this.hintKeys[i];
			const action = this.hintActions[i];
			if (keys === undefined || action === undefined) continue;
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
		for (const h of this.hintKeys) h.visible = false;
		for (const h of this.hintActions) h.visible = false;
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
		let headDir: Direction | undefined;
		let nextDir: Direction | undefined;

		const heads = this.world.query(['snakeHead']).entities;
		const headEntity = heads[0];
		if (headEntity !== undefined) {
			const head = this.world.getComponent(headEntity, 'snakeHead');
			if (head !== undefined) {
				headDir = head.dir;
				// Берём первое направление из очереди для мгновенного визуального отклика.
				nextDir = head.queue.length > 0 ? head.queue[0] : undefined;
			}
		}

		const entities = this.world.query(['snakeSegment', 'gridPosition']).entities;
		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			const position = this.world.getComponent(entity, 'gridPosition');
			if (segment === undefined || position === undefined) continue;
			if (segment.snakeId !== this.snakeId) continue;
			segments.push({
				col: position.col,
				row: position.row,
				bit: segment.bit,
				order: segment.order,
				active: segment.order < activeLength
			});
		}
		segments.sort((a, b) => b.order - a.order);
		this.snakeView.render(segments, headDir, nextDir, this.time);
	}

	private renderTokens(): void {
		const tokens: TokenRender[] = [];
		const entities = this.world.query(['bitPowerUp', 'gridPosition']).entities;
		for (const entity of entities) {
			const tokenPos = this.world.getComponent(entity, 'gridPosition');
			const token = this.world.getComponent(entity, 'bitPowerUp');
			if (tokenPos === undefined || token === undefined) continue;
			tokens.push({ col: tokenPos.col, row: tokenPos.row, op: token.op });
		}
		this.tokenView.render(tokens, this.time);
	}

	private updateFx(deltaMS: number): void {
		const dtS = deltaMS / 1000;
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			if (p === undefined) continue;
			p.lifeMS -= deltaMS;
			if (p.lifeMS <= 0) {
				this.particles.splice(i, 1);
				continue;
			}
			p.vy += 260 * dtS;
			p.x += p.vx * dtS;
			p.y += p.vy * dtS;
			p.vx *= 0.985;
		}
		for (let i = this.floats.length - 1; i >= 0; i--) {
			const f = this.floats[i];
			if (f === undefined) continue;
			f.lifeMS -= deltaMS;
			if (f.lifeMS <= 0) {
				this.floatLayer.removeChild(f.el);
				f.el.destroy();
				this.floats.splice(i, 1);
				continue;
			}
			f.el.y += f.vy * dtS;
			f.el.alpha = Math.max(0, f.lifeMS / f.maxLifeMS);
		}
		this.shakeMag *= Math.exp(-8 * dtS);
		this.flashAlpha = Math.max(0, this.flashAlpha - dtS * 2.5);
		this.headFlash = Math.max(0, this.headFlash - dtS * 8);
		if (this.shakeMag > 0.3) {
			this.shakeLayer.x = (Math.random() * 2 - 1) * this.shakeMag;
			this.shakeLayer.y = (Math.random() * 2 - 1) * this.shakeMag;
		} else {
			this.shakeLayer.x = 0;
			this.shakeLayer.y = 0;
		}
	}

	private drawFx(): void {
		const g = this.fxGraphics;
		g.clear();
		const width = this.grid.cols * this.cellSize;
		const height = this.grid.rows * this.cellSize;
		if (this.waveAt >= 0) {
			const p = (this.time - this.waveAt) / WAVE_MS;
			if (p > 1) this.waveAt = -1;
			else {
				const x = p * width;
				g.rect(x - 10, 0, 20, height).fill({ color: Palette.form, alpha: 0.08 * (1 - p) });
				g.rect(x - 1, 0, 2, height).fill({ color: Palette.form, alpha: 0.5 * (1 - p) });
			}
		}
		if (this.failAt >= 0) {
			const p = (this.time - this.failAt) / FAIL_MS;
			if (p > 1) this.failAt = -1;
			else {
				const a = 0.55 * (1 - p);
				g.rect(0, 0, width, 3).fill({ color: Palette.warn, alpha: a });
				g.rect(0, height - 3, width, 3).fill({ color: Palette.warn, alpha: a });
			}
		}
		if (this.headFlash > 0) {
			const cell = this.findSegmentCell(0);
			if (cell !== null) {
				const cs = this.cellSize;
				g.rect(cell.x - cs / 2, cell.y - cs / 2, cs, cs).fill({
					color: 0xffffff,
					alpha: 0.3 * this.headFlash
				});
			}
		}
		for (const p of this.particles) {
			const a = Math.max(0, p.lifeMS / p.maxLifeMS);
			const s = Math.max(1, p.size * a);
			g.rect(p.x - s / 2, p.y - s / 2, s, s).fill({ color: p.color, alpha: a });
		}
		if (this.flashAlpha > 0.01) {
			g.rect(0, 0, width, height).fill({ color: this.flashColor, alpha: this.flashAlpha });
		}
	}

	private burst(x: number, y: number, n: number, color: number, speed: number): void {
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2;
			const s = speed * (0.3 + Math.random() * 0.7);
			const life = 300 + Math.random() * 300;
			this.particles.push({
				x,
				y,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s - 30,
				size: 2 + Math.random() * 3,
				color,
				lifeMS: life,
				maxLifeMS: life
			});
		}
		if (this.particles.length > MAX_PARTICLES)
			this.particles.splice(0, this.particles.length - MAX_PARTICLES);
	}

	private floatText(x: number, y: number, text: string, color: number, size: number): void {
		const el = new Text({
			text,
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: size,
				fontWeight: '500',
				letterSpacing: 1,
				fill: color,
				dropShadow: { color: 0x000000, alpha: 0.85, blur: 6, distance: 2 }
			})
		});
		el.anchor.set(0.5, 0.5);
		el.x = x;
		el.y = y;
		this.floatLayer.addChild(el);
		this.floats.push({ el, lifeMS: 900, maxLifeMS: 900, vy: -44 });
	}

	private flash(color: number, alpha: number): void {
		this.flashColor = color;
		this.flashAlpha = Math.max(this.flashAlpha, alpha);
	}
	private addShake(m: number): void {
		this.shakeMag = Math.max(this.shakeMag, m);
	}

	private findSegmentCell(order: number): { x: number; y: number } | null {
		const entities = this.world.query(['snakeSegment', 'gridPosition']).entities;
		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			const position = this.world.getComponent(entity, 'gridPosition');
			if (segment === undefined || position === undefined) continue;
			if (segment.snakeId !== this.snakeId || segment.order !== order) continue;
			return {
				x: position.col * this.cellSize + this.cellSize / 2,
				y: position.row * this.cellSize + this.cellSize / 2
			};
		}
		return null;
	}

	private findTailCell(): { x: number; y: number } | null {
		let best: { x: number; y: number } | null = null;
		let maxOrder = -1;
		const entities = this.world.query(['snakeSegment', 'gridPosition']).entities;
		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			const position = this.world.getComponent(entity, 'gridPosition');
			if (segment === undefined || position === undefined) continue;
			if (segment.snakeId !== this.snakeId || segment.order <= maxOrder) continue;
			maxOrder = segment.order;
			best = {
				x: position.col * this.cellSize + this.cellSize / 2,
				y: position.row * this.cellSize + this.cellSize / 2
			};
		}
		return best;
	}

	private findExitCell(): { x: number; y: number } | null {
		for (let row = 0; row < this.grid.rows; row++) {
			for (let col = 0; col < this.grid.cols; col++) {
				if (this.grid.isExit(col, row))
					return {
						x: col * this.cellSize + this.cellSize / 2,
						y: row * this.cellSize + this.cellSize / 2
					};
			}
		}
		return null;
	}

	private onBiomeChanged = (next: Biome, prev: Biome): void => {
		const prevAmbient = prev.getAmbientContainer();
		const nextAmbient = next.getAmbientContainer();

		if (this.shakeLayer.children.includes(prevAmbient)) {
			const index = this.shakeLayer.getChildIndex(prevAmbient);
			this.shakeLayer.removeChild(prevAmbient);
			this.shakeLayer.addChildAt(nextAmbient, index);
		} else {
			this.shakeLayer.addChild(nextAmbient);
		}

		// Поле нужно перерисовать новым биомом.
		this.cachedWallGrid = null;

		// Оверлей тоже должен быть пересобран в новой биомной палитре.
		this.lastOverlayState = null;
	};

	private getScore(): number {
		const scoreEntities = this.world.query(['score']).entities;
		const scoreEntity = scoreEntities[0];
		if (scoreEntity === undefined) return 0;
		const score = this.world.getComponent(scoreEntity, 'score');
		return score === undefined ? 0 : score.value;
	}
}
