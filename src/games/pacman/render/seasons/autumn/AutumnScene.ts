import type { SceneView, RenderBoard } from '../../contracts/SeasonRenderBundle';

interface AutumnDecor {
	readonly kind: 'tree' | 'bush' | 'mushroom' | 'leaves';
	readonly x: number;
	readonly y: number;
	readonly radius: number;
}

export class AutumnScene implements SceneView {
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
			console.error('AutumnScene.draw', 'invalid viewport', { width, height });
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
			console.error('AutumnScene.bake', 'document is unavailable');
			throw new Error('AutumnScene.bake: document is unavailable');
		}

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			console.error('AutumnScene.bake', '2d context unavailable');
			return canvas;
		}

		const random = makeRandom(seed + 53);

		ctx.fillStyle = '#d8a35c';
		ctx.fillRect(0, 0, width, height);

		const base = ctx.createRadialGradient(
			width / 2,
			height / 2,
			0,
			width / 2,
			height / 2,
			Math.max(1, Math.max(width, height) * 0.75)
		);
		base.addColorStop(0, '#ffe9b8');
		base.addColorStop(1, '#d8a35c');
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
				gradient.addColorStop(0, 'rgba(255,177,77,.24)');
			} else if (tint < 0.7) {
				gradient.addColorStop(0, 'rgba(217,83,47,.2)');
			} else {
				gradient.addColorStop(0, 'rgba(255,240,200,.22)');
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
				ctx.strokeStyle = '#a86a2f';
			} else if (variant < 0.8) {
				ctx.strokeStyle = '#8a5a2f';
			} else {
				ctx.strokeStyle = '#ffdf9f';
			}

			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + (random() - 0.5) * 5, y - 4 - random() * 6);
			ctx.stroke();
		}

		const leaves = Math.min(460, Math.max(20, Math.floor((width * height) / 6000)));

		for (let i = 0; i < leaves; i += 1) {
			const x = random() * width;
			const y = random() * height;
			const variant = random();

			if (variant < 0.35) {
				ctx.fillStyle = 'rgba(255,177,77,.75)';
			} else if (variant < 0.7) {
				ctx.fillStyle = 'rgba(217,83,47,.65)';
			} else {
				ctx.fillStyle = 'rgba(255,211,77,.7)';
			}

			ctx.beginPath();
			ctx.arc(x, y, 1 + random() * 1.9, 0, Math.PI * 2);
			ctx.fill();
		}

		const decor = this.makeDecor(width, height, board, random);

		for (const item of decor) {
			if (item.kind === 'tree') {
				this.drawTree(ctx, item, random);
			} else if (item.kind === 'bush') {
				this.drawBush(ctx, item, random);
			} else if (item.kind === 'mushroom') {
				this.drawMushroom(ctx, item, random);
			} else {
				this.drawLeaves(ctx, item, random);
			}
		}

		return canvas;
	}

	private makeDecor(
		width: number,
		height: number,
		board: RenderBoard | null,
		random: () => number
	): AutumnDecor[] {
		const items: AutumnDecor[] = [];
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
			const kind: AutumnDecor['kind'] =
				roll < 0.45 ? 'tree' : roll < 0.68 ? 'bush' : roll < 0.85 ? 'mushroom' : 'leaves';

			items.push({
				kind,
				x,
				y,
				radius: (0.65 + random() * 1.05) * 26
			});
		}

		return items.sort((a, b) => a.y - b.y);
	}

	private drawTree(ctx: CanvasRenderingContext2D, item: AutumnDecor, random: () => number): void {
		const radius = item.radius;

		ctx.fillStyle = 'rgba(70,45,20,.28)';
		ctx.beginPath();
		ctx.ellipse(
			item.x + radius * 0.26,
			item.y + radius * 0.36,
			radius * 1.15,
			radius * 0.82,
			0,
			0,
			Math.PI * 2
		);
		ctx.fill();

		const palette =
			random() < 0.5 ? ['#ffb14d', '#ff6b4d', '#8a4a2f'] : ['#ffd34d', '#d9532f', '#6f3b23'];

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

			gradient.addColorStop(0, palette[0] ?? '#ffb14d');
			gradient.addColorStop(0.55, palette[1] ?? '#ff6b4d');
			gradient.addColorStop(1, palette[2] ?? '#8a4a2f');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(px, py, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawBush(ctx: CanvasRenderingContext2D, item: AutumnDecor, random: () => number): void {
		const radius = item.radius * 0.8;

		ctx.fillStyle = 'rgba(70,45,20,.24)';
		ctx.beginPath();
		ctx.ellipse(item.x + 2, item.y + 4, radius, radius * 0.7, 0, 0, Math.PI * 2);
		ctx.fill();

		for (let i = 0; i < 4; i += 1) {
			const px = item.x + (random() - 0.5) * radius;
			const py = item.y + (random() - 0.5) * radius * 0.7;
			const blobRadius = radius * (0.45 + random() * 0.2);
			const gradient = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, blobRadius);
			gradient.addColorStop(0, '#ffe0b0');
			gradient.addColorStop(1, '#8a5a34');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(px, py, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawMushroom(
		ctx: CanvasRenderingContext2D,
		item: AutumnDecor,
		random: () => number
	): void {
		const radius = item.radius * 0.55;

		ctx.fillStyle = 'rgba(50,30,15,.3)';
		ctx.beginPath();
		ctx.ellipse(item.x + 2, item.y + 4, radius * 1.1, radius * 0.75, 0, 0, Math.PI * 2);
		ctx.fill();

		const cap = ctx.createRadialGradient(
			item.x - radius * 0.25,
			item.y - radius * 0.25,
			1,
			item.x,
			item.y,
			radius
		);
		cap.addColorStop(0, '#ff8a5c');
		cap.addColorStop(1, '#b23a1f');
		ctx.fillStyle = cap;
		ctx.beginPath();
		ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
		ctx.fill();

		for (let i = 0; i < 5; i += 1) {
			const px = item.x + (random() - 0.5) * radius * 1.2;
			const py = item.y + (random() - 0.5) * radius * 1.2;
			ctx.fillStyle = 'rgba(255,245,230,.8)';
			ctx.beginPath();
			ctx.arc(px, py, radius * (0.08 + random() * 0.08), 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawLeaves(ctx: CanvasRenderingContext2D, item: AutumnDecor, random: () => number): void {
		const cluster = item.radius * 0.7;
		const count = 5 + Math.floor(random() * 4);
		const palette = ['#ffb14d', '#ff6b4d', '#ffd34d', '#d9532f'];

		for (let i = 0; i < count; i += 1) {
			const px = item.x + (random() - 0.5) * cluster;
			const py = item.y + (random() - 0.5) * cluster;
			const leafRadius = 2 + random() * 2.5;
			const color = palette[Math.floor(random() * palette.length)] ?? '#ffb14d';

			ctx.save();
			ctx.translate(px, py);
			ctx.rotate(random() * Math.PI);
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.ellipse(0, 0, leafRadius, leafRadius * 0.6, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
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
