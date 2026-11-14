// The season's atmosphere (mist, sun rays, light, colour wash, storm tint, night) in small
// screen buffers instead of one pass per layer. Covering layers become a multiply map (white
// where they do not reach, darker where they do), additive layers become light on black, and
// High draws both over the world. Low mixes the maps into one source-over layer, so the season
// keeps its atmosphere at the two full-screen passes the weak-GPU budget asks for.

import { MOOD_UPDATE_INTERVAL_MS } from './renderQuality';
import type { RenderQuality } from './renderQuality';

/** Longest side of the buffers, px. */
const BUFFER_SIDE = 512;

/** One layer of the atmosphere; `additive` layers add light, the others cover with their alpha. */
export type MoodPainter = (ctx: CanvasRenderingContext2D, additive: boolean) => void;

/** Extra shade work after the coverage became a multiply map (the season's night tint). */
export type MoodShadeFinish = (ctx: CanvasRenderingContext2D) => void;

function canvas2d(willReadFrequently = false): {
	cv: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
} {
	const cv = document.createElement('canvas');
	const ctx = cv.getContext('2d', { willReadFrequently });
	if (!ctx) {
		throw new Error('moodBuffer: 2d context unavailable');
	}
	return { cv, ctx };
}

export class MoodBuffer {
	private shade: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
	private light: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
	private mixed: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
	private vw = 0;
	private vh = 0;
	private scale = 1;
	private quality: RenderQuality = 'high';
	private painted = false;
	private nextPaintAt = 0;

	setQuality(quality: RenderQuality): void {
		if (this.quality !== quality) {
			this.quality = quality;
			this.painted = false;
		}
	}

	/**
	 * Paints the stack when its quality interval allows and composites it over `ctx`, a screen
	 * of vw x vh css px whose transform is the identity in css px. High is exact shade + light;
	 * Medium repaints at 30 Hz; Low mixes both maps into one layer and repaints at 15 Hz.
	 */
	draw(
		ctx: CanvasRenderingContext2D,
		vw: number,
		vh: number,
		paint: MoodPainter,
		finishShade: MoodShadeFinish | null = null
	): void {
		if (vw <= 0 || vh <= 0) {
			return;
		}
		this.fit(vw, vh);
		const shade = this.shade;
		const light = this.light;
		if (!shade || !light) {
			return;
		}
		const now = performance.now();
		const interval = MOOD_UPDATE_INTERVAL_MS[this.quality];
		const multiplyShade = finishShade !== null || this.quality === 'low';
		if (!this.painted || interval === 0 || now >= this.nextPaintAt) {
			this.paintShade(shade, paint, finishShade, multiplyShade);
			this.paintLight(light, paint);
			if (this.quality === 'low') {
				this.mix(shade, light);
			}
			this.painted = true;
			this.nextPaintAt = now + interval;
		}

		ctx.save();
		ctx.globalAlpha = 1;
		ctx.imageSmoothingEnabled = true;
		if (this.quality === 'low') {
			const mixed = this.mixed;
			if (!mixed) {
				ctx.restore();
				return;
			}
			ctx.globalCompositeOperation = 'source-over';
			ctx.drawImage(mixed.cv, 0, 0, vw, vh);
		} else {
			ctx.globalCompositeOperation = multiplyShade ? 'multiply' : 'source-over';
			ctx.drawImage(shade.cv, 0, 0, vw, vh);
			ctx.globalCompositeOperation = 'lighter';
			ctx.drawImage(light.cv, 0, 0, vw, vh);
		}
		ctx.restore();
	}

	private paintShade(
		buffer: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D },
		paint: MoodPainter,
		finishShade: MoodShadeFinish | null,
		multiplyShade: boolean
	): void {
		const s = buffer.ctx;
		const sw = buffer.cv.width;
		const sh = buffer.cv.height;
		s.setTransform(1, 0, 0, 1, 0, 0);
		s.globalAlpha = 1;
		s.globalCompositeOperation = 'source-over';
		s.clearRect(0, 0, sw, sh);
		s.setTransform(this.scale, 0, 0, this.scale, 0, 0);
		paint(s, false);

		s.setTransform(1, 0, 0, 1, 0, 0);
		if (multiplyShade) {
			// The night tint and Low's one-layer mix need an opaque multiplier map.
			const image = s.getImageData(0, 0, sw, sh);
			const px = image.data;
			for (let i = 0; i < px.length; i += 4) {
				const shade = 255 - px[i + 3]!;
				px[i] = shade;
				px[i + 1] = shade;
				px[i + 2] = shade;
				px[i + 3] = 255;
			}
			s.putImageData(image, 0, 0);
		} else {
			// The usual covering stack keeps its cheaper black-alpha form.
			s.globalCompositeOperation = 'source-atop';
			s.fillStyle = '#000';
			s.fillRect(0, 0, sw, sh);
			s.globalCompositeOperation = 'source-over';
		}

		if (finishShade) {
			s.setTransform(this.scale, 0, 0, this.scale, 0, 0);
			finishShade(s);
			s.setTransform(1, 0, 0, 1, 0, 0);
			s.globalAlpha = 1;
			s.globalCompositeOperation = 'source-over';
		}
	}

	private paintLight(
		buffer: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D },
		paint: MoodPainter
	): void {
		const l = buffer.ctx;
		l.setTransform(1, 0, 0, 1, 0, 0);
		l.globalAlpha = 1;
		l.globalCompositeOperation = 'source-over';
		l.fillStyle = '#000';
		l.fillRect(0, 0, buffer.cv.width, buffer.cv.height);
		l.setTransform(this.scale, 0, 0, this.scale, 0, 0);
		paint(l, true);
		l.globalAlpha = 1;
		l.globalCompositeOperation = 'source-over';
	}

	/** Low's one layer: premultiplied light, with alpha leaving the shade multiplier visible. */
	private mix(
		shade: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D },
		light: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
	): void {
		this.mixed ??= canvas2d(true);
		const sw = shade.cv.width;
		const sh = shade.cv.height;
		const mixed = this.mixed;
		if (mixed.cv.width !== sw || mixed.cv.height !== sh) {
			mixed.cv.width = sw;
			mixed.cv.height = sh;
		}
		const shadePx = shade.ctx.getImageData(0, 0, sw, sh).data;
		const lightPx = light.ctx.getImageData(0, 0, sw, sh).data;
		const image = mixed.ctx.createImageData(sw, sh);
		const out = image.data;
		for (let i = 0; i < out.length; i += 4) {
			const r = lightPx[i]!;
			const g = lightPx[i + 1]!;
			const b = lightPx[i + 2]!;
			let alpha = 255 - shadePx[i + 1]!;
			if (alpha === 0 && (r > 0 || g > 0 || b > 0)) {
				alpha = 1;
			}
			out[i] = r;
			out[i + 1] = g;
			out[i + 2] = b;
			out[i + 3] = alpha;
		}
		mixed.ctx.putImageData(image, 0, 0);
	}

	private fit(vw: number, vh: number): void {
		if (vw === this.vw && vh === this.vh && this.shade && this.light) {
			return;
		}
		this.vw = vw;
		this.vh = vh;
		this.scale = Math.min(1, BUFFER_SIDE / Math.max(vw, vh));
		const w = Math.max(1, Math.ceil(vw * this.scale));
		const h = Math.max(1, Math.ceil(vh * this.scale));
		this.shade ??= canvas2d(true);
		this.light ??= canvas2d();
		for (const b of [this.shade, this.light]) {
			b.cv.width = w;
			b.cv.height = h;
		}
		this.painted = false;
	}
}
