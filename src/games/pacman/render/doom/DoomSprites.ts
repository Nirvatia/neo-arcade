// Sprites of the CLAUDE_GRID_DOOM_v3 prototype: drawn once at 3x and downscaled on draw.
import type { DoomPickupKind } from '../../logic/doom/DoomPickupModel';
import {
	makeCanvas,
	canvasContext,
	hexChannels,
	makeTexture,
	radialTexture
} from '../common/textures';

export { glowTexture } from '../common/textures';

const edge = (x: CanvasRenderingContext2D): void => {
	x.strokeStyle = '#0a0a0a';
	x.lineWidth = 1.1;
};

function lazy<V>(make: () => V): () => V {
	let value: V | null = null;
	return () => (value ??= make());
}

export const fogTexture = lazy(() => {
	const [a, b, c] = hexChannels(0x9a7a70);
	const m = (v: number, q: number) => Math.round((v * q) / 255);
	const col = (al: number) => `rgba(${m(200, a)},${m(170, b)},${m(160, c)},${al})`;
	return radialTexture(256, [
		[0, col(0.9)],
		[1, col(0)]
	]);
});

export const litTexture = lazy(() =>
	radialTexture(256, [
		[0, 'rgba(150,200,255,.16)'],
		[1, 'rgba(255,205,130,0)']
	])
);

export const vignetteTexture = lazy(() =>
	radialTexture(256, [
		[0.5, 'rgba(0,0,0,0)'],
		[1, 'rgba(0,0,0,.62)']
	])
);

export const washTexture = lazy(() => {
	const c = makeCanvas(64, 64);
	const x = canvasContext(c);
	const q = x.createLinearGradient(0, 0, 64, 64);
	q.addColorStop(0, 'rgba(160,190,230,.12)');
	q.addColorStop(0.5, 'rgba(255,255,255,0)');
	q.addColorStop(1, 'rgba(150,25,10,.2)');
	x.fillStyle = q;
	x.fillRect(0, 0, 64, 64);
	return c;
});

/** White streak texture tinted 0xffb050 (wind-blown ember). */
export const streakTexture = lazy(() =>
	makeTexture(16, 2, (x) => {
		const q = x.createLinearGradient(0, 0, 16, 0);
		q.addColorStop(0, 'rgba(255,176,80,0)');
		q.addColorStop(1, 'rgba(255,176,80,1)');
		x.fillStyle = q;
		x.fillRect(0, 0, 16, 2);
	})
);

const bfgTexture = lazy(() =>
	makeTexture(26, 26, (x) => {
		x.translate(13, 13);
		edge(x);
		x.fillStyle = '#3a3f44';
		x.beginPath();
		x.rect(-11.5, -3, 15, 8);
		x.fill();
		x.stroke();
		x.fillStyle = '#2a2e33';
		x.beginPath();
		x.rect(-7, 5, 4, 6);
		x.fill();
		x.stroke();
		x.fillStyle = '#4a5058';
		x.beginPath();
		x.moveTo(4, -6);
		x.lineTo(12, -9);
		x.lineTo(12, 11);
		x.lineTo(4, 8);
		x.closePath();
		x.fill();
		x.stroke();
		x.strokeStyle = '#40ff50';
		x.lineWidth = 1;
		for (let i = 0; i < 3; i++) {
			x.beginPath();
			x.moveTo(-8 + i * 4, -2);
			x.lineTo(-8 + i * 4, 4);
			x.stroke();
		}
		const g = x.createRadialGradient(10, 1, 0.5, 10, 1, 6);
		g.addColorStop(0, '#f0fff0');
		g.addColorStop(0.5, '#40ff50');
		g.addColorStop(1, '#0a6a1a');
		x.fillStyle = g;
		x.beginPath();
		x.ellipse(10, 1, 3, 6.5, 0, 0, 7);
		x.fill();
	})
);

