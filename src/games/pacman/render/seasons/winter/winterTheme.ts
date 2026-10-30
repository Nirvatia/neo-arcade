// Winter, from the owner's CLAUDE_GRID_WINTER mock-up: snowy meadow, frozen stream,
// snowmen, ice-diamond pellets and snow-crystal energizers, a blizzard, a blue night.
import type { MeadowTheme, WeatherParticle } from '../meadow/MeadowTheme';
import {
	glowTexture,
	lazy,
	makeTexture,
	radial,
	ringTexture,
	streakTexture,
	tinted,
	washTexture
} from '../meadow/meadowSprites';
import { ICE_PALETTE } from '../../transitions/decay/LevelDecay';

const pellet = lazy(() =>
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

const crystal = lazy(() =>
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

const fog = lazy(() =>
	tinted(
		radial([
			[0, 'rgba(235,245,235,.9)'],
			[1, 'rgba(235,245,235,0)']
		]),
		0xdbe8f5
	)
);

export const winterTheme: MeadowTheme = {
	name: 'winter',
	bake: {
		bg: '#c9d8e8',
		groundCenter: '#f2f7fc',
		groundBlobs: ['rgba(255,255,255,.4)', 'rgba(90,120,170,.06)'],
		grass: ['#9aa888aa', '#b8c0a488', '#6f7f66aa', '#ffffff66'],
		curls: 'rgba(150,175,215,.28)',
		stream: ['rgba(70,95,130,.35)', '#dbe9f3', '#b4d6e8', 'rgba(150,200,225,.6)'],
		shadow: '50,70,110',
		bush: ['#ffffff', '#a9bfd6'],
		pond: {
			sand: '#f4f9fd',
			water: ['#eaf6fd', '#8fc3de'],
			rim: 'rgba(60,100,140,.35)',
			highlight: 'rgba(255,255,255,.85)',
			stones: '#ffffff'
		},
		bridge: { caps: '#f4f9fd', middle: 'rgba(255,255,255,.9)' },
		cabin: {
			walls: ['#bb6851', '#a65240', '#87423b', '#6a342f'],
			roofBlobs: 'rgba(248,252,255,.93)',
			ridge: '#f6fafd',
			ridgeShadow: 'rgba(110,130,160,.45)',
			chimneyCap: '#f4f9fd'
		},
		rock: ['#b9c4d0', '#6f7d8d', '#ffffff', '#e8f1f9'],
		lair: { base: '#6a7688', tiles: ['#dbe6f0', '#cfdde9', '#c3d3e2'] },
		floor: {
			tiles: ['#566274', '#515d6f', '#5b6779'],
			specks: ['#6a768a', '#3a4452', '#7a869a']
		},
		portal: {
			trail: (a) => `rgba(86,98,116,${a * 0.55})`,
			grass: ['#b9c4a6', '#8a9a7a', '#e8eef2'],
			plate: ['#aeb9c6', '#6c7a8c'],
			core: ['#d8f4ff', '#4f9fd8', '#1b2d52'],
			ring: '#9fe3ff',
			corners: '#f4f9fd'
		},
		wall: {
			base: '#5d6a62',
			moss: ['#4f7f66', '#2f5a4a'],
			top: ['#a3afbf', '#a9b0bd', '#9aa8b8'],
			bottom: ['#7a8799', '#838c9a', '#74869a'],
			mossSpecks: ['#8fb8a2', '#2a4f40', '#e8f2f8'],
			specks: ['rgba(255,255,255,.4)', 'rgba(40,55,48,.3)'],
			crack: 'rgba(50,65,58,.22)',
			joints: 'rgba(45,60,72,.17)',
			drifts: ['#f4f9fd', '#ffffff'],
			light: 'rgba(255,255,240,.4)',
			dark: 'rgba(30,45,38,.32)',
			flowers: ['#d9333a', '#ff6b6b', '#ffffff'],
			shadow: 'rgba(30,40,70,.45)'
		},
		edgeGrass: ['#b9c4a6', '#8a9a7a', '#e8eef2'],
		trees: {
			accent: ['#ffffff', '#9fbfae', '#3b6a58'],
			plain: ['#f4f9fd', '#b4c8d8', '#5a7a8e'],
			accentDots: ['rgba(255,255,255,.85)', 'rgba(40,90,70,.5)'],
			plainDots: ['rgba(255,255,255,.8)', 'rgba(70,95,115,.45)'],
			drifts: 'rgba(255,255,255,.55)'
		},
		landmark: {
			ex: [1.8, 1.6],
			// a snowman with a red scarf, seen from above
			draw: ({ b, blob, sph, shade }, o) => {
				const r = o.r ?? 0;
				blob(o.x + r * 0.5, o.y + r * 0.6, r * 1.15, r * 0.8, shade(0.32), 0);
				b.strokeStyle = '#5a4028';
				b.lineWidth = 1.6;
				b.beginPath();
				b.moveTo(o.x - r * 0.9, o.y - r * 0.1);
				b.lineTo(o.x + r * 0.9, o.y + r * 0.1);
				b.stroke();
				sph(o.x, o.y + r * 0.2, r, '#ffffff', '#b4c9de');
				sph(o.x - r * 0.1, o.y - r * 0.55, r * 0.62, '#ffffff', '#bfd2e4');
				b.strokeStyle = '#d9333a';
				b.lineWidth = 2.4;
				b.beginPath();
				b.arc(o.x - r * 0.1, o.y - r * 0.55, r * 0.58, 0.3, 2.9);
				b.stroke();
				blob(o.x - r * 0.1, o.y - r * 0.55, r * 0.34, r * 0.34, '#2b3340', 0);
				blob(o.x - r * 0.1, o.y - r * 0.58, r * 0.2, r * 0.2, '#4a5566', 0);
			}
		},
		flowerPatch: ({ rr, pick, fl5 }, o) => {
			const c = o.c ?? 0;
			const cl =
				c < 0.3
					? ['#ffffff', '#e8f2fb']
					: c < 0.55
						? ['#c9dcef', '#e8f2fb']
						: c < 0.8
							? ['#d9333a', '#ff6b6b']
							: ['#f4d4d8', '#ffffff'];
			for (let i = 0; i < (o.n ?? 0); i++) {
				fl5(o.x + rr(-16, 16), o.y + rr(-12, 12), rr(2, 3), pick(cl), '#ffcf4d');
			}
		}
	},
	live: {
		pellet: { texture: pellet, size: 10 },
		energizer: {
			texture: crystal,
			size: 20,
			glow: 0x7fd8ff,
			glowSize: (64 * 0.62) / 3,
			motion: 'spin'
		},
		portal: { glow: 0xa8d8ff, ring: () => ringTexture('rgba(170,232,255,.95)') },
		glints: 0xffffff,
		fog,
		mistAlpha: (s) => 0.1 + 0.22 * s,
		mistSpeed: (s) => 1 + 6 * s,
		rays: () => 0,
		lit: lazy(() =>
			radial([
				[0, 'rgba(205,228,255,.4)'],
				[1, 'rgba(255,205,130,0)']
			])
		),
		litAlpha: () => 1,
		drift: {
			texture: () => glowTexture(0xffffff),
			size: (sc, rand) => {
				const s = 64 * sc * (0.035 + rand * 0.05);
				return [s, s];
			},
			direction: 1,
			speed: 16,
			spin: false
		},
		wash: lazy(() => washTexture('rgba(255,236,200,.14)', 'rgba(70,90,150,.16)')),
		stormTint: '#e4edf6',
		stormAlpha: 0.24,
		weather: {
			count: 220,
			make: (i, vw, vh): WeatherParticle => {
				const st = i % 2 === 0;
				const s = st ? 0.8 + Math.random() : 0.14 + Math.random() * 0.2;
				return {
					st,
					im: st ? streakTexture(i % 4 === 0 ? 0xffffff : 0xa9bdd6) : glowTexture(0xffffff),
					w: st ? 16 * s : (64 * s) / 3,
					h: st ? 2 * s : (64 * s) / 3,
					px: Math.random() * vw,
					py: Math.random() * vh,
					vx: st ? 12 + Math.random() * 8 : 3 + Math.random() * 3,
					vy: st ? 4 + Math.random() * 3 : 2 + Math.random() * 2,
					ph: Math.random() * 6,
					rot: st ? 0.3 : 0,
					add: false
				};
			},
			step: (p, d, t, s, vw, vh) => {
				p.px += p.vx * d * s;
				p.py += p.vy * d * s + (p.st ? 0 : Math.sin(t * 2 + p.ph) * 0.3);
				if (p.px > vw + 30) {
					p.px = -30;
					p.py = Math.random() * vh;
				}
				if (p.py > vh + 30) {
					p.py = -30;
					p.px = Math.random() * vw;
				}
			},
			alpha: (p, s) => s * (p.st ? 0.7 : 0.9)
		},
		nightTint: '#5a6ea6',
		nightAlpha: 0.55,
		vignette: lazy(() =>
			radial([
				[0.5, 'rgba(12,22,44,0)'],
				[1, 'rgba(12,22,44,.5)']
			])
		),
		lights: { energizer: 0x7fd8ff, portal: 0x9fd8ff },
		chimneySmoke: true
	},
	decay: ICE_PALETTE
};
