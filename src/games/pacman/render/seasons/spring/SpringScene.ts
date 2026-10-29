import type { SceneView, RenderBoard } from '../../contracts/SeasonRenderBundle';
import { seededRandom } from '../../common/random';

interface SpringDecor {
	readonly kind: 'tree' | 'bush' | 'flower';
	readonly x: number;
	readonly y: number;
	readonly radius: number;
}

export class SpringScene implements SceneView {
	private cache: HTMLCanvasElement | null = null;
	private cacheKey = '';

	draw(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		seed: number,
		board: RenderBoard | null
	): void {
		if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
			console.error('SpringScene.draw', 'invalid viewport', { width, height });
			return;
		}

		const w = Math.floor(width);
		const h = Math.floor(height);
		const safeSeed = Number.isFinite(seed) && seed >= 0 ? Math.floor(seed) : 0;
		const boardKey = board
			? `${Math.round(board.x)}:${Math.round(board.y)}:${Math.round(board.width)}:${Math.round(board.height)}`
			: 'none';
		const key = `${w}:${h}:${safeSeed}:${boardKey}`;

		if (!this.cache || this.cacheKey !== key) {
			this.cache = this.bake(w, h, safeSeed, board);
			this.cacheKey = key;
		}

		if (this.cache) {
			ctx.drawImage(this.cache, 0, 0, w, h);
		}
	}

	private bake(
		width: number,
		height: number,
		seed: number,
		board: RenderBoard | null
	): HTMLCanvasElement {
		if (typeof document === 'undefined') {
			console.error('SpringScene.bake', 'document is unavailable');
			throw new Error('SpringScene.bake: document is unavailable');
		}

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			console.error('SpringScene.bake', '2d context unavailable');
			return canvas;
		}

		const random = seededRandom(seed + 29);

		ctx.fillStyle = '#cfe8c6';
		ctx.fillRect(0, 0, width, height);

		const base = ctx.createRadialGradient(
			width / 2,
			height / 2,
			0,
			width / 2,
			height / 2,
			Math.max(1, Math.max(width, height) * 0.75)
		);
		base.addColorStop(0, '#f4fbef');
		base.addColorStop(1, '#cfe8c6');
		ctx.fillStyle = base;
		ctx.fillRect(0, 0, width, height);

		const patches = Math.min(70, Math.max(10, Math.floor((width * height) / 45000)));

		for (let i = 0; i < patches; i += 1) {
			const x = random() * width;
			const y = random() * height;
			const radius = 50 + random() * 90;
			const tint = random();
			const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

			if (tint < 0.35) {
				gradient.addColorStop(0, 'rgba(255,220,240,.22)');
			} else if (tint < 0.7) {
				gradient.addColorStop(0, 'rgba(214,255,214,.25)');
			} else {
				gradient.addColorStop(0, 'rgba(255,255,255,.25)');
			}

			gradient.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = gradient;
			ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
		}

		const strokes = Math.min(1200, Math.max(40, Math.floor((width * height) / 1200)));

		for (let i = 0; i < strokes; i += 1) {
			const x = random() * width;
			const y = random() * height;
			const variant = random();

			if (variant < 0.4) {
				ctx.strokeStyle = '#8fae72';
			} else if (variant < 0.75) {
				ctx.strokeStyle = '#6f8d55';
			} else {
				ctx.strokeStyle = '#cfe8b8';
			}

			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + (random() - 0.5) * 5, y - 4 - random() * 5);
			ctx.stroke();
		}

		const flowers = Math.min(500, Math.max(20, Math.floor((width * height) / 5000)));

		for (let i = 0; i < flowers; i += 1) {
			const x = random() * width;
			const y = random() * height;
			const variant = random();

			if (variant < 0.35) {
				ctx.fillStyle = 'rgba(255,215,234,.8)';
			} else if (variant < 0.7) {
				ctx.fillStyle = 'rgba(255,244,249,.8)';
			} else {
				ctx.fillStyle = 'rgba(255,233,168,.7)';
			}

			ctx.beginPath();
			ctx.arc(x, y, 1 + random() * 1.8, 0, Math.PI * 2);
			ctx.fill();
		}

		const decor = this.makeDecor(width, height, board, random);

		for (const item of decor) {
			if (item.kind === 'tree') {
				this.drawTree(ctx, item, random);
			} else if (item.kind === 'bush') {
				this.drawBush(ctx, item, random);
			} else {
				this.drawFlowers(ctx, item, random);
			}
		}

		return canvas;
	}

	private makeDecor(
		width: number,
		height: number,
		board: RenderBoard | null,
		random: () => number
	): SpringDecor[] {
		const items: SpringDecor[] = [];
		const count = Math.min(42, Math.max(10, Math.floor((width * height) / 36000)));
		const margin = 40;
		let attempts = 0;

		while (items.length < count && attempts < count * 8) {
			attempts += 1;
			const x = random() * width;
			const y = random() * height;

			if (x < margin || y < margin || x > width - margin || y > height - margin) {
				continue;
			}

			if (
				board &&
				x > board.x - margin &&
				x < board.x + board.width + margin &&
				y > board.y - margin &&
				y < board.y + board.height + margin
			) {
				continue;
			}

			const roll = random();
			items.push({
				kind: roll < 0.45 ? 'tree' : roll < 0.72 ? 'bush' : 'flower',
				x,
				y,
				radius: (0.65 + random() * 1.05) * 26
			});
		}

		return items.sort((a, b) => a.y - b.y);
	}

	private drawTree(ctx: CanvasRenderingContext2D, item: SpringDecor, random: () => number): void {
		const radius = item.radius;

		ctx.fillStyle = 'rgba(55,95,55,.28)';
		ctx.beginPath();
		ctx.ellipse(
			item.x + radius * 0.28,
			item.y + radius * 0.36,
			radius * 1.15,
			radius * 0.82,
			0,
			0,
			Math.PI * 2
		);
		ctx.fill();

		const palette =
			random() < 0.5 ? ['#fff4f9', '#ffd7ea', '#8fb57a'] : ['#ffffff', '#e8f8dc', '#6f9d5f'];

		for (let i = 0; i < 9; i += 1) {
			const angle = i * 0.7;
			const distance = i === 0 ? 0 : radius * (0.3 + random() * 0.5);
			const px = item.x + Math.cos(angle) * distance;
			const py = item.y + Math.sin(angle) * distance;
			const blobRadius = radius * (0.35 + random() * 0.22);
			const gradient = ctx.createRadialGradient(
				px - blobRadius * 0.35,
				py - blobRadius * 0.35,
				1,
				px,
				py,
				blobRadius
			);

			gradient.addColorStop(0, palette[0] ?? '#ffffff');
			gradient.addColorStop(0.55, palette[1] ?? '#ffd7ea');
			gradient.addColorStop(1, palette[2] ?? '#8fb57a');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(px, py, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawBush(ctx: CanvasRenderingContext2D, item: SpringDecor, random: () => number): void {
		const radius = item.radius * 0.8;

		ctx.fillStyle = 'rgba(60,95,60,.25)';
		ctx.beginPath();
		ctx.ellipse(item.x + 2, item.y + 4, radius, radius * 0.7, 0, 0, Math.PI * 2);
		ctx.fill();

		for (let i = 0; i < 4; i += 1) {
			const px = item.x + (random() - 0.5) * radius;
			const py = item.y + (random() - 0.5) * radius * 0.7;
			const blobRadius = radius * (0.45 + random() * 0.2);
			const gradient = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, blobRadius);
			gradient.addColorStop(0, '#ffffff');
			gradient.addColorStop(1, '#9fd08a');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(px, py, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawFlowers(
		ctx: CanvasRenderingContext2D,
		item: SpringDecor,
		random: () => number
	): void {
		const cluster = item.radius * 0.7;
		const count = 4 + Math.floor(random() * 4);

		for (let i = 0; i < count; i += 1) {
			const px = item.x + (random() - 0.5) * cluster;
			const py = item.y + (random() - 0.5) * cluster;
			const petalRadius = 2 + random() * 2.5;
			const color = random() < 0.5 ? '#ffd7ea' : '#fff4f9';

			for (let k = 0; k < 5; k += 1) {
				const angle = k * 1.2566;
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(
					px + Math.cos(angle) * petalRadius,
					py + Math.sin(angle) * petalRadius,
					petalRadius * 0.8,
					0,
					Math.PI * 2
				);
				ctx.fill();
			}

			ctx.fillStyle = '#ffe9a8';
			ctx.beginPath();
			ctx.arc(px, py, petalRadius * 0.45, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}
