import type { SceneView, RenderBoard } from '../../contracts/SeasonRenderBundle';
import { seededRandom } from '../../common/random';

interface SceneDecor {
	readonly kind: 'tree' | 'rock' | 'bush';
	readonly x: number;
	readonly y: number;
	readonly radius: number;
	readonly seed: number;
}

export class WinterScene implements SceneView {
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
			console.error('WinterScene.draw', 'invalid viewport', { width, height });
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
			console.error('WinterScene.bake', 'document is unavailable');
			throw new Error('WinterScene.bake: document is unavailable');
		}

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			console.error('WinterScene.bake', '2d context unavailable');
			return canvas;
		}

		const random = seededRandom(seed + 17);
		ctx.fillStyle = '#c9d8e8';
		ctx.fillRect(0, 0, width, height);

		const gradient = ctx.createRadialGradient(
			width / 2,
			height / 2,
			0,
			width / 2,
			height / 2,
			Math.max(width, height) * 0.75
		);
		gradient.addColorStop(0, '#f2f7fc');
		gradient.addColorStop(1, '#c9d8e8');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		for (let i = 0; i < Math.min(80, (width * height) / 40000); i += 1) {
			const x = random() * width;
			const y = random() * height;
			const radius = 60 + random() * 90;
			const blob = ctx.createRadialGradient(x, y, 0, x, y, radius);
			blob.addColorStop(0, i % 2 === 0 ? 'rgba(255,255,255,.4)' : 'rgba(90,120,170,.06)');
			blob.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = blob;
			ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
		}

		for (let i = 0; i < Math.min(1400, (width * height) / 1100); i += 1) {
			const x = random() * width;
			const y = random() * height;
			ctx.strokeStyle = ['#9aa88888', '#b8c0a466', '#6f7f6688', '#ffffff44'][
				Math.floor(random() * 4)
			];
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + (random() - 0.5) * 4, y - 3 - random() * 4);
			ctx.stroke();
		}

		this.drawStream(ctx, width, height, board);

		const decor = this.makeDecor(width, height, board, random);

		for (const item of decor) {
			if (item.kind === 'tree') {
				this.drawTree(ctx, item, random);
			} else if (item.kind === 'rock') {
				this.drawRock(ctx, item);
			} else {
				this.drawBush(ctx, item, random);
			}
		}

		return canvas;
	}

	private drawStream(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		board: RenderBoard | null
	): void {
		const centerY = board ? board.y + board.height / 2 : height / 2;
		const amplitude = board ? board.height * 0.045 : height * 0.03;
		const wave = (x: number): number => centerY + Math.sin(x / (width * 0.22)) * amplitude;

		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		const passes: readonly (readonly [number, string])[] = [
			[34, 'rgba(70,95,130,.35)'],
			[27, '#dbe9f3'],
			[22, '#b4d6e8'],
			[10, 'rgba(150,200,225,.6)']
		];

		for (const [lineWidth, color] of passes) {
			ctx.lineWidth = lineWidth;
			ctx.strokeStyle = color;
			ctx.beginPath();

			for (let x = -20; x <= width + 20; x += 10) {
				if (x === -20) {
					ctx.moveTo(x, wave(x));
				} else {
					ctx.lineTo(x, wave(x));
				}
			}

			ctx.stroke();
		}

		ctx.strokeStyle = 'rgba(255,255,255,.4)';
		ctx.lineWidth = 1;

		for (let x = 0; x < width; x += 18) {
			const y = wave(x) + Math.sin(x) * 6;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + 8, y);
			ctx.stroke();
		}
	}

	private makeDecor(
		width: number,
		height: number,
		board: RenderBoard | null,
		random: () => number
	): SceneDecor[] {
		const items: SceneDecor[] = [];
		const count = Math.min(48, Math.max(12, Math.floor((width * height) / 32000)));
		const margin = 42;

		for (let i = 0; i < count * 6 && items.length < count; i += 1) {
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
				kind: roll < 0.5 ? 'tree' : roll < 0.75 ? 'rock' : 'bush',
				x,
				y,
				radius: (0.7 + random() * 1.1) * 24,
				seed: Math.floor(random() * 100000)
			});
		}

		return items.sort((a, b) => a.y - b.y);
	}

	private drawTree(ctx: CanvasRenderingContext2D, item: SceneDecor, random: () => number): void {
		const { x, y, radius } = item;
		ctx.fillStyle = 'rgba(55,75,115,.3)';
		ctx.beginPath();
		ctx.ellipse(
			x + radius * 0.3,
			y + radius * 0.35,
			radius * 1.15,
			radius * 0.8,
			0,
			0,
			Math.PI * 2
		);
		ctx.fill();

		const palette =
			random() < 0.45 ? ['#ffffff', '#9fbfae', '#3b6a58'] : ['#f4f9fd', '#b4c8d8', '#5a7a8e'];

		for (let i = 0; i < 8; i += 1) {
			const angle = i * 0.8;
			const distance = i === 0 ? 0 : radius * (0.3 + random() * 0.45);
			const px = x + Math.cos(angle) * distance;
			const py = y + Math.sin(angle) * distance;
			const blobRadius = radius * (0.35 + random() * 0.2);
			const gradient = ctx.createRadialGradient(
				px - blobRadius * 0.35,
				py - blobRadius * 0.35,
				1,
				px,
				py,
				blobRadius
			);
			gradient.addColorStop(0, palette[0]);
			gradient.addColorStop(0.55, palette[1]);
			gradient.addColorStop(1, palette[2]);
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(px, py, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawRock(ctx: CanvasRenderingContext2D, item: SceneDecor): void {
		const { x, y, radius } = item;
		ctx.fillStyle = 'rgba(50,70,110,.35)';
		ctx.beginPath();
		ctx.ellipse(x + 3, y + 5, radius * 1.1, radius * 0.7, 0, 0, Math.PI * 2);
		ctx.fill();

		const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
		gradient.addColorStop(0, '#b9c4d0');
		gradient.addColorStop(1, '#6f7d8d');
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.ellipse(x, y, radius, radius * 0.75, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.ellipse(
			x - radius * 0.3,
			y - radius * 0.35,
			radius * 0.6,
			radius * 0.28,
			0,
			0,
			Math.PI * 2
		);
		ctx.fill();
	}

	private drawBush(ctx: CanvasRenderingContext2D, item: SceneDecor, random: () => number): void {
		const { x, y, radius } = item;
		ctx.fillStyle = 'rgba(55,75,115,.25)';
		ctx.beginPath();
		ctx.ellipse(x + 2, y + 4, radius, radius * 0.7, 0, 0, Math.PI * 2);
		ctx.fill();

		for (let i = 0; i < 4; i += 1) {
			const px = x + (random() - 0.5) * radius;
			const py = y + (random() - 0.5) * radius * 0.7;
			const blobRadius = radius * (0.45 + random() * 0.2);
			const gradient = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, blobRadius);
			gradient.addColorStop(0, '#ffffff');
			gradient.addColorStop(1, '#a9bfd6');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(px, py, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}
