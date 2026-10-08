import type {
	BiomeManager,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from '../../biomes/index.js';
import type { SnakeMotion } from '../../components/index.js';
import { RenderConfig } from '../../config/index.js';
import { sampleSnakeMotion } from '../../logic/snake/SnakePath.js';

interface ChainRange {
	start: number;
	end: number;
}

export class SnakeView {
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;
	
	private readonly chainBuffer: SnakeChainPoint[] = [];
	private readonly segmentRanges: ChainRange[] = [];
	private rangeCount = 0;
	
	private readonly headRender: SnakeHeadRender = { x: 0, y: 0, angle: 0, moving: false };
	private readonly offscreenHead: SnakeHeadRender = { x: -10000, y: -10000, angle: 0, moving: false };

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;
	}

	public render(
		ctx: CanvasRenderingContext2D,
		motion: SnakeMotion,
		zones: SnakeZoneStyle[],
		zoneCount: number,
		deathProgress: number,
		timeMS: number
	): void {
		if (zoneCount === 0 || deathProgress >= 1) {
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
		
		// Заполняем буфер точек
		for (let k = 0; k < pointCount; k++) {
			if (k >= this.chainBuffer.length) {
				this.chainBuffer.push({ x: 0, y: 0, angle: 0, d: 0, zone: 0 });
			}
			
			const distCells = Math.min(k * stepU, visibleLengthCells);
			const u = motion.headU - distCells;
			const sample = sampleSnakeMotion(motion, u);
			const zone = Math.min(zoneCount - 1, Math.floor(distCells + 0.0001));
			
			const p = this.chainBuffer[k];
			if (p !== undefined) {
				p.x = sample.x;
				p.y = sample.y;
				p.angle = sample.angle;
				p.d = distCells * this.cellSize;
				p.zone = zone;
			}
		}
		
		// Гарантируем место для заглушки головы (2 точки)
		while (this.chainBuffer.length < pointCount + 2) {
			this.chainBuffer.push({ x: 0, y: 0, angle: 0, d: 0, zone: 0 });
		}
		
		const headPoint = this.chainBuffer[0];
		if (headPoint === undefined) {
			throw new Error('SnakeView: chain buffer is empty.');
		}
		
		this.headRender.x = headPoint.x;
		this.headRender.y = headPoint.y;
		this.headRender.angle = headPoint.angle;
		this.headRender.moving = motion.hasSegment && deathProgress <= 0;
		
		this.splitChain(this.chainBuffer, pointCount);
		
		// Рисуем сегменты в обратном порядке, чтобы голова была сверху
		for (let i = this.rangeCount - 1; i >= 0; i--) {
			const range = this.segmentRanges[i];
			if (range === undefined || range.end <= range.start) continue;
			
			const start = range.start;
			const end = range.end;
			
			let hasHead = false;
			for (let j = start; j < end; j++) {
				const p = this.chainBuffer[j];
				if (p !== undefined && p.zone === 0) {
					hasHead = true;
					break;
				}
			}
			
			// Если сегмент состоит из одной точки и это голова — создаем заглушку
			if (end - start === 1 && hasHead) {
				const single = this.chainBuffer[start];
				if (single === undefined) continue;
				
				const p1 = this.chainBuffer[pointCount];
				const p2 = this.chainBuffer[pointCount + 1];
				if (p1 !== undefined && p2 !== undefined) {
					p1.x = single.x;
					p1.y = single.y;
					p1.angle = single.angle;
					p1.d = single.d;
					p1.zone = single.zone;
					
					const backDistance = this.cellSize * 0.6;
					p2.x = single.x - Math.cos(single.angle) * backDistance;
					p2.y = single.y - Math.sin(single.angle) * backDistance;
					p2.angle = single.angle;
					p2.d = single.d + backDistance;
					p2.zone = single.zone;
					
					this.biomes.biome.renderSnake(
						ctx,
						this.chainBuffer,
						pointCount,
						pointCount + 2,
						zones,
						this.headRender,
						timeMS,
						this.cellSize
					);
					continue;
				}
			}
			
			if (end - start < 2) continue;
			
			this.biomes.biome.renderSnake(
				ctx,
				this.chainBuffer,
				start,
				end,
				zones,
				hasHead ? this.headRender : this.offscreenHead,
				timeMS,
				this.cellSize
			);
		}
	}

	private splitChain(chain: SnakeChainPoint[], count: number): void {
		this.rangeCount = 0;
		let start = 0;
		
		for (let i = 1; i < count; i++) {
			const prev = chain[i - 1];
			const curr = chain[i];
			if (prev === undefined || curr === undefined) continue;
			
			const dx = curr.x - prev.x;
			const dy = curr.y - prev.y;
			const distance = Math.hypot(dx, dy);
			
			if (distance > this.cellSize * 2.5) {
				this.rangeCount = this.pushRange(this.rangeCount, start, i);
				start = i;
			}
		}
		
		this.rangeCount = this.pushRange(this.rangeCount, start, count);
	}

	private pushRange(index: number, start: number, end: number): number {
		if (end <= start) return index;
		
		if (index >= this.segmentRanges.length) {
			this.segmentRanges.push({ start: 0, end: 0 });
		}
		
		const range = this.segmentRanges[index];
		if (range !== undefined) {
			range.start = start;
			range.end = end;
		}
		
		return index + 1;
	}
}