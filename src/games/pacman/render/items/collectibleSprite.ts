// The owner's collectible mock-ups (COLLECTIBLE_*.html, PIXI) all work the same way: a
// Canvas2D texture painted once, shown as a sprite with two blurred copies added on top
// (bloom), the whole thing breathing and swaying. Here each item paints its own texture
// (redrawn for the tile in stage 10.1, see `render/common/itemPaint`), the bloom copies are
// blurred once at bake time, and every frame only draws three images. Sizes in the art are
// texture pixels. The textures carry no backdrop glow of their own and the bloom hugs the
// object; the bake measures the object and how far the glow reaches, so the object fills
// `COLLECTIBLE_EXTENT` of a tile and, glow and animation included, never leaves the tile
// (stage 10.1).

/** The larger side of a collectible's object (without its glow), in tiles. */
export const COLLECTIBLE_EXTENT = 0.78;

/** How far anything drawn may reach from the tile centre, in tiles: the tile's own edge. */
const COLLECTIBLE_REACH = 0.5;

export interface Bloom {
	/** Displayed size in the mock-up, px (the sprite's is `CollectibleArt.sprite`). */
	readonly size: number;
	/** PIXI BlurFilter strength in the mock-up, screen px. */
	readonly blur: number;
}

export interface CollectibleArt {
	/** Texture size, px. */
	readonly size: number;
	/** Paints the mock-up's texture on a size × size canvas. */
	paint(ctx: CanvasRenderingContext2D, size: number): void;
	/** Displayed sprite size in the mock-up, px. */
	readonly sprite: number;
	readonly blooms: readonly [Bloom, Bloom];
	/** The mock-up's ticker when it differs from the common fruit one (`fruitMotion`). */
	readonly motion?: (time: number) => CollectibleMotion;
	/** The box the `extra` drawing stays in. */
	readonly extraBounds?: Bounds;
}

/** Per-frame animation, as the mock-up's ticker sets it. */
export interface CollectibleMotion {
	readonly scale: number;
	readonly rotation: number;
	readonly alpha: number;
	readonly bloomAlpha: readonly [number, number];
}

/** A box in texture px from the texture centre. */
export interface Bounds {
	readonly x0: number;
	readonly y0: number;
	readonly x1: number;
	readonly y1: number;
}

interface Baked {
	readonly sprite: HTMLCanvasElement;
	/** The object without its soft edge: pixels at least half opaque. */
	readonly bounds: Bounds;
	/** Object px → screen px per tile px: the object fits the extent, the glow the tile. */
	readonly fit: number;
	readonly blooms: ReadonlyArray<{ canvas: HTMLCanvasElement; pad: number }>;
}

const cache = new Map<CollectibleArt, Baked>();

function makeCanvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.ceil(w));
	c.height = Math.max(1, Math.ceil(h));
	return c;
}

const canvasFilter =
	typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;

/** A blurred copy with room for the blur around it. Without canvas filters: down-up sampling. */
function blurred(
	src: HTMLCanvasElement,
	sigma: number
): { canvas: HTMLCanvasElement; pad: number } {
	const pad = Math.ceil(sigma * 3);
	const out = makeCanvas(src.width + pad * 2, src.height + pad * 2);
	const ctx = out.getContext('2d');
	if (!ctx) {
		return { canvas: out, pad };
	}
	if (canvasFilter) {
		ctx.filter = `blur(${sigma}px)`;
		ctx.drawImage(src, pad, pad);
		ctx.filter = 'none';
		return { canvas: out, pad };
	}
	ctx.drawImage(src, pad, pad);
	const k = Math.max(1, sigma / 1.5);
	const small = makeCanvas(out.width / k, out.height / k);
	const sctx = small.getContext('2d');
	if (!sctx) {
		return { canvas: out, pad };
	}
	for (let pass = 0; pass < 2; pass++) {
		sctx.clearRect(0, 0, small.width, small.height);
		sctx.drawImage(out, 0, 0, small.width, small.height);
		ctx.clearRect(0, 0, out.width, out.height);
		ctx.drawImage(small, 0, 0, out.width, out.height);
	}
	return { canvas: out, pad };
}

