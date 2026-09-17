import { Container, Graphics } from 'pixi.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import { Palette } from './Palette.js';

const WALL_INSET = 1;
const STRIPE_STEP = 7;

export class GridView {
	public readonly container: Container;
	private readonly backgroundGraphics: Graphics;
	private readonly wallGraphics: Graphics;
	private readonly exitGraphics: Graphics;
	private readonly cellSize: number;

	constructor(cellSize: number) {
		this.cellSize = cellSize;
		this.container = new Container();
		this.backgroundGraphics = new Graphics();
		this.wallGraphics = new Graphics();
		this.exitGraphics = new Graphics();
		this.container.addChild(this.backgroundGraphics);
		this.container.addChild(this.wallGraphics);
		this.container.addChild(this.exitGraphics);
	}

	public renderBackground(grid: GridBitmask): void {
		this.backgroundGraphics.clear();
		const width = grid.cols * this.cellSize;
		const height = grid.rows * this.cellSize;
		this.backgroundGraphics.rect(0, 0, width, height);
		this.backgroundGraphics.fill(Palette.bg);
		for (let col = 0; col <= grid.cols; col++) {
			this.backgroundGraphics.rect(col * this.cellSize, 0, 1, height);
		}
		for (let row = 0; row <= grid.rows; row++) {
			this.backgroundGraphics.rect(0, row * this.cellSize, width, 1);
		}
		this.backgroundGraphics.fill(Palette.grid);
	}

	public renderWalls(grid: GridBitmask): void {
		this.wallGraphics.clear();
		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				if (!grid.isWall(col, row)) {
					continue;
				}
				const x = col * this.cellSize + WALL_INSET;
				const y = row * this.cellSize + WALL_INSET;
				const size = this.cellSize - WALL_INSET * 2;
				// База: имитация вертикального градиента двумя половинами.
				this.wallGraphics.rect(x, y, size, size);
				this.wallGraphics.fill(Palette.wallTop);
				this.wallGraphics.rect(x, y + size / 2, size, size / 2);
				this.wallGraphics.fill(Palette.wallBottom);
				// Диагональные полосы.
				for (let k = -size + 2; k < size; k += STRIPE_STEP) {
					const t0 = Math.max(0, -k);
					const t1 = Math.min(size, size - k);
					if (t1 - t0 < 1) {
						continue;
					}
					this.wallGraphics.moveTo(x + t0 + k, y + t0);
					this.wallGraphics.lineTo(x + t1 + k, y + t1);
				}
				this.wallGraphics.stroke({ color: 0xffffff, width: 2, alpha: 0.03 });
				// Фаска.
				this.wallGraphics.rect(x, y, size, 1);
				this.wallGraphics.fill({ color: Palette.wallBevel, alpha: 0.25 });
				this.wallGraphics.rect(x, y + size - 1, size, 1);
				this.wallGraphics.fill({ color: 0x000000, alpha: 0.6 });
			}
		}
	}

	public renderExit(grid: GridBitmask, timeMS: number): void {
		this.exitGraphics.clear();
		const pulse = Math.sin(timeMS * 0.005) * 0.5 + 0.5;
		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				if (!grid.isExit(col, row)) {
					continue;
				}
				const x = col * this.cellSize;
				const y = row * this.cellSize;
				const s = this.cellSize;
				this.exitGraphics.roundRect(x + 1, y + 1, s - 2, s - 2, 3);
				this.exitGraphics.stroke({
					color: Palette.green,
					width: 2,
					alpha: 0.15 + pulse * 0.2
				});
				this.exitGraphics.roundRect(x + 2, y + 2, s - 4, s - 4, 3);
				this.exitGraphics.fill({ color: Palette.green, alpha: 0.07 });
				// Дверь, открытая вправо.
				this.exitGraphics.moveTo(x + 11, y + 4);
				this.exitGraphics.lineTo(x + 2, y + 4);
				this.exitGraphics.lineTo(x + 2, y + 22);
				this.exitGraphics.lineTo(x + 11, y + 22);
				this.exitGraphics.stroke({ color: Palette.green, width: 2 });
				// Стрелка наружу.
				this.exitGraphics.rect(x + 7, y + 12, 11, 2);
				this.exitGraphics.fill(Palette.green);
				this.exitGraphics.poly([x + 18, y + 8, x + 24, y + 13, x + 18, y + 18]);
				this.exitGraphics.fill(Palette.green);
			}
		}
	}
}
