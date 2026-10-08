import type { GridService } from '../../logic/grid/GridService.js';
import type { BiomeManager, ParticleRender } from '../../biomes/index.js';
import { MonoFont } from '../../canvas/Palette.js';
import { ScreenFxRenderer } from './ScreenFxRenderer.js';
import { FxConfig } from '../../config/index.js';
import { rgba } from '../../canvas/canvasColor.js';
import type { World } from '$games/snake/engine/ecs/World.js';
import type { EntityId } from '$games/snake/engine/ecs/types.js';

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
	text: string;
	x: number;
	y: number;
	color: number;
	size: number;
	lifeMS: number;
	maxLifeMS: number;
	vy: number;
}

export class FxCoordinator {
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

	constructor(
		world: World,
		snakeId: EntityId,
		service: GridService,
		cellSize: number,
		biomeManager: BiomeManager
	) {
		this.world = world;
		this.snakeId = snakeId;
		this.service = service;
		this.cellSize = cellSize;
		this.biomeManager = biomeManager;
		this.screenRenderer = new ScreenFxRenderer(biomeManager);
	}

	public onFoodEaten(): void {
		const cell = this.findSegmentCell(0);

		if (cell !== null) {
			this.burst(cell.x, cell.y, 6, this.biomeManager.biome.palette.form, 130);
		}
	}

	/**
	 * Эффект успешной последовательности.
	 * Радиальный импульс от головы + искры вдоль тела.
	 */
	public onSequenceCompleted(): void {
		const headCell = this.findSegmentCell(0);

		if (headCell === null) {
			return;
		}

		// Радиальный импульс от головы.
		this.screenRenderer.triggerSequencePulse(headCell.x, headCell.y);

		// Всплеск частиц от головы.
		this.burst(
			headCell.x,
			headCell.y,
			10,
			this.biomeManager.biome.palette.accent,
			200
		);

		// Искры вдоль тела.
		this.sparkAlongBody();
		this.addShake(2.5);
	}

	public onSequenceFailed(): void {
		const cell = this.findTailCell();

		if (cell !== null) {
			this.burst(cell.x, cell.y, 8, this.biomeManager.biome.palette.formDim, 140);
		}

		this.screenRenderer.triggerFail();
		this.addShake(6);
	}

	public onExitOpened(): void {
		const cell = this.findExitCell();

		if (cell !== null) {
			this.burst(cell.x, cell.y, 10, this.biomeManager.biome.palette.accent, 150);
		}
	}

	public onDeathStart(): void {
		this.addShake(5);
	}

	public onDeathSegment(col: number, row: number): void {
		const x = col * this.cellSize + this.cellSize / 2;
		const y = row * this.cellSize + this.cellSize / 2;
		this.burst(x, y, 6, this.biomeManager.biome.palette.warn, 120);
	}

	// ===== Переход между биомами =====

	public beginBiomeTransition(): void {
		this.screenRenderer.beginBiomeTransition();
		this.addShake(4);
	}

	public setBiomeTransitionProgress(progress: number): void {
		this.screenRenderer.setBiomeTransitionProgress(progress);
	}

	public endBiomeTransition(): void {
		this.screenRenderer.endBiomeTransition();
	}

	public showBiomeTitle(level: number): void {
		const grid = this.service.grid;
		const cx = (grid.cols * this.cellSize) / 2;
		const cy = (grid.rows * this.cellSize) / 2;

		this.floatText(
			cx,
			cy,
			`BIOME ${level}`,
			this.biomeManager.biome.palette.accent,
			30
		);
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
				this.floats.splice(i, 1);
				continue;
			}

			f.y += f.vy * dtS;
		}

		this.shakeMag *= Math.exp(-8 * dtS);
		this.screenRenderer.update(deltaMS);
	}

	public getShakeOffset(): { x: number; y: number } {
		if (this.shakeMag > 0.3) {
			return {
				x: (Math.random() * 2 - 1) * this.shakeMag,
				y: (Math.random() * 2 - 1) * this.shakeMag
			};
		}

		return { x: 0, y: 0 };
	}

	public draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
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

		this.biomeManager.biome.particleRenderer.render(
			ctx,
			particleRenders,
			this.time,
			this.cellSize
		);

		const headCell = this.findSegmentCell(0);
		const headX = headCell !== null ? headCell.x : 0;
		const headY = headCell !== null ? headCell.y : 0;

		this.screenRenderer.draw(ctx, width, height, headX, headY, this.cellSize);

		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		for (const f of this.floats) {
			const alpha = Math.max(0, f.lifeMS / f.maxLifeMS);

			ctx.font = `700 ${f.size}px ${MonoFont.FAMILY}`;
			ctx.fillStyle = rgba(f.color, alpha);
			ctx.fillText(f.text, f.x, f.y);
		}

		ctx.restore();
	}

	public dispose(): void {
		this.particles.length = 0;
		this.floats.length = 0;
	}

	/**
	 * Искры вдоль тела змейки при успешной последовательности.
	 */
	private sparkAlongBody(): void {
		const pal = this.biomeManager.biome.palette;
		const entities = this.world.query(['snakeSegment', 'gridPosition']).entities;
		let spawned = 0;

		for (const entity of entities) {
			const segment = this.world.getComponent(entity, 'snakeSegment');
			const position = this.world.getComponent(entity, 'gridPosition');

			if (segment === undefined || position === undefined) {
				continue;
			}

			if (segment.snakeId !== this.snakeId) {
				continue;
			}

			if (spawned >= FxConfig.SEQUENCE_SPARK_COUNT) {
				break;
			}

			const x = position.col * this.cellSize + this.cellSize / 2;
			const y = position.row * this.cellSize + this.cellSize / 2;

			this.burst(x, y, 2, pal.accent, 90);
			spawned = spawned + 1;
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

		if (this.particles.length > FxConfig.MAX_PARTICLES) {
			this.particles.splice(0, this.particles.length - FxConfig.MAX_PARTICLES);
		}
	}

	private floatText(x: number, y: number, text: string, color: number, size: number): void {
		this.floats.push({
			text,
			x,
			y,
			color,
			size,
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
}