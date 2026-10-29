import type { SceneView, RenderBoard } from '../../contracts/SeasonRenderBundle';

interface SummerDecor {
	readonly kind: 'sunflower' | 'bush' | 'rock';
	readonly x: number;
	readonly y: number;
	readonly radius: number;
}

export class SummerScene implements SceneView {
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
			console.error('SummerScene.draw', 'invalid viewport', { width, height });
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
			console.error('SummerScene.bake', 'document is unavailable');
			throw new Error('SummerScene.bake: document is unavailable');
		}

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			console.error('SummerScene.bake', '2d context unavailable');
			return canvas;
		}

		const random = makeRandom(seed + 41);

		ctx.fillStyle = '#e8cf8f';
		ctx.fillRect(0, 0, width, height);

		const base = ctx.createRadialGradient(
			width / 2,
			height / 2,
			0,
			width / 2,
			height / 2,
			Math.max(1, Math.max(width, height) * 0.75)
		);
		base.addColorStop(0, '#fff6d0');
		base.addColorStop(1, '#e3c878');
		ctx.fillStyle = base;
		ctx.fillRect(0, 0, width, height);

		const patches = Math.min(70, Math.max(10, Math.floor((width * height) / 45000)));

		for (let i = 0; i < patches; i += 1) {
			const x = random() * width;
			const y = random() * height;
			const radius = 50 + random() * 90;
			const tint = random();
			const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

			if (tint < 0.4) {
				gradient.addColorStop(0, 'rgba(255,236,170,.26)');
			} else if (tint < 0.75) {
				gradient.addColorStop(0, 'rgba(190,205,110,.22)');
			} else {
				gradient.addColorStop(0, 'rgba(255,255,255,.22)');
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

			if (variant < 0.45) {
				ctx.strokeStyle = '#b99a45';
			} else if (variant < 0.8) {
				ctx.strokeStyle = '#8f9c4e';
			} else {
				ctx.strokeStyle = '#fff2bf';
			}

			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + (random() - 0.5) * 5, y - 4 - random() * 6);
			ctx.stroke();
		}

		const flowers = Math.min(420, Math.max(20, Math.floor((width * height) / 6000)));

		for (let i = 0; i < flowers; i += 1) {
			const x = random() * width;
			const y = random() * height;
			const variant = random();

			if (variant < 0.45) {
				ctx.fillStyle = 'rgba(255,207,77,.75)';
			} else if (variant < 0.75) {
				ctx.fillStyle = 'rgba(255,120,80,.65)';
			} else {
				ctx.fillStyle = 'rgba(255,250,220,.7)';
			}

			ctx.beginPath();
			ctx.arc(x, y, 1 + random() * 1.8, 0, Math.PI * 2);
			ctx.fill();
		}

		const decor = this.makeDecor(width, height, board, random);

		for (const item of decor) {
			if (item.kind === 'sunflower') {
				this.drawSunflower(ctx, item, random);
			} else if (item.kind === 'bush') {
				this.drawBush(ctx, item, random);
			} else {
				this.drawRock(ctx, item);
			}
		}

		return canvas;
	}

	private makeDecor(
		width: number,
		height: number,
		board: RenderBoard | null,
		random: () => number
	): SummerDecor[] {
		const items: SummerDecor[] = [];
		const count = Math.min(40, Math.max(10, Math.floor((width * height) / 38000)));
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
			const kind: SummerDecor['kind'] = roll < 0.45 ? 'sunflower' : roll < 0.72 ? 'bush' : 'rock';

			items.push({
				kind,
				x,
				y,
				radius: (0.65 + random() * 1.05) * 26
			});
		}

		return items.sort((a, b) => a.y - b.y);
	}

	private drawSunflower(
		ctx: CanvasRenderingContext2D,
		item: SummerDecor,
		random: () => number
	): void {
		const radius = item.radius;

		ctx.fillStyle = 'rgba(80,60,20,.25)';
		ctx.beginPath();
		ctx.ellipse(
			item.x + radius * 0.25,
			item.y + radius * 0.35,
			radius * 1.1,
			radius * 0.8,
			0,
			0,
			Math.PI * 2
		);
		ctx.fill();

		for (let i = 0; i < 10; i += 1) {
			const angle = i * ((Math.PI * 2) / 10) + random() * 0.18;
			const px = item.x + Math.cos(angle) * radius * 0.65;
			const py = item.y + Math.sin(angle) * radius * 0.65;

			ctx.fillStyle = i % 2 === 0 ? '#ffd34d' : '#ffbf2e';
			ctx.save();
			ctx.translate(px, py);
			ctx.rotate(angle);
			ctx.beginPath();
			ctx.ellipse(0, 0, radius * 0.38, radius * 0.18, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		const center = ctx.createRadialGradient(
			item.x - radius * 0.12,
			item.y - radius * 0.12,
			1,
			item.x,
			item.y,
			radius * 0.42
		);
		center.addColorStop(0, '#8a5a22');
		center.addColorStop(1, '#5b3714');
		ctx.fillStyle = center;
		ctx.beginPath();
		ctx.arc(item.x, item.y, radius * 0.42, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,220,120,.5)';
		ctx.beginPath();
		ctx.arc(item.x - radius * 0.12, item.y - radius * 0.14, radius * 0.1, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawBush(ctx: CanvasRenderingContext2D, item: SummerDecor, random: () => number): void {
		const radius = item.radius * 0.8;

		ctx.fillStyle = 'rgba(75,70,25,.24)';
		ctx.beginPath();
		ctx.ellipse(item.x + 2, item.y + 4, radius, radius * 0.7, 0, 0, Math.PI * 2);
		ctx.fill();

		for (let i = 0; i < 4; i += 1) {
			const px = item.x + (random() - 0.5) * radius;
			const py = item.y + (random() - 0.5) * radius * 0.7;
			const blobRadius = radius * (0.45 + random() * 0.2);
			const gradient = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, blobRadius);
			gradient.addColorStop(0, '#fff7d0');
			gradient.addColorStop(1, '#9fae4f');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(px, py, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawRock(ctx: CanvasRenderingContext2D, item: SummerDecor): void {
		const radius = item.radius * 0.75;

		ctx.fillStyle = 'rgba(70,55,25,.3)';
		ctx.beginPath();
		ctx.ellipse(item.x + 3, item.y + 5, radius * 1.1, radius * 0.7, 0, 0, Math.PI * 2);
		ctx.fill();

		const gradient = ctx.createLinearGradient(
			item.x - radius,
			item.y - radius,
			item.x + radius,
			item.y + radius
		);
		gradient.addColorStop(0, '#d8c49a');
		gradient.addColorStop(1, '#8a7346');
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.ellipse(item.x, item.y, radius, radius * 0.75, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,245,210,.65)';
		ctx.beginPath();
		ctx.ellipse(
			item.x - radius * 0.3,
			item.y - radius * 0.35,
			radius * 0.55,
			radius * 0.25,
			0,
			0,
			Math.PI * 2
		);
		ctx.fill();
	}
}

function makeRandom(seed: number): () => number {
	let state = Math.floor(Math.abs(Number.isFinite(seed) ? seed : 0)) % 2147483647;

	if (state <= 0) {
		state += 2147483646;
	}

	return () => {
		state = (state * 16807) % 2147483647;
		return state / 2147483647;
	};
}