/** The box of the pixels with alpha ≥ `threshold`; the whole texture if it cannot be read. */
function measure(ctx: CanvasRenderingContext2D, size: number, threshold: number): Bounds {
	const half = size / 2;
	let data: Uint8ClampedArray;
	try {
		data = ctx.getImageData(0, 0, size, size).data;
	} catch (error) {
		console.error('collectibleSprite.measure', 'cannot read the texture', error);
		return { x0: -half, y0: -half, x1: half, y1: half };
	}
	let x0 = size;
	let y0 = size;
	let x1 = -1;
	let y1 = -1;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (data[(y * size + x) * 4 + 3] >= threshold) {
				if (x < x0) x0 = x;
				if (x > x1) x1 = x;
				if (y < y0) y0 = y;
				if (y > y1) y1 = y;
			}
		}
	}
	if (x1 < 0) {
		return { x0: -half, y0: -half, x1: half, y1: half };
	}
	return { x0: x0 - half, y0: y0 - half, x1: x1 + 1 - half, y1: y1 + 1 - half };
}

/**
 * A visible pixel: alpha ≥ 10 once drawn. The sprite and its two blooms add up, so each
 * layer is measured to a third of it.
 */
const VISIBLE = 10;
const LAYER_VISIBLE = VISIBLE / 3;

/** Every pixel of a bloom layer still visible at its brightest (`alpha`), in texture px. */
function bloomBounds(
	layer: { canvas: HTMLCanvasElement; pad: number },
	k: number,
	half: number,
	alpha: number
): Bounds | null {
	const ctx = layer.canvas.getContext('2d');
	if (!ctx) {
		return null;
	}
	const w = layer.canvas.width;
	const b = measure(ctx, w, Math.min(255, Math.ceil(LAYER_VISIBLE / Math.max(alpha, 1e-3))));
	// measure() works on a square from its centre; the layer is square, its origin is -half-pad
	const shift = w / 2 - half - layer.pad;
	return {
		x0: (b.x0 + shift) * k,
		y0: (b.y0 + shift) * k,
		x1: (b.x1 + shift) * k,
		y1: (b.y1 + shift) * k
	};
}

function union(a: Bounds, b: Bounds): Bounds {
	return {
		x0: Math.min(a.x0, b.x0),
		y0: Math.min(a.y0, b.y0),
		x1: Math.max(a.x1, b.x1),
		y1: Math.max(a.y1, b.y1)
	};
}

/**
 * The object scale per tile px: its larger side `COLLECTIBLE_EXTENT` of the tile, smaller if
 * the glow, at the largest breath and sway of its ticker, would reach past the tile's edge.
 */
