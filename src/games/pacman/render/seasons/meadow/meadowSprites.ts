// Sprites shared by every meadow season; season-specific food and particles live in the
// season's theme. Drawn once (at 3x where the mock-ups did) and downscaled on draw.
import { canvasContext, makeCanvas, makeTexture, radialTexture } from '../../common/textures';

export { glowTexture, makeTexture, radialTexture } from '../../common/textures';

export function lazy<V>(make: () => V): () => V {
	let value: V | null = null;
	return () => (value ??= make());
}

/** Linear 64×64 colour wash laid over the whole screen. */
export function washTexture(from: string, to: string): HTMLCanvasElement {
	const c = makeCanvas(64, 64);
	const x = canvasContext(c);
	const q = x.createLinearGradient(0, 0, 64, 64);
	q.addColorStop(0, from);
	q.addColorStop(0.5, 'rgba(255,255,255,0)');
	q.addColorStop(1, to);
	x.fillStyle = q;
	x.fillRect(0, 0, 64, 64);
	return c;
}

/** Soft sun ray falling from the top edge. */
export const rayTexture = lazy(() => {
	const c = makeCanvas(70, 520);
	const x = canvasContext(c);
	let q = x.createLinearGradient(0, 0, 70, 0);
	q.addColorStop(0, 'rgba(255,230,170,0)');
	q.addColorStop(0.5, 'rgba(255,230,170,1)');
	q.addColorStop(1, 'rgba(255,230,170,0)');
	x.fillStyle = q;
	x.fillRect(0, 0, 70, 520);
	x.globalCompositeOperation = 'destination-in';
	q = x.createLinearGradient(0, 0, 0, 520);
	q.addColorStop(0, 'rgba(0,0,0,1)');
	q.addColorStop(1, 'rgba(0,0,0,0)');
	x.fillStyle = q;
	x.fillRect(0, 0, 70, 520);
	return c;
});

const streakCache = new Map<number, HTMLCanvasElement>();

/** 16×2 streak fading in from the left, tinted (rain, blizzard, wind). */
export function streakTexture(tint: number): HTMLCanvasElement {
	const cached = streakCache.get(tint);
	if (cached) {
		return cached;
	}
	const r = (tint >> 16) & 255;
	const g = (tint >> 8) & 255;
	const b = tint & 255;
	const texture = makeTexture(16, 2, (x) => {
		const q = x.createLinearGradient(0, 0, 16, 0);
		q.addColorStop(0, `rgba(${r},${g},${b},0)`);
		q.addColorStop(1, `rgba(${r},${g},${b},1)`);
		x.fillStyle = q;
		x.fillRect(0, 0, 16, 2);
	});
	streakCache.set(tint, texture);
	return texture;
}

/** Portal swirl: three spiral arms (the same in every season). */
export const swirlTexture = lazy(() =>
	makeTexture(20, 20, (x) => {
		x.translate(10, 10);
		x.lineCap = 'round';
		for (let arm = 0; arm < 3; arm++) {
			x.strokeStyle = 'rgba(255,255,255,.9)';
			x.lineWidth = 1.2;
			x.beginPath();
			for (let i = 0; i <= 20; i++) {
				const u = i / 20;
				const a = u * 3.6 + (arm * Math.PI * 2) / 3;
				const r = 1 + u * 6.8;
				if (i) {
					x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				} else {
					x.moveTo(Math.cos(a) * r, Math.sin(a) * r);
				}
			}
			x.stroke();
		}
	})
);

/** Portal ring in the season's colour. */
export function ringTexture(color: string): HTMLCanvasElement {
	return makeTexture(20, 20, (x) => {
		x.strokeStyle = color;
		x.lineWidth = 1.2;
		x.beginPath();
		x.arc(10, 10, 8.8, 0, 7);
		x.stroke();
	});
}

/** A sprite texture multiplied by a tint, keeping its alpha (PIXI's `tint`). */
const tintCache = new WeakMap<HTMLCanvasElement, Map<number, HTMLCanvasElement>>();
export function tinted(im: HTMLCanvasElement, tint: number): HTMLCanvasElement {
	let byTint = tintCache.get(im);
	if (!byTint) {
		byTint = new Map();
		tintCache.set(im, byTint);
	}
	const cached = byTint.get(tint);
	if (cached) {
		return cached;
	}
	const c = makeCanvas(im.width, im.height);
	const x = canvasContext(c);
	x.drawImage(im, 0, 0);
	x.globalCompositeOperation = 'multiply';
	x.fillStyle = '#' + tint.toString(16).padStart(6, '0');
	x.fillRect(0, 0, c.width, c.height);
	x.globalCompositeOperation = 'destination-in';
	x.drawImage(im, 0, 0);
	byTint.set(tint, c);
	return c;
}

/** Radial fog / light / vignette in one call. */
export function radial(stops: ReadonlyArray<readonly [number, string]>): HTMLCanvasElement {
	return radialTexture(256, stops);
}
