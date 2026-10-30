// Baking kit for the character sprites (stage 10.3/10.4): canvases, seeded noise that loops
// in time, a per-pixel disc painter and a smooth downscale. The characters are painted once
// at a high resolution, shrunk to the tile's size and then only drawn as images, so nothing
// shimmers at tile size.

export type RGB = readonly [number, number, number];

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.ceil(w));
	c.height = Math.max(1, Math.ceil(h));
	return c;
}

export function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
	const ctx = c.getContext('2d');
	if (!ctx) {
		throw new Error('bakeKit: no 2D context');
	}
	return ctx;
}

/** A small seeded generator (mulberry32): the same sequence every run. */
export function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hash(x: number, y: number, seed: number): number {
	let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number): number {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const ux = fx * fx * (3 - 2 * fx);
	const uy = fy * fy * (3 - 2 * fy);
	const a = hash(ix, iy, seed);
	const b = hash(ix + 1, iy, seed);
	const c = hash(ix, iy + 1, seed);
	const d = hash(ix + 1, iy + 1, seed);
	return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm(x: number, y: number, seed: number, octaves = 4): number {
	let s = 0;
	let a = 0.5;
	let n = 0;
	for (let i = 0; i < octaves; i++) {
		s += a * valueNoise(x, y, seed + i * 31);
		n += a;
		x = x * 2.03 + 17.1;
		y = y * 2.03 + 3.7;
		a *= 0.5;
	}
	return s / n;
}

/**
 * Two noise fields blended round a circle: frame k of n is A·cos + B·sin, so the last frame
 * flows back into the first without a jump. Returns a sampler per frame over the unit disc.
 */
export function loopingField(
	grid: number,
	scale: number,
	seed: number
): (frame: number, frames: number, x: number, y: number) => number {
	const a = new Float32Array(grid * grid);
	const b = new Float32Array(grid * grid);
	for (let j = 0; j < grid; j++) {
		for (let i = 0; i < grid; i++) {
			const x = (i / (grid - 1)) * 2 - 1;
			const y = (j / (grid - 1)) * 2 - 1;
			a[j * grid + i] = fbm(x * scale + 5, y * scale + 9, seed) - 0.5;
			b[j * grid + i] = fbm(x * scale + 41, y * scale + 23, seed + 7) - 0.5;
		}
	}
	return (frame, frames, x, y) => {
		const i = Math.min(grid - 1, Math.max(0, Math.round(((x + 1) / 2) * (grid - 1))));
		const j = Math.min(grid - 1, Math.max(0, Math.round(((y + 1) / 2) * (grid - 1))));
		const th = (frame / frames) * Math.PI * 2;
		// a·cos + b·sin keeps the field's spread through the loop (√2 normalises it)
		return 0.5 + (a[j * grid + i] * Math.cos(th) + b[j * grid + i] * Math.sin(th)) * 1.41;
	};
}

export const mixRGB = (a: RGB, b: RGB, k: number): RGB => [
	a[0] + (b[0] - a[0]) * k,
	a[1] + (b[1] - a[1]) * k,
	a[2] + (b[2] - a[2]) * k
];

/** A colour ramp over stops [position, colour], position 0..1. */
export function ramp(stops: ReadonlyArray<readonly [number, RGB]>, t: number): RGB {
	if (t <= stops[0][0]) return stops[0][1];
	for (let i = 1; i < stops.length; i++) {
		if (t <= stops[i][0]) {
			const [p0, c0] = stops[i - 1];
			const [p1, c1] = stops[i];
			return mixRGB(c0, c1, (t - p0) / (p1 - p0));
		}
	}
	return stops[stops.length - 1][1];
}

/**
 * Paints a disc pixel by pixel on a `size`-square canvas, radius R at the centre. `shade`
 * gets the unit-disc position (y down) and the sphere's height z, and returns a colour;
 * the edge is antialiased and ringed by an `outline` of `width` (fraction of R).
 */
export function paintDisc(
	size: number,
	R: number,
	shade: (x: number, y: number, z: number) => RGB,
	outline: RGB,
	width: number
): HTMLCanvasElement {
	const c = makeCanvas(size, size);
	const ctx = context(c);
	const img = ctx.createImageData(c.width, c.height);
	const d = img.data;
	const mid = c.width / 2;
	const edge = width * R;
	for (let py = 0; py < c.height; py++) {
		for (let px = 0; px < c.width; px++) {
			const dx = px + 0.5 - mid;
			const dy = py + 0.5 - mid;
			const r = Math.hypot(dx, dy);
			const cover = Math.min(1, Math.max(0, R - r + 0.5));
			if (cover <= 0) continue;
			const x = dx / R;
			const y = dy / R;
			const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
			let col = shade(x, y, z);
			const ring = Math.min(1, Math.max(0, (r - (R - edge)) / Math.max(1, edge * 0.6)));
			col = mixRGB(col, outline, ring * 0.9);
			const o = (py * c.width + px) * 4;
			d[o] = col[0];
			d[o + 1] = col[1];
			d[o + 2] = col[2];
			d[o + 3] = cover * 255;
		}
	}
	ctx.putImageData(img, 0, 0);
	return c;
}

/** Shrinks a canvas to `w`×`h` by halving steps, so the result stays smooth and crisp. */
export function downscale(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
	let cur = src;
	while (cur.width / 2 >= w * 1.2 && cur.height / 2 >= h * 1.2) {
		const half = makeCanvas(cur.width / 2, cur.height / 2);
		const hx = context(half);
		hx.imageSmoothingQuality = 'high';
		hx.drawImage(cur, 0, 0, half.width, half.height);
		cur = half;
	}
	const out = makeCanvas(w, h);
	const ox = context(out);
	ox.imageSmoothingQuality = 'high';
	ox.drawImage(cur, 0, 0, out.width, out.height);
	return out;
}

/** A soft round glow, white core to a transparent edge, tinted. */
export function glowSprite(rgb: RGB, size = 64): HTMLCanvasElement {
	const c = makeCanvas(size, size);
	const ctx = context(c);
	const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	const [r, gr, b] = rgb.map(Math.round);
	g.addColorStop(0, `rgba(${r},${gr},${b},1)`);
	g.addColorStop(0.35, `rgba(${r},${gr},${b},0.45)`);
	g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	return c;
}

export const rgba = (c: RGB, a: number): string =>
	`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
