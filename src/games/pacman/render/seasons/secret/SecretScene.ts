import type { SceneView, RenderBoard } from '../../contracts/SeasonRenderBundle';

interface SecretDecor {
	readonly kind: 'crystal' | 'orb' | 'rune' | 'stars';
	readonly x: number;
	readonly y: number;
	readonly radius: number;
}

export class SecretScene implements SceneView {
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
			console.error('SecretScene.draw', 'invalid viewport', { width, height });
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
			console.error('SecretScene.bake', 'document is unavailable');
			throw new Error('SecretScene.bake: document is unavailable');
		}

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			console.error('SecretScene.bake', '2d context unavailable');
			return canvas;
		}

		const random = makeRandom(seed + 67);

		ctx.fillStyle = '#050213';
		ctx.fillRect(0, 0, width, height);

		const base = ctx.createRadialGradient(
			width / 2,
			height / 2,
			0,
			width / 2,
			height / 2,
			Math.max(1, Math.max(width, height) * 0.75)
		);
		base.addColorStop(0, '#1d1038');
		base.addColorStop(1, '#050213');
		ctx.fillStyle = base;
		ctx.fillRect(0, 0, width, height);

		const nebulae = Math.min(70, Math.max(12, Math.floor((width * height) / 42000)));

		for (let i = 0; i < nebulae; i += 1) {
			const x = random() * width;
			const y = random() * height;
			const radius = 60 + random() * 130;
			const tint = random();
			const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

			if (tint < 0.4) {
				gradient.addColorStop(0, 'rgba(122,92,255,.16)');
			} else if (tint < 0.75) {
				gradient.addColorStop(0, 'rgba(70,180,255,.12)');
			} else {
				gradient.addColorStop(0, 'rgba(255,120,220,.1)');
			}

			gradient.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = gradient;
			ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
		}

		const stars = Math.min(520, Math.max(60, Math.floor((width * height) / 3500)));

		for (let i = 0; i < stars; i += 1) {
			const x = random() * width;
			const y = random() * height;
			const size = 0.5 + random() * 1.5;
			const variant = random();

			if (variant < 0.55) {
				ctx.fillStyle = 'rgba(255,255,255,.75)';
			} else if (variant < 0.82) {
				ctx.fillStyle = 'rgba(217,201,255,.65)';
			} else {
				ctx.fillStyle = 'rgba(127,216,255,.55)';
			}

			ctx.fillRect(x, y, size, size);
		}

		const trails = Math.min(26, Math.max(4, Math.floor((width * height) / 90000)));

		for (let i = 0; i < trails; i += 1) {
			const x = random() * width;
			const y = random() * height;
			const length = 40 + random() * 90;
			const angle = random() * Math.PI * 2;

			ctx.strokeStyle = 'rgba(217,201,255,.18)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
			ctx.stroke();
		}

		const decor = this.makeDecor(width, height, board, random);

		for (const item of decor) {
			if (item.kind === 'crystal') {
				this.drawCrystal(ctx, item, random);
			} else if (item.kind === 'orb') {
				this.drawOrb(ctx, item, random);
			} else if (item.kind === 'rune') {
				this.drawRune(ctx, item, random);
			} else {
				this.drawStars(ctx, item, random);
			}
		}

		return canvas;
	}

	private makeDecor(
		width: number,
		height: number,
		board: RenderBoard | null,
		random: () => number
	): SecretDecor[] {
		const items: SecretDecor[] = [];
		const count = Math.min(36, Math.max(10, Math.floor((width * height) / 40000)));
		const margin = 42;
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
			const kind: SecretDecor['kind'] =
				roll < 0.35
					? 'crystal'
					: roll < 0.6
						? 'orb'
						: roll < 0.8
							? 'rune'
							: 'stars';

			items.push({
				kind,
				x,
				y,
				radius: (0.6 + random() * 1.1) * 24
			});
		}

		return items.sort((a, b) => a.y - b.y);
	}

	private drawCrystal(
		ctx: CanvasRenderingContext2D,
		item: SecretDecor,
		random: () => number
	): void {
		const radius = item.radius * 0.7;

		ctx.fillStyle = 'rgba(10,5,25,.4)';
		ctx.beginPath();
		ctx.ellipse(item.x + 3, item.y + 6, radius, radius * 0.6, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.save();
		ctx.translate(item.x, item.y);
		ctx.rotate((random() - 0.5) * 0.6);

		const gradient = ctx.createLinearGradient(0, -radius, 0, radius * 1.4);
		gradient.addColorStop(0, '#e8d9ff');
		gradient.addColorStop(0.45, '#b98fff');
		gradient.addColorStop(1, '#4b2f77');
		ctx.fillStyle = gradient;

		ctx.beginPath();
		ctx.moveTo(0, -radius);
		ctx.lineTo(radius * 0.55, 0);
		ctx.lineTo(0, radius * 1.35);
		ctx.lineTo(-radius * 0.55, 0);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = 'rgba(255,255,255,.4)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, -radius);
		ctx.lineTo(0, radius * 1.35);
		ctx.stroke();
		ctx.restore();
	}

	private drawOrb(
		ctx: CanvasRenderingContext2D,
		item: SecretDecor,
		random: () => number
	): void {
		const radius = item.radius * 0.5;
		const gradient = ctx.createRadialGradient(
			item.x - radius * 0.25,
			item.y - radius * 0.25,
			1,
			item.x,
			item.y,
			radius
		);
		gradient.addColorStop(0, 'rgba(255,255,255,.9)');
		gradient.addColorStop(0.4, 'rgba(185,143,255,.65)');
		gradient.addColorStop(1, 'rgba(185,143,255,0)');
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
		ctx.fill();

		for (let i = 0; i < 3; i += 1) {
			const px = item.x + (random() - 0.5) * radius * 2.2;
			const py = item.y + (random() - 0.5) * radius * 2.2;
			ctx.fillStyle = 'rgba(217,201,255,.6)';
			ctx.fillRect(px, py, 1.5, 1.5);
		}
	}

	private drawRune(
		ctx: CanvasRenderingContext2D,
		item: SecretDecor,
		random: () => number
	): void {
		const radius = item.radius * 0.45;

		ctx.save();
		ctx.translate(item.x, item.y);
		ctx.rotate(random() * Math.PI * 2);

		ctx.strokeStyle = 'rgba(122,92,255,.75)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(217,201,255,.7)';
		ctx.lineWidth = 1.2;

		for (let i = 0; i < 3; i += 1) {
			const angle = i * ((Math.PI * 2) / 3) + random() * 0.4;
			ctx.beginPath();
			ctx.moveTo(Math.cos(angle) * radius * 0.2, Math.sin(angle) * radius * 0.2);
			ctx.lineTo(Math.cos(angle) * radius * 0.85, Math.sin(angle) * radius * 0.85);
			ctx.stroke();
		}

		ctx.restore();
	}

	private drawStars(
		ctx: CanvasRenderingContext2D,
		item: SecretDecor,
		random: () => number
	): void {
		const cluster = item.radius * 0.75;
		const count = 5 + Math.floor(random() * 4);

		for (let i = 0; i < count; i += 1) {
			const px = item.x + (random() - 0.5) * cluster;
			const py = item.y + (random() - 0.5) * cluster;
			const size = 1 + random() * 2;

			ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,.8)' : 'rgba(185,143,255,.7)';
			ctx.fillRect(px, py, size, size);
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