import { Container, Graphics } from 'pixi.js';
import type { Direction } from '../components/index.js';
import type {
	BiomeManager,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from '../biomes/index.js';
import { getLevelTuning } from '../config/index.js';

export interface SnakeSegmentRender {
	col: number;
	row: number;
	bit: 0 | 1;
	order: number;
	active: boolean;
}

interface PathPoint {
	x: number;
	y: number;
}

const POINTS_PER_CELL = 10;

export class SnakeView {
	public readonly container: Container;
	private readonly graphics: Graphics;
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;

	private path: PathPoint[] = [];
	private currHeadCol = -1;
	private currHeadRow = -1;
	private fromX = 0;
	private fromY = 0;
	private toX = 0;
	private toY = 0;
	private lastStepTimeMS = -1;
	private headAngle = 0;
	private targetAngle = 0;
	private lastTimeMS = -1;
	private stepIntervalMS = 180;

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;
		this.container = new Container();
		this.graphics = new Graphics();
		this.container.addChild(this.graphics);
	}

	public setLevel(level: number): void {
		this.stepIntervalMS = getLevelTuning(level).stepIntervalMS;
	}

	public render(
		segments: SnakeSegmentRender[],
		headDir: Direction | undefined,
		nextDir: Direction | undefined,
		timeMS: number
	): void {
		this.graphics.clear();
		if (segments.length === 0) {
			this.reset();
			return;
		}
		const sorted = [...segments].sort((a, b) => a.order - b.order);
		const head = sorted[0];
		if (head === undefined) return;

		const dt =
			this.lastTimeMS < 0
				? 1 / 60
				: Math.min(50, timeMS - this.lastTimeMS) / 1000;
		this.lastTimeMS = timeMS;
		const cell = this.cellSize;

		const tx = head.col * cell + cell / 2;
		const ty = head.row * cell + cell / 2;

		const isFirstRender = this.path.length === 0 || this.currHeadCol < 0;
		const isTeleport =
			!isFirstRender &&
			Math.abs(head.col - this.currHeadCol) +
				Math.abs(head.row - this.currHeadRow) >
				2;
		const isNewStep =
			!isFirstRender &&
			!isTeleport &&
			(head.col !== this.currHeadCol || head.row !== this.currHeadRow);

		if (isFirstRender || isTeleport) {
			this.initPath(head.col, head.row, headDir, sorted.length);
		}

		let headX: number;
		let headY: number;
		if (this.lastStepTimeMS < 0) {
			headX = this.toX;
			headY = this.toY;
		} else {
			const elapsed = timeMS - this.lastStepTimeMS;
			const progress = Math.min(1, elapsed / this.stepIntervalMS);
			headX = this.fromX + (this.toX - this.fromX) * progress;
			headY = this.fromY + (this.toY - this.fromY) * progress;
		}

		if (isNewStep) {
			this.fromX = headX;
			this.fromY = headY;
			this.toX = tx;
			this.toY = ty;
			this.currHeadCol = head.col;
			this.currHeadRow = head.row;
			this.lastStepTimeMS = timeMS;
			headX = this.fromX;
			headY = this.fromY;
		}

		// --- Записываем позицию головы в путь КАЖДЫЙ КАДР ---
		this.path.push({ x: headX, y: headY });

		// Обрезаем путь по длине.
		const totalLen = sorted.length * cell;
		const maxPathLen = totalLen + cell * 2;
		let accLen = 0;
		for (let i = this.path.length - 1; i > 0; i--) {
			const a = this.path[i];
			const b = this.path[i - 1];
			if (a === undefined || b === undefined) break;
			accLen += Math.hypot(b.x - a.x, b.y - a.y);
			if (accLen > maxPathLen) {
				this.path = this.path.slice(i - 1);
				break;
			}
		}

		// === СГЛАЖИВАНИЕ ПУТИ ДЛЯ ПЛАВНЫХ ИЗГИБОВ ===
		// Голова движется по сетке «по рельсам», и в месте поворота
		// путь содержит острый угол. Мы сглаживаем точки ПОЗАДИ головы,
		// чтобы тело описывало плавную дугу вместо резкого угла.
		// Последние точки у головы не трогаем — голова остаётся точной.
		const SMOOTH_SKIP_HEAD = 2;
		for (let i = this.path.length - 1 - SMOOTH_SKIP_HEAD; i >= 1; i--) {
			const curr = this.path[i];
			const prev = this.path[i - 1];
			const next = this.path[i + 1];
			if (curr !== undefined && prev !== undefined && next !== undefined) {
				curr.x = curr.x * 0.7 + (prev.x + next.x) * 0.15;
				curr.y = curr.y * 0.7 + (prev.y + next.y) * 0.15;
			}
		}

		// ===== ОТЗЫВЧИВОСТЬ =====
		// Если в очереди есть следующее направление — голова начинает
		// визуально поворачивать НЕМЕДЛЕННО, не дожидаясь логического шага.
		const effectiveDir = nextDir ?? headDir;
		if (effectiveDir !== undefined) {
			this.targetAngle = this.dirAngle(effectiveDir);
		} else if (this.path.length > 1) {
			const last = this.path[this.path.length - 1];
			const prev = this.path[this.path.length - 2];
			if (last !== undefined && prev !== undefined) {
				const dx = last.x - prev.x;
				const dy = last.y - prev.y;
				if (Math.hypot(dx, dy) > 0.5) {
					this.targetAngle = Math.atan2(dy, dx);
				}
			}
		}

		let deltaAngle = this.targetAngle - this.headAngle;
		while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
		while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

		// Быстрый, но плавный доворот.
		const maxTurn = dt * 26;
		if (Math.abs(deltaAngle) < maxTurn) {
			this.headAngle = this.targetAngle;
		} else {
			this.headAngle += Math.sign(deltaAngle) * maxTurn;
		}
		while (this.headAngle > Math.PI) this.headAngle -= Math.PI * 2;
		while (this.headAngle < -Math.PI) this.headAngle += Math.PI * 2;

		// ===== Строим визуальную цепь =====
		const chainStep = cell / POINTS_PER_CELL;
		const t = timeMS * 0.001;
		const chain: SnakeChainPoint[] = [];
		for (let d = 0; d <= totalLen; d += chainStep) {
			let px: number;
			let py: number;
			let pAngle: number;
			if (d <= 0) {
				px = headX;
				py = headY;
				pAngle = this.headAngle;
			} else {
				const p = this.posAt(d);
				if (p === null) break;
				px = p.x;
				py = p.y;
				pAngle = p.angle;
			}
			const wave =
				Math.sin(d * 0.06 - t * 4) * 1.4 * Math.min(1, d / 40);
			const nx = -Math.sin(pAngle);
			const ny = Math.cos(pAngle);
			const x = px + nx * wave;
			const y = py + ny * wave;
			const zone = Math.min(sorted.length - 1, Math.floor(d / cell));
			chain.push({ x, y, angle: pAngle, d, zone });
		}
		if (chain.length < 2) return;

		const zones: SnakeZoneStyle[] = sorted.map((segment) => ({
			bit: segment.bit,
			active: segment.active
		}));
		const headRender: SnakeHeadRender = {
			x: headX,
			y: headY,
			angle: this.headAngle,
			moving: true
		};

		this.biomes.biome.renderSnake(
			this.graphics,
			chain,
			zones,
			headRender,
			timeMS,
			cell
		);
	}

	private posAt(
		dist: number
	): { x: number; y: number; angle: number } | null {
		const len = this.path.length;
		if (len === 0) return null;
		const last = this.path[len - 1];
		if (last === undefined) return null;
		if (dist <= 0) {
			const prev = len > 1 ? this.path[len - 2] : last;
			if (prev === undefined) return null;
			return {
				x: last.x,
				y: last.y,
				angle: Math.atan2(last.y - prev.y, last.x - prev.x)
			};
		}
		let accD = 0;
		for (let i = len - 1; i > 0; i--) {
			const a = this.path[i];
			const b = this.path[i - 1];
			if (a === undefined || b === undefined) break;
			const seg = Math.hypot(b.x - a.x, b.y - a.y);
			if (seg < 0.0001) continue;
			if (accD + seg >= dist) {
				const tt = (dist - accD) / seg;
				return {
					x: a.x + (b.x - a.x) * tt,
					y: a.y + (b.y - a.y) * tt,
					angle: Math.atan2(b.y - a.y, b.x - a.x)
				};
			}
			accD += seg;
		}
		const first = this.path[0];
		const second = len > 1 ? this.path[1] : first;
		if (first === undefined || second === undefined) return null;
		return {
			x: first.x,
			y: first.y,
			angle: Math.atan2(second.y - first.y, second.x - first.x)
		};
	}

	private initPath(
		headCol: number,
		headRow: number,
		headDir: Direction | undefined,
		segmentCount: number
	): void {
		this.path.length = 0;
		const cell = this.cellSize;
		const cx = headCol * cell + cell / 2;
		const cy = headRow * cell + cell / 2;
		const angle = this.dirAngle(headDir);
		const backX = -Math.cos(angle);
		const backY = -Math.sin(angle);
		const need = segmentCount * cell + cell * 2;
		const step = cell / POINTS_PER_CELL;
		const tempPath: PathPoint[] = [];
		for (let d = 0; d <= need; d += step) {
			tempPath.push({
				x: cx + backX * d,
				y: cy + backY * d
			});
		}
		this.path = tempPath.reverse();
		this.currHeadCol = headCol;
		this.currHeadRow = headRow;
		this.fromX = cx;
		this.fromY = cy;
		this.toX = cx;
		this.toY = cy;
		this.headAngle = angle;
		this.targetAngle = angle;
		this.lastStepTimeMS = -1;
	}

	private reset(): void {
		this.path.length = 0;
		this.currHeadCol = -1;
		this.currHeadRow = -1;
		this.fromX = 0;
		this.fromY = 0;
		this.toX = 0;
		this.toY = 0;
		this.headAngle = 0;
		this.targetAngle = 0;
		this.lastStepTimeMS = -1;
		this.lastTimeMS = -1;
	}

	private dirAngle(dir: Direction | undefined): number {
		if (dir === 'UP') return -Math.PI / 2;
		if (dir === 'DOWN') return Math.PI / 2;
		if (dir === 'LEFT') return Math.PI;
		return 0;
	}
}