import type { GhostKind } from '../../logic/actors/GhostModel';
import type { FruitKind } from '../../logic/bonuses/fruitCatalog';
import { makeCanvas, canvasContext } from '../common/textures';

/**
 * The arcade level's pixel art, drawn once into small canvases at native resolution
 * (`ARCADE_TILE` pixels per tile) and blitted at whole pixels. Our own sprites in the
 * 80s arcade manner: hard pixels, a few flat colours, two-frame wiggles.
 */

export const ARCADE_TILE = 10;
/** Actor sprites are larger than a tile and centred on it, as in the arcades. */
export const ACTOR_SIZE = 15;

export const ARCADE_COLORS = {
	void: '#04030c',
	wallBright: '#2ee6d6',
	wallDim: '#0f6f73',
	wallFill: '#061a20',
	door: '#ff8ad8',
	dot: '#ffc89a',
	energizer: '#ffe2b8',
	pac: '#ffd400',
	pacRim: '#c08a00',
	pacShine: '#fff6b8',
	eyeWhite: '#f4f4ff',
	pupil: '#14145a',
	scared: '#3b2bd6',
	scaredFace: '#ffc89a',
	flash: '#f0f0ff',
	flashFace: '#ff3a46',
	popup: '#36e0ff',
	chalk: '#e8ecd8',
	board: '#14301e',
	boardFrame: '#8a5a2a'
} as const;

export const GHOST_COLORS: Record<GhostKind, string> = {
	BLINKY: '#ff2a3a',
	PINKY: '#ff8ad8',
	INKY: '#36e0ff',
	CLYDE: '#ffa040'
};

