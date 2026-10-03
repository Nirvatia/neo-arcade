import type { World } from '../../core/ecs/World.js';
import type { EntityId } from '../../core/ecs/types.js';
import type { GridService } from '../../logic/grid/GridService.js';
import type { BiomeManager } from '../../biomes/index.js';
import type { ParticleRender } from '../../biomes/index.js';
import { Palette, MonoFont } from '../Palette.js';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ScreenFxRenderer } from './ScreenFxRenderer.js';
import { FxConfig } from '../../config/index.js';

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

export class FxCoordinator {
	public readonly fxGraphics: Graphics;
	public readonly floatLayer: Container;
	private readonly shakeLayer: Container;
	private readonly world: World;
	private readonly snakeId: EntityId;
	private readonly service: GridService;
	private readonly cellSize: number;
	private readonly biomeManager: BiomeManager;
	private readonly screenRenderer: ScreenFxRenderer;
	private readonly particles: FxParticle[] = [];
	private readonly floats: FxFloat[] = [];
	private shakeMag = 0;
	private time = 0;
	public onHudShake: (() => void) | null = null;

	constructor(
		shakeLayer: Container,
		world: World,
		snakeId: EntityId,
		service: GridService,
		cellSize: number,
		biomeManager: BiomeManager
	) {
		this.shakeLayer = shakeLayer;
		this.world = world;
		this.snakeId = snakeId;
		this.service = service;
		this.cellSize = cellSize;
		this.biomeManager = biomeManager;
		this.screenRenderer = new ScreenFxRenderer();
		this.fxGraphics = new Graphics();
		this.floatLayer = new Container();
		this.shakeLayer.addChild(this.fxGraphics);
		this.shakeLayer.addChild(this.floatLayer);
	}

	public onFoodEaten(): void {
		const cell = this.findSegmentCell(0);
		if (cell !== null) {
			this.burst(cell.x, cell.y, 6, Palette.form, 130);
		}
	}

	public onSequenceCompleted(): void {
		const cell = this.findSegmentCell(0);
		if (cell !== null) {
			this.burst(cell.x, cell.y, 12, Palette.form, 190);
		}
		this.screenRenderer.triggerWave();
		this.addShake(3);
	}

	public onSequenceFailed(): void {
		const cell = this.findTailCell();
		if (cell !== null) {
			this.burst(cell.x, cell.y, 8, Palette.ghost, 140);
		}
		this.screenRenderer.triggerFail();
		this.addShake(6);
		if (this.onHudShake !== null) {
			this.onHudShake();
		}
	}

	public onExitOpened(): void {
		const cell = this.findExitCell();
		if (cell !== null) {
			this.burst(cell.x, cell.y, 10, Palette.accent, 150);
		}
	}

	public onLevelExpanded(level: number): void {
		const grid = this.service.grid;
		const cx = (grid.cols * this.cellSize) / 2;
		const cy = (grid.rows * this.cellSize) / 2;
		this.screenRenderer.triggerFlash(0xf0f0f2, 0.45);
		this.addShake(4);
		this.floatText(cx, cy, `LEVEL ${level}`, Palette.form, 22);
	}

	public onDeathStart(): void {
		this.addShake(5);
	}

	public onDeathSegment(col: number, row: number): void {
		const x = col * this.cellSize + this.cellSize / 2;
		const y = row * this.cellSize + this.cellSize / 2;
		this.burst(x, y, 6, Palette.warn, 120);
	}

	public update(deltaMS: number): void {
		this.time = this.time + deltaMS;
		const dtS = deltaMS / 1000;
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			if (p === undefined) {
				continue;
			}
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
			if (f === undefined) {
				continue;
			}
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
		this.screenRenderer.update(deltaMS);
		if (this.shakeMag > 0.3) {
			this.shakeLayer.x = (Math.random() * 2 - 1) * this.shakeMag;
			this.shakeLayer.y = (Math.random() * 2 - 1) * this.shakeMag;
		} else {
			this.shakeLayer.x = 0;
			this.shakeLayer.y = 0;
		}
	}

	public drawFx(): void {
		const g = this.fxGraphics;
		g.clear();
		const grid = this.service.grid;
		const width = grid.cols * this.cellSize;
		const height = grid.rows * this.cellSize;
		const particleRenders: ParticleRender[] = [];
		for (const p of this.particles) {
			const life = Math.max(0, p.lifeMS / p.maxLifeMS);
			particleRenders.push({
				x: p.x,
				y: p.y,
				size: Math.max(1, p.size * life),
				life,
				color: p.color
			});
		}
		this.biomeManager.biome.particleRenderer.render(g, particleRenders, this.time, this.cellSize);
		const headCell = this.findSegmentCell(0);
		const headX = headCell !== null ? headCell.x : 0;
		const headY = headCell !== null ? headCell.y : 0;
		this.screenRenderer.draw(g, width, height, headX, headY, this.cellSize);
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
		if (this.particles.length > FxConfig.MAX_PARTICLES) {
			this.particles.splice(0, this.particles.length - FxConfig.MAX_PARTICLES);
		}
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
				dropShadow: {
					color: 0x000000,
					alpha: 0.85,
					blur: 6,
					distance: 2
				}
			})
		});
		el.anchor.set(0.5, 0.5);
		el.x = x;
		el.y = y;
		this.floatLayer.addChild(el);
		this.floats.push({
			el,
			lifeMS: 900,
			maxLifeMS: 900,
			vy: -44
		});
	}

	private addShake(m: number): void {
		this.shakeMag = Math.max(this.shakeMag, m);
	}

	private findSegmentCell(order: number): { x: number; y: number } | null {
		const entities = this.world.query(['snakeSegment', 'gridPosition']).entities;
		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			const position = this.world.getComponent(entity, 'gridPosition');
			if (segment === undefined || position === undefined) {
				continue;
			}
			if (segment.snakeId !== this.snakeId || segment.order !== order) {
				continue;
			}
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
			if (segment === undefined || position === undefined) {
				continue;
			}
			if (segment.snakeId !== this.snakeId || segment.order <= maxOrder) {
				continue;
			}
			maxOrder = segment.order;
			best = {
				x: position.col * this.cellSize + this.cellSize / 2,
				y: position.row * this.cellSize + this.cellSize / 2
			};
		}
		return best;
	}

	private findExitCell(): { x: number; y: number } | null {
		const grid = this.service.grid;
		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				if (grid.isExit(col, row)) {
					return {
						x: col * this.cellSize + this.cellSize / 2,
						y: row * this.cellSize + this.cellSize / 2
					};
				}
			}
		}
		return null;
	}

	public dispose(): void {
		this.shakeLayer.removeChild(this.fxGraphics);
		this.shakeLayer.removeChild(this.floatLayer);
		this.fxGraphics.destroy();
		this.floatLayer.destroy({ children: true });
		this.particles.length = 0;
		this.floats.length = 0;
		this.onHudShake = null;
	}
}