function fitFor(art: CollectibleArt, bounds: Bounds, glow: Bounds): number {
	const cx = (bounds.x0 + bounds.x1) / 2;
	const cy = (bounds.y0 + bounds.y1) / 2;
	const corners: Array<[number, number]> = [
		[glow.x0, glow.y0],
		[glow.x1, glow.y0],
		[glow.x0, glow.y1],
		[glow.x1, glow.y1]
	];
	const motion = art.motion ?? fruitMotion;
	// the farthest corner from the object centre over the ticker's cycles (texture px at scale 1)
	let far = 0;
	for (let t = 0; t < 30; t += 1 / 30) {
		const m = motion(t);
		const c = Math.cos(m.rotation);
		const s = Math.sin(m.rotation);
		for (const [px, py] of corners) {
			const rx = (px * c - py * s) * m.scale - cx;
			const ry = (px * s + py * c) * m.scale - cy;
			far = Math.max(far, Math.abs(rx), Math.abs(ry));
		}
	}
	const object = COLLECTIBLE_EXTENT / Math.max(1, bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
	return far > 0 ? Math.min(object, COLLECTIBLE_REACH / far) : object;
}

function bake(art: CollectibleArt): Baked | null {
	if (typeof document === 'undefined') {
		return null;
	}
	const sprite = makeCanvas(art.size, art.size);
	const ctx = sprite.getContext('2d');
	if (!ctx) {
		return null;
	}
	art.paint(ctx, art.size);
	// PIXI blurs in screen px of the bloom sprite; here the blur runs on the texture
	const blooms = art.blooms.map((b) => blurred(sprite, (b.blur * 0.6 * art.size) / b.size));
	const bounds = measure(ctx, art.size, 128);
	let glow = measure(ctx, art.size, Math.ceil(LAYER_VISIBLE));
	const motion = art.motion ?? fruitMotion;
	art.blooms.forEach((bloom, i) => {
		let brightest = 0;
		for (let t = 0; t < 30; t += 1 / 30) {
			brightest = Math.max(brightest, motion(t).bloomAlpha[i]);
		}
		const b = bloomBounds(blooms[i], bloom.size / art.sprite, art.size / 2, Math.min(1, brightest));
		if (b) glow = union(glow, b);
	});
	if (art.extraBounds) {
		glow = union(glow, art.extraBounds);
	}
	return { sprite, bounds, fit: fitFor(art, bounds, glow), blooms };
}

/** Pre-paints the textures (they are otherwise painted on first draw). */
export function warmCollectible(art: CollectibleArt): void {
	if (!cache.has(art)) {
		const baked = bake(art);
		if (baked) cache.set(art, baked);
	}
}

/**
 * Draws the collectible on a tile `tile` px across, its object (bounds) centred at (x, y),
 * animated by its ticker at `time`; the bloom layers are sized relative to the sprite as in
 * the mock-up. `extra` draws inside the same transform, in texture px from the texture centre.
 */
export function drawCollectible(
	ctx: CanvasRenderingContext2D,
	art: CollectibleArt,
	x: number,
	y: number,
	tile: number,
	time: number,
	extra?: (ctx: CanvasRenderingContext2D) => void
): void {
	warmCollectible(art);
	const baked = cache.get(art);
	if (!baked || !(tile > 0)) {
		return;
	}
	const motion = (art.motion ?? fruitMotion)(time);
	const b = baked.bounds;
	const f = baked.fit * tile;
	const half = art.size / 2;
	ctx.save();
	ctx.translate(x - ((b.x0 + b.x1) / 2) * f, y - ((b.y0 + b.y1) / 2) * f);
	ctx.rotate(motion.rotation);
	ctx.scale(f * motion.scale, f * motion.scale);
	const alpha = ctx.globalAlpha;
	ctx.globalAlpha = alpha * motion.alpha;
	ctx.drawImage(baked.sprite, -half, -half);
	ctx.globalCompositeOperation = 'lighter';
	art.blooms.forEach((bloom, i) => {
		const layer = baked.blooms[i];
		const k = bloom.size / art.sprite;
		ctx.globalAlpha = alpha * Math.max(0, Math.min(1, motion.bloomAlpha[i]));
		ctx.drawImage(
			layer.canvas,
			(-half - layer.pad) * k,
			(-half - layer.pad) * k,
			layer.canvas.width * k,
			layer.canvas.height * k
		);
	});
	ctx.globalAlpha = alpha;
	extra?.(ctx);
	ctx.restore();
}

/** The fruit mock-ups' ticker: slow breathing, a slight sway, the bloom shimmering. */
export function fruitMotion(time: number): CollectibleMotion {
	return {
		scale: 1 + Math.sin(time * 1.5) * 0.03,
		rotation: Math.sin(time * 0.8) * 0.04,
		alpha: 1,
		bloomAlpha: [0.4 + Math.sin(time * 2) * 0.05, 0.2 + Math.sin(time * 1.5) * 0.03]
	};
}

/**
 * The fruit's bloom layers (sprite 240 px). The mock-ups' 280 and 340 px with blur 12 and 25
 * spilled far past the tile; these hug the object (stage 10.1).
 */
export const FRUIT_BLOOMS: readonly [Bloom, Bloom] = [
	{ size: 252, blur: 6 },
	{ size: 276, blur: 12 }
];