export type ArcadeDir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** Paints a sprite from rows of characters; `.` is transparent. */
function fromRows(rows: readonly string[], palette: Record<string, string>): HTMLCanvasElement {
	const h = rows.length;
	const w = Math.max(...rows.map((r) => r.length));
	const canvas = makeCanvas(w, h);
	const ctx = canvasContext(canvas);
	rows.forEach((row, y) => {
		for (let x = 0; x < row.length; x += 1) {
			const color = palette[row[x]];
			if (color) {
				ctx.fillStyle = color;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	});
	return canvas;
}

function cached<K, V>(make: (key: K) => V): (key: K) => V {
	const cache = new Map<K, V>();
	return (key: K) => {
		let value = cache.get(key);
		if (value === undefined) {
			value = make(key);
			cache.set(key, value);
		}
		return value;
	};
}

const DIR_ANGLE: Record<ArcadeDir, number> = {
	RIGHT: 0,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	UP: -Math.PI / 2
};

/** Mouth openings of the three chomp frames, as half-angles. */
const MOUTH = [0.06, 0.42, 0.78] as const;

/**
 * Pac-Man: a 13-pixel disc with a shine pixel and a darker rim on the shadow side, the
 * mouth one of three frames. `open` 0..1 widens the mouth past the last frame (death).
 */
export const pacSprite = cached((key: string) => {
	const [dir, frame] = key.split(':') as [ArcadeDir, string];
	const half = Number(frame) >= 0 ? MOUTH[Number(frame)] : Math.abs(Number(frame)) / 100;
	const S = ACTOR_SIZE;
	const canvas = makeCanvas(S, S);
	const ctx = canvasContext(canvas);
	const c = (S - 1) / 2;
	const a0 = DIR_ANGLE[dir];
	for (let y = 0; y < S; y += 1) {
		for (let x = 0; x < S; x += 1) {
			const dx = x - c;
			const dy = y - c;
			const d = Math.hypot(dx, dy);
			if (d > 6.6) {
				continue;
			}
			let da = Math.atan2(dy, dx) - a0;
			da = Math.atan2(Math.sin(da), Math.cos(da));
			if (Math.abs(da) < half && d > 0.8) {
				continue;
			}
			const rim = d > 5.6 && dx + dy > 2;
			ctx.fillStyle = rim ? ARCADE_COLORS.pacRim : ARCADE_COLORS.pac;
			ctx.fillRect(x, y, 1, 1);
		}
	}
	ctx.fillStyle = ARCADE_COLORS.pacShine;
	ctx.fillRect(c - 3, c - 4, 2, 1);
	ctx.fillRect(c - 4, c - 3, 1, 1);
	return canvas;
});

export function pacFrame(dir: ArcadeDir, frame: number): HTMLCanvasElement {
	return pacSprite(`${dir}:${frame}`);
}

/** Death: the mouth opening to `half` radians (0..π) on a fixed upward heading. */
export function pacDeathFrame(half: number): HTMLCanvasElement {
	return pacSprite(`UP:-${Math.round(Math.min(Math.PI, half) * 100)}`);
}

// Ghost body, 14 pixels wide; two skirt frames.
const GHOST_TOP = [
	'.....####.....',
	'...########...',
	'..##########..',
	'.############.',
	'.############.',
	'.############.',
	'##############',
	'##############',
	'##############',
	'##############',
	'##############',
	'##############'
];
const SKIRT = [
	['##.###..###.##', '#...##..##...#'],
	['###.##..##.###', '.#...#..#...#.']
] as const;

/** A ghost body in `color`, skirt frame 0 or 1 (no eyes). */
export const ghostBody = cached((key: string) => {
	const [color, frame] = key.split('|');
	return fromRows([...GHOST_TOP, ...SKIRT[Number(frame)]], { '#': color });
});

/** Eyes for a 14-pixel ghost: whites with pupils pushed toward the heading. */
export const ghostEyes = cached((dir: ArcadeDir) => {
	const canvas = makeCanvas(14, 14);
	const ctx = canvasContext(canvas);
	const ox = dir === 'LEFT' ? -1 : dir === 'RIGHT' ? 1 : 0;
	const oy = dir === 'UP' ? -1 : dir === 'DOWN' ? 1 : 0;
	for (const ex of [2, 8]) {
		ctx.fillStyle = ARCADE_COLORS.eyeWhite;
		ctx.fillRect(ex + ox, 3 + oy, 4, 5);
		ctx.fillRect(ex + 1 + ox, 2 + oy, 2, 7);
		ctx.fillStyle = ARCADE_COLORS.pupil;
		ctx.fillRect(ex + 1 + ox * 2, 4 + oy * 2, 2, 2);
	}
	return canvas;
});

/** A frightened ghost's face: dot eyes and a wobbly mouth, in `face`. */
export const scaredFace = cached((face: string) =>
	fromRows(
		[
			'..............',
			'..............',
			'..............',
			'..............',
			'....##..##....',
			'....##..##....',
			'..............',
			'..............',
			'..#.##..##.#..',
			'..##..##..##..'
		],
		{ '#': face }
	)
);

// Fruit of the three rounds, 12×12, our own pixel versions.
const FRUIT_ROWS: Partial<Record<FruitKind, { rows: string[]; palette: Record<string, string> }>> =
	{
		PEAR: {
			rows: [
				'......gb....',
				'.....gg.....',
				'.....yy.....',
				'....yyyy....',
				'....yyyy....',
				'...yyyyyy...',
				'..yyyyyyyy..',
				'..yyyhyyyy..',
				'.yyyhyyyyyo.',
				'.yyyyyyyyyo.',
				'..yyyyyyoo..',
				'....oooo....'
			],
			palette: { g: '#4adb3a', b: '#7a4a1a', y: '#c8e03a', h: '#f4ffb0', o: '#8aa020' }
		},
		PRETZEL: {
			rows: [
				'..bbbb.bbbb.',
				'.bb..bbb..bb',
				'bb....b....b',
				'b..s..b.s..b',
				'b....bbb...b',
				'bb..bb.bb.bb',
				'.bbbb...bbb.',
				'..bb.....bb.',
				'.bb.s...s.bb',
				'.bb.......bb',
				'..bbbbbbbbb.',
				'............'
			],
			palette: { b: '#d08a3a', s: '#fff4e0' }
		},
		MELON: {
			rows: [
				'.....bb.....',
				'......b.....',
				'...gggggg...',
				'..gGggGggg..',
				'.gggGggGggg.',
				'.gGgggGgggg.',
				'.ggGgggGggg.',
				'.gggGgggGgg.',
				'.ggggGgggGg.',
				'..gggggGgg..',
				'...gggggg...',
				'............'
			],
			palette: { b: '#7a4a1a', g: '#3ac24a', G: '#c8ff9a' }
		}
	};

/** The pixel fruit of a round; kinds without pixel art fall back to the melon. */
export const fruitSprite = cached((kind: FruitKind) => {
	const art = FRUIT_ROWS[kind] ?? FRUIT_ROWS.MELON!;
	return fromRows(art.rows, art.palette);
});

// 3×5 digits for the score pop-ups.
const DIGITS = [
	'###,#.#,#.#,#.#,###',
	'.#.,##.,.#.,.#.,###',
	'###,..#,###,#..,###',
	'###,..#,.##,..#,###',
	'#.#,#.#,###,..#,..#',
	'###,#..,###,..#,###',
	'###,#..,###,#.#,###',
	'###,..#,.#.,.#.,.#.',
	'###,#.#,###,#.#,###',
	'###,#.#,###,..#,###'
].map((d) => d.split(','));

/** A number in the 3×5 pixel font, one pixel between digits. */
export const numberSprite = cached((key: string) => {
	const [text, color] = key.split('|');
	const rows = ['', '', '', '', ''];
	for (const ch of text) {
		const digit = DIGITS[Number(ch)];
		for (let r = 0; r < 5; r += 1) {
			rows[r] += (digit ? digit[r] : '...') + '.';
		}
	}
	return fromRows(rows, { '#': color });
});
