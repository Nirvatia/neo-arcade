import type { GridService } from '../../logic/maze/GridService';
import type { LevelProgress } from '../../logic/level/LevelProgress';
import type { SeasonPalette } from '../../logic/level/SeasonCatalog';
import { mazeColorsFor } from '../contracts/MazePalette';
import { isTeleportToken } from '../../config/gridConfig';
import type { SeasonRenderBundle } from '../contracts/SeasonRenderBundle';

export interface GridLayout {
	readonly tileSize: number;
	readonly offsetX: number;
	readonly offsetY: number;
}

export class GridView {
	computeLayout(grid: GridService, width: number, height: number, mazeScale: number): GridLayout {
		if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
			return { tileSize: 1, offsetX: 0, offsetY: 0 };
		}

		if (!(grid.width > 0) || !(grid.height > 0)) {
			console.error('GridView.computeLayout', 'invalid grid size');
			return { tileSize: 1, offsetX: 0, offsetY: 0 };
		}

		const safeScale = Number.isFinite(mazeScale) && mazeScale > 0 ? mazeScale : 1;
		const baseTile = Math.min(width / grid.width, height / grid.height);
		const tileSize = Math.max(1, Math.floor(baseTile * safeScale));
		const offsetX = Math.max(0, Math.floor((width - tileSize * grid.width) / 2));
		const offsetY = Math.max(0, Math.floor((height - tileSize * grid.height) / 2));

		return { tileSize, offsetX, offsetY };
	}

	draw(
		ctx: CanvasRenderingContext2D,
		grid: GridService,
		progress: LevelProgress,
		width: number,
		height: number,
		palette: SeasonPalette,
		dayNightRatio: number,
		bundle: SeasonRenderBundle,
		time: number,
		mazeScale: number = 1
	): GridLayout {
		const layout = this.computeLayout(grid, width, height, mazeScale);

		if (!(layout.tileSize > 0)) {
			return layout;
		}

		const ratio = Math.min(1, Math.max(0, Number.isFinite(dayNightRatio) ? dayNightRatio : 0));
		const colors = mazeColorsFor(palette, ratio);
		const safeTime = Number.isFinite(time) && time >= 0 ? time : 0;
		const tileSize = layout.tileSize;

		for (let y = 0; y < grid.height; y += 1) {
			for (let x = 0; x < grid.width; x += 1) {
				const tile = grid.tileAt(x, y);
				const px = layout.offsetX + x * tileSize;
				const py = layout.offsetY + y * tileSize;
				const cx = px + tileSize / 2;
				const cy = py + tileSize / 2;

				if (tile === 'WL') {
					bundle.maze.drawWall(ctx, px, py, tileSize, colors, x, y);
					continue;
				}

				bundle.maze.drawFloor(ctx, px, py, tileSize, colors, x, y);

				if (isTeleportToken(tile)) {
					bundle.teleport.draw(ctx, cx, cy, tileSize, tile);
					continue;
				}

				switch (tile) {
					case 'DT':
						if (!progress.isCollected(x, y)) {
							bundle.pellet.draw(ctx, cx, cy, tileSize, colors, x, y);
						}
						break;
					case 'EU':
						if (!progress.isCollected(x, y)) {
							bundle.energizer.draw(ctx, cx, cy, tileSize, colors, safeTime, x, y);
						}
						break;
					case 'LE':
						bundle.maze.drawGate(ctx, px, py, tileSize, colors, x, y);
						break;
					case 'LT':
						bundle.maze.drawLairFloor(ctx, px, py, tileSize, colors, x, y);
						break;
					case 'PM':
						bundle.maze.drawPlayerSpawn(ctx, px, py, tileSize, colors, x, y);
						break;
					case 'BY':
					case 'PY':
					case 'IY':
					case 'CE':
						bundle.maze.drawGhostSpawn(ctx, px, py, tileSize, tile, colors, x, y);
						break;
					default:
						break;
				}
			}
		}

		return layout;
	}
}