const barrelTexture = lazy(() =>
	makeTexture(26, 26, (x) => {
		x.translate(13, 13);
		edge(x);
		const g = x.createLinearGradient(-8, 0, 8, 0);
		g.addColorStop(0, '#4a6a24');
		g.addColorStop(0.4, '#8aae4a');
		g.addColorStop(1, '#3a5a1a');
		x.fillStyle = g;
		x.beginPath();
		x.rect(-8, -8, 16, 19);
		x.fill();
		x.stroke();
		x.fillStyle = '#a8c86a';
		x.beginPath();
		x.ellipse(0, -8, 8, 2.8, 0, 0, 7);
		x.fill();
		x.stroke();
		x.strokeStyle = '#1a2a0a';
		x.beginPath();
		x.moveTo(-8, -3);
		x.lineTo(8, -3);
		x.moveTo(-8, 6);
		x.lineTo(8, 6);
		x.stroke();
		x.fillStyle = '#ffd23f';
		x.beginPath();
		x.arc(0, 1.5, 3.4, 0, 7);
		x.fill();
		x.fillStyle = '#14110f';
		x.beginPath();
		x.arc(0, 1.5, 1.1, 0, 7);
		x.fill();
	})
);

const medkitTexture = lazy(() =>
	makeTexture(26, 26, (x) => {
		x.translate(13, 13);
		edge(x);
		x.fillStyle = '#f2efe6';
		x.beginPath();
		x.rect(-10, -8.5, 20, 17);
		x.fill();
		x.stroke();
		x.fillStyle = '#d01a10';
		x.fillRect(-2.6, -6.5, 5.2, 13);
		x.fillRect(-7, -2.6, 14, 5.2);
		x.fillStyle = 'rgba(0,0,0,.15)';
		x.fillRect(-10, 5.5, 20, 3);
	})
);

/** Berserk: a clenched red gauntlet with steel spikes on the knuckles and a steel cuff. */
const fistTexture = lazy(() =>
	makeTexture(26, 26, (x) => {
		x.translate(13, 14);
		edge(x);
		// cuff
		const cuff = x.createLinearGradient(-6, 0, 6, 0);
		cuff.addColorStop(0, '#4a4c56');
		cuff.addColorStop(0.45, '#c8ccd8');
		cuff.addColorStop(1, '#3a3c46');
		x.fillStyle = cuff;
		x.beginPath();
		x.rect(-6.5, 4, 13, 7.5);
		x.fill();
		x.stroke();
		x.fillStyle = '#b01410';
		x.fillRect(-6.5, 6.6, 13, 2);
		// back of the hand
		const leather = x.createLinearGradient(0, -9, 0, 6);
		leather.addColorStop(0, '#ff5a3a');
		leather.addColorStop(0.5, '#c8180e');
		leather.addColorStop(1, '#6a0806');
		x.fillStyle = leather;
		x.beginPath();
		x.roundRect(-9.5, -8, 19, 13.5, 3);
		x.fill();
		x.stroke();
		// four curled fingers, knuckles up
		for (let i = 0; i < 4; i += 1) {
			const fx = -9.5 + i * 4.75;
			x.fillStyle = leather;
			x.beginPath();
			x.roundRect(fx, -8, 4.75, 8, 2.2);
			x.fill();
			x.stroke();
			x.fillStyle = 'rgba(255,220,200,.45)';
			x.beginPath();
			x.ellipse(fx + 2.4, -6.3, 1.4, 0.8, 0, 0, 7);
			x.fill();
			// spike
			x.fillStyle = '#e8ecf4';
			x.beginPath();
			x.moveTo(fx + 1.1, -8);
			x.lineTo(fx + 2.4, -11.8);
			x.lineTo(fx + 3.6, -8);
			x.closePath();
			x.fill();
			x.lineWidth = 0.6;
			x.stroke();
			x.lineWidth = 1.1;
		}
		// thumb across the fingers
		const thumb = x.createLinearGradient(0, -1, 0, 4);
		thumb.addColorStop(0, '#e0301e');
		thumb.addColorStop(1, '#7a0a08');
		x.fillStyle = thumb;
		x.beginPath();
		x.roundRect(-9.5, -1.2, 12, 5, 2.4);
		x.fill();
		x.stroke();
	})
);

/** Icon and glow tint per pickup kind; berserk is the fist. */
export function pickupSprite(kind: DoomPickupKind): { icon: HTMLCanvasElement; glow: number } {
	if (kind === 'bfg') {
		return { icon: bfgTexture(), glow: 0x40ff50 };
	}
	if (kind === 'barrel') {
		return { icon: barrelTexture(), glow: 0xb8ff30 };
	}
	if (kind === 'medkit') {
		return { icon: medkitTexture(), glow: 0xff3a2a };
	}
	return { icon: fistTexture(), glow: 0xff7a1a };
}

export const barrelSprite = barrelTexture;
