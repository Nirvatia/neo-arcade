// Summer, from the owner's CLAUDE_GRID_SUMMER mock-up: lush meadow, beach umbrellas, a
// turquoise stream, heat shimmer and fireflies, a violet night. The food is redrawn after
// the owner's reviews: calm amber drops for pellets and little suns for energizers on a
// warm dark sand, a faint heat haze and a lighter night, so the food reads at a glance.
import type { MeadowTheme, WeatherParticle } from '../meadow/MeadowTheme';
import {
	glowTexture,
	lazy,
	makeTexture,
	radial,
	ringTexture,
	tinted,
	washTexture
} from '../meadow/meadowSprites';
import type { DecayPalette } from '../../transitions/decay/DecayPass';

/**
 * Pellet: a small amber drop, ~5 world units across (a fifth of a tile). Light centre and
 * a dark rim so it holds against the sand; no inner detail, because 200 of them are on
 * screen at once.
 */
const drop = lazy(() =>
	makeTexture(10, 10, (x) => {
		x.translate(5, 5);
		x.fillStyle = 'rgba(90,45,10,.35)';
		x.beginPath();
		x.arc(0.5, 0.7, 2.7, 0, 7);
		x.fill();
		const g = x.createRadialGradient(-0.8, -0.9, 0.2, 0, 0, 2.6);
		g.addColorStop(0, '#fffbe2');
		g.addColorStop(0.55, '#ffd56a');
		g.addColorStop(1, '#f29a2e');
		x.fillStyle = g;
		x.beginPath();
		x.arc(0, 0, 2.6, 0, 7);
		x.fill();
		x.strokeStyle = '#a8501a';
		x.lineWidth = 0.7;
		x.stroke();
	})
);

/**
 * Energizer: a little sun, a hot disc with eight rays, turning slowly. The watermelon slice
 * it replaces clashed with the melon (owner's review): an energizer is power, never food or
 * a collectible.
 */
const sun = lazy(() =>
	makeTexture(24, 24, (x) => {
		x.translate(12, 12);
		x.lineJoin = 'round';
		const rays = () => {
			x.beginPath();
			for (let i = 0; i < 8; i++) {
				const a = (i * Math.PI) / 4;
				const side = Math.PI / 11;
				x.moveTo(Math.cos(a - side) * 6, Math.sin(a - side) * 6);
				x.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
				x.lineTo(Math.cos(a + side) * 6, Math.sin(a + side) * 6);
				x.closePath();
			}
		};
		x.strokeStyle = '#7a3a00';
		x.lineWidth = 1.6;
		rays();
		x.stroke();
		x.fillStyle = '#ff9a1f';
		rays();
		x.fill();
		x.beginPath();
		x.arc(0, 0, 6.2, 0, 7);
		x.stroke();
		const g = x.createRadialGradient(-1.6, -1.8, 0.4, 0, 0, 6.2);
		g.addColorStop(0, '#fffbe0');
		g.addColorStop(0.5, '#ffd84a');
		g.addColorStop(1, '#ff9a1f');
		x.fillStyle = g;
		x.beginPath();
		x.arc(0, 0, 6.2, 0, 7);
		x.fill();
	})
);

const fog = lazy(() =>
	tinted(
		radial([
			[0, 'rgba(255,244,210,.9)'],
			[1, 'rgba(255,244,210,0)']
		]),
		0xfff1c8
	)
);

/** Heat shimmer band, white: tinted below. */
const band = lazy(() =>
	makeTexture(48, 6, (x) => {
		const q = x.createLinearGradient(0, 0, 48, 0);
		q.addColorStop(0, 'rgba(255,255,255,0)');
		q.addColorStop(0.5, 'rgba(255,255,255,.6)');
		q.addColorStop(1, 'rgba(255,255,255,0)');
		x.fillStyle = q;
		x.beginPath();
		x.ellipse(24, 3, 24, 2.2, 0, 0, 7);
		x.fill();
	})
);

/** Abyss of a summer night: deep indigo, turquoise wisps, warm sparks. */
const SUMMER_DECAY: DecayPalette = {
	deep: 0x0a0718,
	mid: 0x1e1a4a,
	wisp: 0x3fe0d0,
	ice: 0xffe8a8,
	rim: 0xffb347,
	warm: 0xfff4d0
};

