// Autumn, from the owner's CLAUDE_GRID_AUTUMN mock-up: golden meadow, maples, hay bales,
// fly-agaric energizers, falling leaves, rain, a grey-violet night. Pellets are redrawn
// after the owner's review: a small, calm acorn instead of the large one.
import type { MeadowTheme, WeatherParticle } from '../meadow/MeadowTheme';
import {
	lazy,
	makeTexture,
	radial,
	ringTexture,
	streakTexture,
	tinted,
	washTexture
} from '../meadow/meadowSprites';
import type { DecayPalette } from '../../transitions/decay/DecayPass';

const LEAVES = [0xe0502a, 0xf0a82a, 0xffd070, 0xb8641a];

/**
 * Pellet: a small acorn, ~5×6 world units (a fifth of a tile): a light amber nut under a
 * darker cap, no outline clutter, bright enough for the dark path.
 */
const acorn = lazy(() =>
	makeTexture(10, 10, (x) => {
		x.translate(5, 5.3);
		const g = x.createRadialGradient(-0.7, 0, 0.2, 0, 0.6, 2.6);
		g.addColorStop(0, '#fff0bf');
		g.addColorStop(0.6, '#f2c060');
		g.addColorStop(1, '#d08a2e');
		x.fillStyle = g;
		x.beginPath();
		x.ellipse(0, 0.7, 2.2, 2.6, 0, 0, 7);
		x.fill();
		x.fillStyle = '#8a4a1e';
		x.beginPath();
		x.ellipse(0, -1.3, 2.6, 1.35, 0, 0, 7);
		x.fill();
		x.fillRect(-0.35, -3.6, 0.7, 1.4);
		x.fillStyle = 'rgba(255,220,160,.55)';
		x.beginPath();
		x.ellipse(-0.7, -1.7, 1, 0.4, 0, 0, 7);
		x.fill();
	})
);

const amanita = lazy(() =>
	makeTexture(26, 26, (x) => {
		x.translate(13, 13);
		x.lineWidth = 1.2;
		x.strokeStyle = '#4a1408';
		x.fillStyle = '#f6e8c8';
		x.beginPath();
		x.moveTo(-3.6, 2);
		x.lineTo(-4.4, 10.5);
		x.quadraticCurveTo(0, 12.6, 4.4, 10.5);
		x.lineTo(3.6, 2);
		x.closePath();
		x.fill();
		x.stroke();
		const g = x.createLinearGradient(0, -10, 0, 4);
		g.addColorStop(0, '#ff8a5a');
		g.addColorStop(1, '#c0261a');
		x.fillStyle = g;
		x.beginPath();
		x.moveTo(-11.5, 3.5);
		x.bezierCurveTo(-11.5, -12, 11.5, -12, 11.5, 3.5);
		x.quadraticCurveTo(0, 6.5, -11.5, 3.5);
		x.closePath();
		x.fill();
		x.stroke();
		x.fillStyle = '#fff7e0';
		for (const [a, c, r] of [
			[-5, -2.5, 2.4],
			[3, -5.5, 2.6],
			[6.5, -0.5, 1.8],
			[-0.5, 0, 1.5]
		]) {
			x.beginPath();
			x.arc(a, c, r, 0, 7);
			x.fill();
		}
	})
);

/** A single leaf, white: tinted per particle. */
const leaf = lazy(() =>
	makeTexture(10, 6, (x) => {
		x.fillStyle = '#fff';
		x.beginPath();
		x.moveTo(0.5, 3);
		x.quadraticCurveTo(5, -1.5, 9.5, 3);
		x.quadraticCurveTo(5, 7.5, 0.5, 3);
		x.fill();
	})
);

const fog = lazy(() =>
	tinted(
		radial([
			[0, 'rgba(240,215,175,.9)'],
			[1, 'rgba(240,215,175,0)']
		]),
		0xe8d2b0
	)
);

/** Abyss of an autumn night: smoky umber, amber wisps, violet sparks. */
const AUTUMN_DECAY: DecayPalette = {
	deep: 0x120a06,
	mid: 0x3a2214,
	wisp: 0xf0a030,
	ice: 0xffd8a0,
	rim: 0xff7a3a,
	warm: 0xfff0d0
};

