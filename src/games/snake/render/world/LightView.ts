import type { GridService } from '../../logic/grid/GridService.js';
import type {
	BiomeManager,
	BiomePalette
} from '../../biomes/index.js';
import { rgba } from '../../canvas/canvasColor.js';
import type { World } from '$games/snake/engine/ecs/World.js';

const LIGHT_SCALE = 0.35;
const SPRITE_SIZE = 64;

/**
 * LightView — низкоразмерный слой динамического света.
 *
 * Оптимизация:
 * - свет рисуется в буфер ~35% от разрешения сцены;
 * - вместо градиентов каждый кадр используются заранее созданные спрайты;
 * - количество источников света жёстко ограничено;
 * - нет shadowBlur и тяжёлых canvas-фильтров.
 */
export class LightView {
	private readonly world: World;
	private readonly service: GridService;
	private readonly cellSize: number;
	private readonly biomeManager: BiomeManager;

	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly sprites = new Map<number, HTMLCanvasElement>();

	private bufferWidth = 0;
	private bufferHeight = 0;

	constructor(
		world: World,
		service: GridService,
		cellSize: number,
		biomeManager: BiomeManager
	) {
		this.world = world;
		this.service = service;
		this.cellSize = cellSize;
		this.biomeManager = biomeManager;

		this.canvas = document.createElement('canvas');
		const ctx = this.canvas.getContext('2d', { alpha: true });

		if (ctx === null) {
			throw new Error('LightView: cannot create 2D context.');
		}

		this.ctx = ctx;
	}

	public invalidate(): void {
		this.sprites.clear();
	}

	public dispose(): void {
		this.invalidate();
		this.bufferWidth = 0;
		this.bufferHeight = 0;
		this.canvas.width = 1;
		this.canvas.height = 1;
	}

	public render(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		timeMS: number
	): void {
		if (width <= 0 || height <= 0) {
			return;
		}

		this.ensureBuffer(width, height);

		const lightCtx = this.ctx;
		lightCtx.clearRect(0, 0, this.bufferWidth, this.bufferHeight);
		lightCtx.globalCompositeOperation = 'lighter';

		const palette = this.biomeManager.biome.palette;

		this.drawExitLights(palette, timeMS);
		this.drawFoodLights(palette, timeMS);
		this.drawTokenLights(palette, timeMS);

		lightCtx.globalAlpha = 1;

		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.85;
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(this.canvas, 0, 0, width, height);
		ctx.restore();
	}

	private ensureBuffer(width: number, height: number): void {
		const nextWidth = Math.max(1, Math.round(width * LIGHT_SCALE));
		const nextHeight = Math.max(1, Math.round(height * LIGHT_SCALE));

		if (
			nextWidth === this.bufferWidth &&
			nextHeight === this.bufferHeight
		) {
			return;
		}

		this.canvas.width = nextWidth;
		this.canvas.height = nextHeight;
		this.bufferWidth = nextWidth;
		this.bufferHeight = nextHeight;
	}

	private drawExitLights(palette: BiomePalette, timeMS: number): void {
		const grid = this.service.grid;
		const pulse = 0.72 + 0.28 * Math.sin(timeMS * 0.0032);

		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				if (!grid.isExit(col, row)) {
					continue;
				}

				const x = col * this.cellSize + this.cellSize / 2;
				const y = row * this.cellSize + this.cellSize / 2;

				this.drawGlow(
					x,
					y,
					this.cellSize * 2.6,
					palette.accent,
					0.2 * pulse
				);

				this.drawGlow(
					x,
					y,
					this.cellSize * 1.2,
					palette.form,
					0.14 * pulse
				);
			}
		}
	}

	private drawFoodLights(palette: BiomePalette, timeMS: number): void {
		const entities = this.world.query(['food', 'gridPosition']).entities;

		for (const entityId of entities) {
			const position = this.world.getComponent(entityId, 'gridPosition');
			const food = this.world.getComponent(entityId, 'food');

			if (position === undefined || food === undefined) {
				continue;
			}

			let x = position.col * this.cellSize + this.cellSize / 2;
			let y = position.row * this.cellSize + this.cellSize / 2;

			const wander = this.world.getComponent(entityId, 'foodWander');

			if (
				wander !== undefined &&
				Number.isFinite(wander.x) &&
				Number.isFinite(wander.y)
			) {
				x = wander.x;
				y = wander.y;
			}

			const color = food.bit === 1 ? palette.bitOne : palette.bitZero;
			const pulse =
				0.78 + 0.22 * Math.sin(timeMS * 0.004 + entityId * 0.7);

			this.drawGlow(x, y, this.cellSize * 1.7, color, 0.18 * pulse);
			this.drawGlow(x, y, this.cellSize * 0.8, color, 0.16 * pulse);
		}
	}

	private drawTokenLights(palette: BiomePalette, timeMS: number): void {
		const entities = this.world.query([
			'bitPowerUp',
			'gridPosition'
		]).entities;

		for (const entityId of entities) {
			const position = this.world.getComponent(entityId, 'gridPosition');
			const token = this.world.getComponent(entityId, 'bitPowerUp');

			if (position === undefined || token === undefined) {
				continue;
			}

			const x = position.col * this.cellSize + this.cellSize / 2;
			const y = position.row * this.cellSize + this.cellSize / 2;

			const pulse =
				0.8 +
				0.2 *
					Math.sin(
						timeMS * 0.005 +
							position.col * 7.3 +
							position.row * 11.7
					);

			this.drawGlow(
				x,
				y,
				this.cellSize * 1.6,
				palette.accent,
				0.14 * pulse
			);
		}
	}

	private drawGlow(
		x: number,
		y: number,
		radius: number,
		color: number,
		alpha: number
	): void {
		if (radius <= 0 || alpha <= 0) {
			return;
		}

		const sprite = this.getSprite(color);
		const size = radius * 2 * LIGHT_SCALE;

		this.ctx.globalAlpha = Math.min(1, alpha);
		this.ctx.drawImage(
			sprite,
			(x - radius) * LIGHT_SCALE,
			(y - radius) * LIGHT_SCALE,
			size,
			size
		);
	}

	private getSprite(color: number): HTMLCanvasElement {
		const cached = this.sprites.get(color);

		if (cached !== undefined) {
			return cached;
		}

		const sprite = document.createElement('canvas');
		sprite.width = SPRITE_SIZE;
		sprite.height = SPRITE_SIZE;

		const spriteCtx = sprite.getContext('2d');

		if (spriteCtx !== null) {
			const half = SPRITE_SIZE / 2;
			const gradient = spriteCtx.createRadialGradient(
				half,
				half,
				0,
				half,
				half,
				half
			);

			gradient.addColorStop(0, rgba(color, 0.85));
			gradient.addColorStop(0.22, rgba(color, 0.42));
			gradient.addColorStop(1, rgba(color, 0));

			spriteCtx.fillStyle = gradient;
			spriteCtx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
		}

		this.sprites.set(color, sprite);
		return sprite;
	}
}