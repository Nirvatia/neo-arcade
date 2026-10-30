import type { GridMatrix } from '../../config/gridConfig';
import { makeCanvas, canvasContext } from '../common/textures';
import { ARCADE_COLORS, ARCADE_TILE } from './arcadeSprites';

/**
 * The maze baked once at native resolution: wall blocks with rounded corners, a bright
 * neon line inside their edge and a dim one outside it, the lair door a pink bar.
 * `flash` gives the white variant the level clear blinks to.
 */
export class ArcadeMaze {
	readonly width: number;
	readonly height: number;
	private readonly normal: HTMLCanvasElement;
	private readonly white: HTMLCanvasElement;

	constructor(grid: GridMatrix) {
		const T = ARCADE_TILE;
		const rows = grid.length;
		const cols = grid[0]?.length ?? 0;
		this.width = cols * T;
		this.height = rows * T;
		const wall = (x: number, y: number): boolean => {
			const tx = Math.floor(x / T);
			const ty = Math.floor(y / T);
			return grid[ty]?.[tx] === 'WL';
		};
		// distance from each wall pixel to the nearest pixel outside the walls (capped)
		const R = 5;
		const dist = new Float32Array(this.width * this.height).fill(-1);
		for (let y = 0; y < this.height; y += 1) {
			for (let x = 0; x < this.width; x += 1) {
				if (!wall(x, y)) {
					continue;
				}
				let best = R + 1;
				for (let dy = -R; dy <= R; dy += 1) {
					for (let dx = -R; dx <= R; dx += 1) {
						const px = x + dx;
						const py = y + dy;
						const inside = px >= 0 && py >= 0 && px < this.width && py < this.height;
						// beyond the board counts as a wall, so the outer rim has no line
						if (inside && !wall(px, py)) {
							best = Math.min(best, Math.hypot(dx, dy));
						}
					}
				}
				dist[y * this.width + x] = best;
			}
		}
		this.normal = this.bake(grid, dist, ARCADE_COLORS.wallBright, ARCADE_COLORS.wallDim);
		this.white = this.bake(grid, dist, '#ffffff', '#8a8aa8');
	}

	draw(ctx: CanvasRenderingContext2D, flash: boolean): void {
		ctx.drawImage(flash ? this.white : this.normal, 0, 0);
	}

	private bake(
		grid: GridMatrix,
		dist: Float32Array,
		bright: string,
		dim: string
	): HTMLCanvasElement {
		const T = ARCADE_TILE;
		const canvas = makeCanvas(this.width, this.height);
		const ctx = canvasContext(canvas);
		for (let y = 0; y < this.height; y += 1) {
			for (let x = 0; x < this.width; x += 1) {
				const d = dist[y * this.width + x];
				let color: string | null = null;
				if (d < 0) {
					continue;
				} else if (d >= 1 && d < 1.9) {
					color = dim;
				} else if (d >= 3 && d < 4) {
					color = bright;
				} else if (d >= 4) {
					color = ARCADE_COLORS.wallFill;
				}
				if (color) {
					ctx.fillStyle = color;
					ctx.fillRect(x, y, 1, 1);
				}
			}
		}
		ctx.fillStyle = ARCADE_COLORS.door;
		grid.forEach((row, ty) =>
			row.forEach((token, tx) => {
				if (token === 'LE') {
					ctx.fillRect(tx * T, ty * T + T / 2 - 1, T, 2);
				}
			})
		);
		return canvas;
	}
}