export const autumnTheme: MeadowTheme = {
	name: 'autumn',
	bake: {
		bg: '#8b7a3a',
		groundCenter: '#b59a4c',
		groundBlobs: ['rgba(255,200,110,.3)', 'rgba(60,30,5,.1)'],
		grass: ['#7a6a2acc', '#a08a3e99', '#6a5a24aa', '#d8b86088'],
		curls: 'rgba(230,190,110,.22)',
		stream: ['rgba(40,30,10,.35)', '#cdb57e', '#4a8aa5', 'rgba(150,200,215,.55)'],
		shadow: '50,30,10',
		bush: ['#f0a030', '#a8421a'],
		pond: {
			sand: '#c9b27a',
			water: ['#8fc0d0', '#3a6f88'],
			rim: 'rgba(30,50,60,.45)',
			highlight: 'rgba(255,255,255,.6)',
			stones: '#a38a55'
		},
		bridge: { caps: '#e0762a', middle: 'rgba(220,90,30,.8)' },
		cabin: {
			walls: ['#bb6851', '#a65240', '#87423b', '#6a342f'],
			roofBlobs: 'rgba(224,110,30,.5)',
			ridge: '#6a2f1a',
			ridgeShadow: 'rgba(60,25,10,.5)',
			chimneyCap: '#5a3a28'
		},
		rock: ['#a89c88', '#5f5648', '#8a9a4a', '#b0a28a'],
		lair: { base: '#2a1c12', tiles: ['#8c6a46', '#80603e', '#957250'] },
		floor: {
			tiles: ['#4a3426', '#45301f', '#503a2a'],
			specks: ['#5e4634', '#2e2016', '#6b5240']
		},
		portal: {
			trail: (a) => `rgba(60,42,28,${a * 0.55})`,
			grass: ['#c9a04a', '#a8762a', '#e0b860'],
			plate: ['#8a7660', '#4a3a2c'],
			core: ['#f0d8ff', '#9a4fe0', '#2a0f52'],
			ring: '#d9a8ff',
			corners: '#f0e0c0'
		},
		// warmer and lighter than the mock-up's rust-brown stones (owner's review)
		wall: {
			base: '#7c3614',
			moss: ['#c0502e', '#82301a'],
			top: ['#dc9c4e', '#e2a456', '#d49447'],
			bottom: ['#a65a28', '#ad622d', '#9c5224'],
			mossSpecks: ['#ffd27a', '#e0602e', '#fff0c0'],
			specks: ['rgba(255,225,150,.35)', 'rgba(90,30,5,.28)'],
			crack: 'rgba(90,30,5,.25)',
			joints: 'rgba(90,30,5,.18)',
			drifts: ['#e8743a', '#f6c25a'],
			light: 'rgba(255,236,180,.45)',
			dark: 'rgba(80,28,6,.38)',
			flowers: ['#e0502a', '#ffc84a', '#fff0c8'],
			shadow: 'rgba(40,15,5,.45)'
		},
		edgeGrass: ['#c9a04a', '#a8762a', '#e0b860'],
		trees: {
			accent: ['#ffd070', '#e0502a', '#8f2214'],
			plain: ['#fff0a0', '#f0a82a', '#b8641a'],
			accentDots: ['rgba(255,230,120,.85)', 'rgba(100,20,10,.5)'],
			plainDots: ['rgba(255,248,190,.8)', 'rgba(120,60,10,.45)'],
			drifts: 'rgba(230,120,30,.5)'
		},
		landmark: {
			ex: [2.4, 2.2],
			// a round hay bale seen from above
			draw: ({ b, blob, sph, shade }, o) => {
				const r = o.r ?? 0;
				blob(o.x + r * 0.9, o.y + r, r * 2.1, r * 1.6, shade(0.3), 0);
				const U = r * 2;
				sph(o.x, o.y, U, '#f6d878', '#c9922e');
				b.strokeStyle = 'rgba(120,70,10,.5)';
				b.lineWidth = 1.2;
				for (let i = 1; i < 5; i++) {
					b.beginPath();
					b.arc(o.x, o.y, (U * i) / 5, 0, 7);
					b.stroke();
				}
			}
		},
		// fallen leaves instead of flowers
		flowerPatch: ({ rr, pick, blob }, o) => {
			const c = o.c ?? 0;
			const cl =
				c < 0.3
					? ['#e0502a', '#c0381a']
					: c < 0.55
						? ['#f0a82a', '#ffc84a']
						: c < 0.8
							? ['#c9702a', '#a8501a']
							: ['#8a3a1a', '#6a2a10'];
			for (let i = 0; i < (o.n ?? 0); i++) {
				blob(o.x + rr(-16, 16), o.y + rr(-12, 12), rr(2.4, 4), rr(1.3, 2.2), pick(cl));
			}
		},
		pondExtras: ({ blob, pick }, o) => {
			const rx = o.rx ?? 0;
			const ry = o.ry ?? 0;
			for (let i = 0; i < 5; i++) {
				const a = i * 1.3 + 0.4;
				blob(
					o.x + Math.cos(a) * rx * 0.5,
					o.y + Math.sin(a) * ry * 0.5,
					5,
					3,
					pick(['#e0502a', '#f0a82a', '#c9702a'])
				);
			}
		}
	},
	live: {
		pellet: { texture: acorn, size: 10 },
		energizer: {
			texture: amanita,
			size: 26,
			glow: 0xff4a2a,
			glowSize: (64 * 0.95) / 3,
			motion: 'sway'
		},
		portal: { glow: 0xc88aff, ring: () => ringTexture('rgba(220,170,255,.95)') },
		glints: 0xffffff,
		fog,
		mistAlpha: (s) => 0.1 + 0.22 * s,
		mistSpeed: (s) => 1 + 6 * s,
		rays: (t, i, s, n) => (0.12 + 0.05 * Math.sin(t * 0.5 + i * 2)) * (1 - 0.8 * n) * (1 - s),
		lit: lazy(() =>
			radial([
				[0, 'rgba(255,190,110,.3)'],
				[1, 'rgba(255,205,130,0)']
			])
		),
		litAlpha: () => 1,
		drift: {
			texture: (i) => tinted(leaf(), LEAVES[i % 4]),
			size: (_sc, rand) => {
				const s = 0.18 + rand * 0.14;
				return [30 * s, 18 * s];
			},
			direction: 1,
			speed: 16,
			spin: true
		},
		wash: lazy(() => washTexture('rgba(255,170,80,.18)', 'rgba(90,40,20,.14)')),
		stormTint: '#4a5870',
		stormAlpha: 0.3,
		weather: {
			count: 260,
			make: (i, vw, vh): WeatherParticle => {
				const s = 0.9 + Math.random() * 0.9;
				const vx = 3 + Math.random() * 2;
				const vy = 20 + Math.random() * 10;
				return {
					st: true,
					im: streakTexture(i % 3 === 0 ? 0xe6f0fa : 0xa9c4dc),
					w: 16 * s,
					h: 2 * s * 0.4,
					px: Math.random() * vw,
					py: Math.random() * vh,
					vx,
					vy,
					ph: 0,
					rot: Math.atan2(vy, vx),
					add: false
				};
			},
			step: (p, d, _t, s, vw, vh) => {
				p.px += p.vx * d * s;
				p.py += p.vy * d * s;
				if (p.py > vh + 30) {
					p.py = -30;
					p.px = Math.random() * vw;
				}
				if (p.px > vw + 30) {
					p.px = -30;
				}
			},
			alpha: (_p, s) => s * 0.6
		},
		nightTint: '#3a3a70',
		nightAlpha: 0.55,
		vignette: lazy(() =>
			radial([
				[0.5, 'rgba(40,18,5,0)'],
				[1, 'rgba(40,18,5,.42)']
			])
		),
		lights: { energizer: 0xff5a3a, portal: 0xc88aff },
		chimneySmoke: true
	},
	decay: AUTUMN_DECAY
};
