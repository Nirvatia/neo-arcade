import type { GridMatrix } from '../../config/gridConfig';
import { hexChannels } from '../common/textures';

export interface DoomLightSource {
	/** Tile-center coordinates. */
	readonly x: number;
	readonly y: number;
	/** Reach in tiles, measured along walkable paths. */
	readonly r: number;
	readonly tint: number;
	readonly a: number;
}

const WALL_BOUNCE = 0.7;

/**
 * One pixel per tile. Light travels along corridors (path distance, not straight line), so
 * it fills the corridor you stand in, leaks round corners and never shines through walls.
 * Wall tiles take a share of the light of the floor next to them so their faces glow.
 * Alpha is brightness (used to cut the night shade), RGB is the tinted light.
 */
export class DoomLightmap {
	private readonly rows: number;
	private readonly cols: number;
	private readonly open: Uint8Array;
	private readonly rgb: Float32Array;
	private readonly dist: Int16Array;
	private readonly queue: Int32Array;
	private readonly canvas: HTMLCanvasElement;
	private readonly image: ImageData;

	constructor(S: GridMatrix) {
		this.rows = S.length;
		this.cols = S[0].length;
		const n = this.rows * this.cols;
		this.open = new Uint8Array(n);
		for (let y = 0; y < this.rows; y += 1) {
			for (let x = 0; x < this.cols; x += 1) {
				const t = S[y][x];
				this.open[y * this.cols + x] = t !== 'WL' && t !== 'ES' ? 1 : 0;
			}
		}
		this.rgb = new Float32Array(n * 3);
		this.dist = new Int16Array(n);
		this.queue = new Int32Array(n);
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.cols;
		this.canvas.height = this.rows;
		const ctx = this.canvas.getContext('2d');
		if (!ctx) {
			throw new Error('DoomLightmap: 2d context unavailable');
		}
		this.image = ctx.createImageData(this.cols, this.rows);
	}

	compute(sources: readonly DoomLightSource[]): HTMLCanvasElement {
		const { cols, rows, open, rgb, dist, queue } = this;
		rgb.fill(0);
		for (const source of sources) {
			const sx = Math.floor(source.x);
			const sy = Math.floor(source.y);
			if (sx < 0 || sy < 0 || sx >= cols || sy >= rows || !open[sy * cols + sx] || source.r <= 0) {
				continue;
			}
			const [tr, tg, tb] = hexChannels(source.tint);
			const reach = Math.ceil(source.r);
			dist.fill(-1);
			let head = 0;
			let tail = 0;
			const start = sy * cols + sx;
			dist[start] = 0;
			queue[tail++] = start;
			while (head < tail) {
				const i = queue[head++];
				const d = dist[i];
				const x = i % cols;
				const y = (i - x) / cols;
				// sub-tile offset keeps a moving light smooth between tiles
				const ex = Math.hypot(x + 0.5 - source.x, y + 0.5 - source.y);
				// a bright plateau near the source, then a linear fade to the end of the reach
				const k = Math.max(0, 1 - Math.max(d, ex) / source.r);
				const f = Math.min(1, k * 1.8) * source.a;
				rgb[i * 3] += (tr / 255) * f;
				rgb[i * 3 + 1] += (tg / 255) * f;
				rgb[i * 3 + 2] += (tb / 255) * f;
				if (d >= reach) {
					continue;
				}
				const neighbours = [x > 0 ? i - 1 : -1, x < cols - 1 ? i + 1 : -1, i - cols, i + cols];
				for (const j of neighbours) {
					if (j >= 0 && j < cols * rows && open[j] && dist[j] < 0) {
						dist[j] = d + 1;
						queue[tail++] = j;
					}
				}
			}
		}
		const data = this.image.data;
		for (let i = 0; i < cols * rows; i += 1) {
			let r = rgb[i * 3];
			let g = rgb[i * 3 + 1];
			let b = rgb[i * 3 + 2];
			if (!open[i]) {
				// walls glow with the brightest floor next to them
				const x = i % cols;
				r = g = b = 0;
				for (const j of [x > 0 ? i - 1 : -1, x < cols - 1 ? i + 1 : -1, i - cols, i + cols]) {
					if (j >= 0 && j < cols * rows && open[j]) {
						r = Math.max(r, rgb[j * 3] * WALL_BOUNCE);
						g = Math.max(g, rgb[j * 3 + 1] * WALL_BOUNCE);
						b = Math.max(b, rgb[j * 3 + 2] * WALL_BOUNCE);
					}
				}
			}
			const level = Math.min(1, Math.max(r, g, b));
			const norm = level > 0 ? 1 / Math.max(r, g, b, 1e-6) : 0;
			data[i * 4] = Math.round(Math.min(1, r * norm) * 255);
			data[i * 4 + 1] = Math.round(Math.min(1, g * norm) * 255);
			data[i * 4 + 2] = Math.round(Math.min(1, b * norm) * 255);
			data[i * 4 + 3] = Math.round(level * 255);
		}
		const ctx = this.canvas.getContext('2d');
		ctx?.putImageData(this.image, 0, 0);
		return this.canvas;
	}
}
