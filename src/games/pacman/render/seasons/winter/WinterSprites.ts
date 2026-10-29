// Sprites of the winter mock-up: drawn once (at 3x where the mock-up did) and downscaled.
import { canvasContext, makeCanvas, makeTexture, radialTexture } from '../../common/textures';

export { glowTexture } from '../../common/textures';

function lazy<V>(make: () => V): () => V {
	let value: V | null = null;
	return () => (value ??= make());
}

/** Drifting mist, pre-tinted 0xdbe8f5 like the mock-up's sprite tint. */
export const fogTexture = lazy(() =>
	radialTexture(256, [
		[0, 'rgba(202,223,226,.9)'],
		[1, 'rgba(202,223,226,0)']
	])
);

export const litTexture = lazy(() =>
	radialTexture(256, [
		[0, 'rgba(205,228,255,.4)'],
		[1, 'rgba(255,205,130,0)']
	])
);

export const vignetteTexture = lazy(() =>
	radialTexture(256, [
		[0.5, 'rgba(12,22,44,0)'],
		[1, 'rgba(12,22,44,.5)']
	])
);

export const washTexture = lazy(() => {
	const c = makeCanvas(64, 64);
	const x = canvasContext(c);
	const q = x.createLinearGradient(0, 0, 64, 64);
	q.addColorStop(0, 'rgba(255,236,200,.14)');
	q.addColorStop(0.5, 'rgba(255,255,255,0)');
	q.addColorStop(1, 'rgba(70,90,150,.16)');
	x.fillStyle = q;
	x.fillRect(0, 0, 64, 64);
	return c;
});

const streakCache = new Map<number, HTMLCanvasElement>();

/** Blizzard streak, tinted per flake. */
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

/** Pellet: an ice diamond. */
export const pelletTexture = lazy(() =>
	makeTexture(10, 10, (x) => {
		const q = x.createLinearGradient(2, 1, 8, 9);
		q.addColorStop(0, '#f4fcff');
		q.addColorStop(1, '#62b8e6');
		x.fillStyle = q;
		x.beginPath();
		x.moveTo(5, 0.8);
		x.lineTo(7.8, 5);
		x.lineTo(5, 9.2);
		x.lineTo(2.2, 5);
		x.closePath();
		x.fill();
		x.strokeStyle = 'rgba(255,255,255,.8)';
		x.lineWidth = 0.5;
		x.beginPath();
		x.moveTo(2.2, 5);
		x.lineTo(7.8, 5);
		x.moveTo(5, 0.8);
		x.lineTo(5, 9.2);
		x.stroke();
	})
);

/** Energizer: an eight-pointed snow crystal. */
export const crystalTexture = lazy(() =>
	makeTexture(20, 20, (x) => {
		x.translate(10, 10);
		const g = x.createRadialGradient(-2, -2, 0.5, 0, 0, 9);
		g.addColorStop(0, '#ffffff');
		g.addColorStop(0.5, '#9fe0ff');
		g.addColorStop(1, '#3b8fd0');
		x.fillStyle = g;
		x.beginPath();
		for (let i = 0; i < 8; i++) {
			const a = (i * Math.PI) / 4 - Math.PI / 2;
			const r = i % 2 ? 4.8 : 9;
			if (i) {
				x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
			} else {
				x.moveTo(Math.cos(a) * r, Math.sin(a) * r);
			}
		}
		x.closePath();
		x.fill();
		x.strokeStyle = 'rgba(255,255,255,.8)';
		x.lineWidth = 0.6;
		x.beginPath();
		for (let i = 0; i < 8; i += 2) {
			const a = (i * Math.PI) / 4 - Math.PI / 2;
			x.moveTo(0, 0);
			x.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
		}
		x.stroke();
		x.fillStyle = '#fff';
		x.beginPath();
		x.arc(0, 0, 1.7, 0, 7);
		x.fill();
	})
);

/** Portal swirl: three spiral arms. */
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

export const ringTexture = lazy(() =>
	makeTexture(20, 20, (x) => {
		x.strokeStyle = 'rgba(170,232,255,.95)';
		x.lineWidth = 1.2;
		x.beginPath();
		x.arc(10, 10, 8.8, 0, 7);
		x.stroke();
	})
);
