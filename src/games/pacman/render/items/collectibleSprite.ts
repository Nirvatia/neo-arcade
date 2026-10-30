// The owner's collectible mock-ups (COLLECTIBLE_*.html, PIXI) all work the same way: a
// Canvas2D texture painted once, shown as a sprite with two blurred copies added on top
// (bloom), the whole thing breathing and swaying. Here the texture is painted by the
// mock-up's own code, the bloom copies are blurred once at bake time, and every frame only
// draws three images. Sizes in the art are texture pixels; the game fits the object (not
// its glow) to a size in tiles.

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
	/** The object's bounds without its glow, texture px from the texture centre. */
	readonly bounds: {
		readonly x0: number;
		readonly y0: number;
		readonly x1: number;
		readonly y1: number;
	};
	/** Displayed sprite size in the mock-up, px. */
	readonly sprite: number;
	readonly blooms: readonly [Bloom, Bloom];
	/** The mock-up's ticker when it differs from the common fruit one (`fruitMotion`). */
	readonly motion?: (time: number) => CollectibleMotion;
}

/** Per-frame animation, as the mock-up's ticker sets it. */
export interface CollectibleMotion {
	readonly scale: number;
	readonly rotation: number;
	readonly alpha: number;
	readonly bloomAlpha: readonly [number, number];
}

interface Baked {
	readonly sprite: HTMLCanvasElement;
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
	return { sprite, blooms };
}

/** Pre-paints the textures (they are otherwise painted on first draw). */
export function warmCollectible(art: CollectibleArt): void {
	if (!cache.has(art)) {
		const baked = bake(art);
		if (baked) cache.set(art, baked);
	}
}

/**
 * Draws the collectible with its object (bounds) centred at (x, y), its larger side
 * `extent` px across, the bloom layers sized relative to the sprite as in the mock-up.
 * `extra` draws inside the same transform, in texture px from the texture centre.
 */
export function drawCollectible(
	ctx: CanvasRenderingContext2D,
	art: CollectibleArt,
	x: number,
	y: number,
	extent: number,
	motion: CollectibleMotion,
	extra?: (ctx: CanvasRenderingContext2D) => void
): void {
	warmCollectible(art);
	const baked = cache.get(art);
	if (!baked || !(extent > 0)) {
		return;
	}
	const b = art.bounds;
	const f = extent / Math.max(b.x1 - b.x0, b.y1 - b.y0);
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

/** The bloom layers every fruit mock-up uses (sprite 240 px, blooms 280 and 340 px). */
export const FRUIT_BLOOMS: readonly [Bloom, Bloom] = [
	{ size: 280, blur: 12 },
	{ size: 340, blur: 25 }
];
