import type {
	BiomeManager,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from '../../biomes/index.js';
import type { SnakeMotion } from '../../components/index.js';
import { RenderConfig } from '../../config/index.js';
import { sampleSnakeMotion } from '../../logic/snake/SnakePath.js';

/**
 * SnakeView теперь поддерживает режим без рамок.
 *
 * Если тело змейки визуально разрывается при переходе через край поля,
 * цепь разбивается на несколько сегментов, чтобы не рисовать
 * длинную линию через весь экран.
 */
export class SnakeView {
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;
	}

	public render(
		ctx: CanvasRenderingContext2D,
		motion: SnakeMotion,
		zones: SnakeZoneStyle[],
		deathProgress: number,
		timeMS: number
	): void {
		if (zones.length === 0) {
			return;
		}

		if (deathProgress >= 1) {
			return;
		}

		const visibleLengthCells = Math.max(
			0,
			motion.visualLengthCells * (1 - deathProgress)
		);

		if (visibleLengthCells <= 0.001) {
			return;
		}

		const pointsPerCell = RenderConfig.POINTS_PER_CELL;
		const stepU = 1 / pointsPerCell;

		const pointCount = Math.max(
			2,
			Math.ceil(visibleLengthCells / stepU) + 1
		);

		const chain: SnakeChainPoint[] = [];

		for (let k = 0; k < pointCount; k++) {
			const distCells = Math.min(k * stepU, visibleLengthCells);
			const u = motion.headU - distCells;
			const sample = sampleSnakeMotion(motion, u);

			const zone = Math.min(
				zones.length - 1,
				Math.floor(distCells + 0.0001)
			);

			chain.push({
				x: sample.x,
				y: sample.y,
				angle: sample.angle,
				d: distCells * this.cellSize,
				zone
			});
		}

		const headPoint = chain[0];

		if (headPoint === undefined) {
			return;
		}

		const headRender: SnakeHeadRender = {
			x: headPoint.x,
			y: headPoint.y,
			angle: headPoint.angle,
			moving: motion.hasSegment && deathProgress <= 0
		};

		const offscreenHead: SnakeHeadRender = {
			x: -10000,
			y: -10000,
			angle: 0,
			moving: false
		};

		const segments = this.splitChain(chain);

		// Рисуем сегменты в обратном порядке, чтобы голова была сверху.
		for (let i = segments.length - 1; i >= 0; i--) {
			let segment = segments[i];

			if (segment === undefined || segment.length === 0) {
				continue;
			}

			const hasHead = segment.some((point) => point.zone === 0);

			if (segment.length === 1 && hasHead) {
				const single = segment[0];

				if (single !== undefined) {
					segment = this.createHeadStub(single);
				}
			}

			if (segment.length < 2) {
				continue;
			}

			this.biomes.biome.renderSnake(
				ctx,
				segment,
				zones,
				hasHead ? headRender : offscreenHead,
				timeMS,
				this.cellSize
			);
		}
	}

	private splitChain(chain: SnakeChainPoint[]): SnakeChainPoint[][] {
		const segments: SnakeChainPoint[][] = [];

		let current: SnakeChainPoint[] = [];

		for (let i = 0; i < chain.length; i++) {
			const point = chain[i];

			if (point === undefined) {
				continue;
			}

			if (current.length === 0) {
				current.push(point);
				continue;
			}

			const prev = current[current.length - 1];

			if (prev === undefined) {
				current.push(point);
				continue;
			}

			const dx = point.x - prev.x;
			const dy = point.y - prev.y;
			const distance = Math.hypot(dx, dy);

			// Если расстояние слишком большое, значит произошёл переход через край поля.
			if (distance > this.cellSize * 2.5) {
				segments.push(current);
				current = [point];
			} else {
				current.push(point);
			}
		}

		if (current.length > 0) {
			segments.push(current);
		}

		return segments;
	}

	private createHeadStub(point: SnakeChainPoint): SnakeChainPoint[] {
		const backDistance = this.cellSize * 0.6;

		const backX = point.x - Math.cos(point.angle) * backDistance;
		const backY = point.y - Math.sin(point.angle) * backDistance;

		const back: SnakeChainPoint = {
			x: backX,
			y: backY,
			angle: point.angle,
			d: point.d + backDistance,
			zone: point.zone
		};

		return [point, back];
	}
}