export const summerTheme: MeadowTheme = {
	name: 'summer',
	bake: {
		bg: '#8cc152',
		groundCenter: '#c6e67e',
		groundBlobs: ['rgba(255,248,170,.35)', 'rgba(30,90,30,.08)'],
		grass: ['#4f8f2fcc', '#6fb03c99', '#3a7a28aa', '#d8f27a88'],
		curls: 'rgba(255,244,160,.25)',
		stream: ['rgba(30,90,60,.35)', '#ecdca8', '#26b5c9', 'rgba(160,245,240,.6)'],
		shadow: '60,45,15',
		bush: ['#8fdc4f', '#2f7a2c'],
		pond: {
			sand: '#f0dca0',
			water: ['#8ff0ea', '#1a8fb0'],
			rim: 'rgba(10,90,110,.45)',
			highlight: 'rgba(255,255,255,.85)',
			stones: '#cdb27a'
		},
		bridge: { caps: '#8fd05a', middle: 'rgba(90,190,70,.7)' },
		cabin: {
			walls: ['#f08a4b', '#d9693a', '#c24f2c', '#9b3a22'],
			roofBlobs: 'rgba(255,214,150,.22)',
			ridge: '#ffe7a8',
			ridgeShadow: 'rgba(120,50,20,.5)',
			chimneyCap: '#d8cdbf'
		},
		rock: ['#d8c9a8', '#8a7a5c', '#efe2c0', '#c8b68c'],
		// muted (owner's review): the ghosts and the Easter egg must read on the lair floor
		lair: { base: '#4e3a22', tiles: ['#7a603c', '#735a37', '#806642'] },
		// warm dark sand (owner's reviews; the mock-up's was #dcbd84): the food must pop
		floor: {
			tiles: ['#8d6b40', '#87663b', '#937045'],
			specks: ['#9e7c4e', '#6e5030', '#a6845a']
		},
		portal: {
			trail: (a) => `rgba(190,150,90,${a * 0.5})`,
			grass: ['#7fb34a', '#5f9a3a', '#b8dc6a'],
			plate: ['#f0dfb0', '#b08d58'],
			core: ['#d6fff6', '#1fc2b4', '#0b5a66'],
			ring: '#7ff5e0',
			corners: '#fff3cf'
		},
		wall: {
			base: '#2f5a2a',
			moss: ['#5fae3e', '#2f7a2c'],
			top: ['#86cc4e', '#8fd356', '#7cc247'],
			bottom: ['#3f8f2e', '#468f30', '#3a842c'],
			mossSpecks: ['#ffd23f', '#ff7a59', '#fff4c2'],
			specks: ['rgba(214,255,140,.4)', 'rgba(15,70,20,.3)'],
			crack: 'rgba(15,70,20,.25)',
			joints: 'rgba(15,70,20,.2)',
			drifts: ['#a6e65e', '#c4f57e'],
			light: 'rgba(230,255,170,.45)',
			dark: 'rgba(10,50,15,.4)',
			flowers: ['#ff5c8a', '#ffd23f', '#ffffff'],
			shadow: 'rgba(25,50,15,.5)'
		},
		edgeGrass: ['#7fb34a', '#5f9a3a', '#b8dc6a'],
		trees: {
			accent: ['#d4f08a', '#6dba45', '#2f7a2c'],
			plain: ['#b6ee6e', '#5fae3e', '#2a6a2a'],
			accentDots: ['rgba(255,140,40,.95)', 'rgba(20,70,25,.5)'],
			plainDots: ['rgba(214,255,140,.7)', 'rgba(20,70,25,.45)'],
			drifts: 'rgba(30,80,30,.25)'
		},
		landmark: {
			ex: [2.4, 2.2],
			// a striped beach umbrella
			draw: ({ b, blob, shade }, o) => {
				const r = o.r ?? 0;
				blob(o.x + r * 0.9, o.y + r * 1.1, r * 2.2, r * 1.7, shade(0.3), 0);
				const U = r * 2;
				for (let i = 0; i < 8; i++) {
					b.fillStyle = i % 2 ? '#ff5a4f' : '#fff4dc';
					b.beginPath();
					b.moveTo(o.x, o.y);
					b.arc(o.x, o.y, U, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4);
					b.closePath();
					b.fill();
				}
				b.strokeStyle = 'rgba(120,40,30,.5)';
				b.lineWidth = 1.2;
				b.beginPath();
				b.arc(o.x, o.y, U, 0, 7);
				b.stroke();
				blob(o.x, o.y, 3, 3, '#ffd23f', 0);
			}
		},
		flowerPatch: ({ rr, pick, fl5 }, o) => {
			const c = o.c ?? 0;
			const cl =
				c < 0.3
					? ['#ffffff', '#f6f2d0']
					: c < 0.55
						? ['#ffd23f', '#ffe36e']
						: c < 0.8
							? ['#e8383d', '#ff6b6b']
							: ['#a77bff', '#d9c2ff'];
			const mid = c >= 0.3 && c < 0.55 ? '#8a4b14' : '#ffcf4d';
			for (let i = 0; i < (o.n ?? 0); i++) {
				fl5(o.x + rr(-16, 16), o.y + rr(-12, 12), rr(2, 3), pick(cl), mid);
			}
		},
		pondExtras: ({ blob, fl5 }, o) => {
			const rx = o.rx ?? 0;
			const ry = o.ry ?? 0;
			for (let i = 0; i < 4; i++) {
				const a = i * 1.7 + 0.5;
				const px = o.x + Math.cos(a) * rx * 0.45;
				const py = o.y + Math.sin(a) * ry * 0.45;
				blob(px, py, 6, 4.5, '#3fae4a', 0);
				if (i % 2) {
					fl5(px, py, 2.4, '#ff9ec4', '#ffe14d');
				}
			}
		}
	},
	live: {
		pellet: { texture: drop, size: 10 },
		energizer: {
			texture: sun,
			size: 24,
			glow: 0xffb030,
			glowSize: (64 * 0.85) / 3,
			motion: 'spin'
		},
		portal: { glow: 0x5ff5d8, ring: () => ringTexture('rgba(120,255,225,.95)') },
		glints: 0xfff7c0,
		fog,
		// the heat's haze stays faint (owner's review): big pale blobs hid the food
		mistAlpha: (s) => 0.05 + 0.06 * s,
		mistSpeed: (s) => 1 + 3 * s,
		rays: (t, i, s, n) => (0.1 + 0.05 * Math.sin(t * 0.6 + i * 2)) * (1 + s) * (1 - 0.8 * n),
		lit: lazy(() =>
			radial([
				[0, 'rgba(255,226,150,.3)'],
				[1, 'rgba(255,205,130,0)']
			])
		),
		litAlpha: (s, n) => (0.8 + 0.7 * s) * (1 - 0.7 * n),
		drift: {
			texture: () => glowTexture(0xfff0a0),
			size: (sc, rand) => {
				const s = 64 * sc * (0.035 + rand * 0.05);
				return [s, s];
			},
			direction: -1,
			speed: 10,
			spin: false
		},
		wash: lazy(() => washTexture('rgba(255,225,130,.22)', 'rgba(255,150,60,.08)')),
		stormTint: '#ff9d3a',
		stormAlpha: 0.14,
		weather: {
			count: 60,
			make: (i, vw, vh): WeatherParticle => {
				const st = i % 2 === 0;
				const s = st ? 1 + Math.random() * 1.5 : 0.12 + Math.random() * 0.14;
				return {
					st,
					im: st ? tinted(band(), 0xfff0c0) : glowTexture(0xffd36a),
					w: st ? 48 * s : (64 * s) / 3,
					h: st ? 6 * s : (64 * s) / 3,
					px: Math.random() * vw,
					py: Math.random() * vh,
					vx: 0,
					vy: st ? 0.5 + Math.random() * 0.7 : 0.8 + Math.random() * 1.2,
					ph: Math.random() * 6,
					rot: 0,
					add: false
				};
			},
			step: (p, d, t, s, vw, vh) => {
				p.px += (p.st ? Math.sin(t * 1.6 + p.ph) * 0.5 : Math.sin(t * 2 + p.ph) * 0.6) * d;
				p.py -= p.vy * d * s;
				if (p.py < -30) {
					p.py = vh + 30;
					p.px = Math.random() * vw;
				}
			},
			alpha: (p, s) => s * (p.st ? 0.12 : 0.5)
		},
		nightTint: '#4a3f86',
		nightAlpha: 0.45,
		vignette: lazy(() =>
			radial([
				[0.5, 'rgba(70,45,10,0)'],
				[1, 'rgba(70,45,10,.32)']
			])
		),
		lights: { energizer: 0xffb84a, portal: 0x6ff5da },
		chimneySmoke: false
	},
	decay: SUMMER_DECAY
};
