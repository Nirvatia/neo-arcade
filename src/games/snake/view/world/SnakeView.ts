import { Container, Graphics } from 'pixi.js';
import type {
	BiomeManager,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from '../../biomes/index.js';
import type { SnakeMotion } from '../../components/index.js';
import { RenderConfig } from '../../config/index.js';
import { sampleSnakeMotion } from './SnakePath.js';

export class SnakeView {
	public readonly container: Container;

	private readonly graphics: Graphics;
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;

		this.container = new Container();
		this.graphics = new Graphics();

		this.container.addChild(this.graphics);
	}

	public render(
		motion: SnakeMotion,
		zones: SnakeZoneStyle[],
		deathProgress: number,
		timeMS: number
	): void {
		this.graphics.clear();

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

		this.biomes.biome.renderSnake(
			this.graphics,
			chain,
			zones,
			headRender,
			timeMS,
			this.cellSize
		);
	}
}