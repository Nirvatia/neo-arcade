// A season of the meadow world: the owner's CLAUDE_GRID_<SEASON> mock-ups share one
// layout (maze, meadow, stream, bridge, cabins, pond, lamps, trees) and differ in colours,
// one landmark, a few decorations, the food sprites and the weather. A theme holds those.
import type { DecayPalette } from '../../transitions/decay/DecayPass';
import type { MeadowDecor } from './MeadowBake';

/** Drawing helpers of the bake, shared with the theme hooks (same seeded stream). */
export interface BakeKit {
	readonly b: CanvasRenderingContext2D;
	readonly rnd: () => number;
	readonly rr: (a: number, c: number) => number;
	readonly pick: <V>(a: readonly V[]) => V;
	readonly blob: (x: number, y: number, rx: number, ry: number, col: string, rot?: number) => void;
	readonly fl5: (x: number, y: number, r: number, col: string, mid: string) => void;
	readonly sph: (x: number, y: number, r: number, c0: string, c1: string) => void;
	readonly lin: (
		a: number,
		c: number,
		d: number,
		e: number,
		f: string,
		g: string
	) => CanvasGradient;
	/** rgba() of the theme's shadow colour. */
	readonly shade: (alpha: number) => string;
}

type Three = readonly [string, string, string];
type Four = readonly [string, string, string, string];

/** Every colour of the static world, in the order the bake uses them. */
export interface MeadowBakeTheme {
	readonly bg: string;
	readonly groundCenter: string;
	/** Soft light and dark patches across the meadow. */
	readonly groundBlobs: readonly [string, string];
	readonly grass: Four;
	readonly curls: string;
	/** Stream bed, bank, water, highlight (outer to inner). */
	readonly stream: Four;
	/** "r,g,b" of every drop shadow. */
	readonly shadow: string;
	readonly bush: readonly [string, string];
	readonly pond: {
		readonly sand: string;
		readonly water: readonly [string, string];
		readonly rim: string;
		readonly highlight: string;
		readonly stones: string;
	};
	readonly bridge: { readonly caps: string; readonly middle: string };
	readonly cabin: {
		readonly walls: Four;
		readonly roofBlobs: string;
		readonly ridge: string;
		readonly ridgeShadow: string;
		readonly chimneyCap: string;
	};
	readonly rock: Four;
	readonly lair: { readonly base: string; readonly tiles: Three };
	readonly floor: { readonly tiles: Three; readonly specks: Three };
	readonly portal: {
		/** Worn path leading away from the portal, by alpha. */
		readonly trail: (alpha: number) => string;
		readonly grass: Three;
		readonly plate: readonly [string, string];
		readonly core: Three;
		readonly ring: string;
		readonly corners: string;
	};
	readonly wall: {
		readonly base: string;
		readonly moss: readonly [string, string];
		readonly top: Three;
		readonly bottom: Three;
		readonly mossSpecks: Three;
		readonly specks: readonly [string, string];
		readonly crack: string;
		readonly joints: string;
		/** Two drifts on top of a stone (snow, moss, leaves…). */
		readonly drifts: readonly [string, string];
		readonly light: string;
		readonly dark: string;
		readonly flowers: Three;
		readonly shadow: string;
	};
	readonly edgeGrass: Three;
	readonly trees: {
		readonly accent: Three;
		readonly plain: Three;
		readonly accentDots: readonly [string, string];
		readonly plainDots: readonly [string, string];
		readonly drifts: string;
	};
	/** The landmark that stands in for the winter snowman (two of them, by the maze). */
	readonly landmark: {
		/** Keep-out radius in tiles for the scatter around each copy. */
		readonly ex: readonly [number, number];
		readonly draw: (k: BakeKit, o: MeadowDecor) => void;
	};
	/** One flower (or leaf) patch on the meadow. */
	readonly flowerPatch: (k: BakeKit, o: MeadowDecor) => void;
	/** Lily pads, floating leaves… drawn inside the pond, after its highlight. */
	readonly pondExtras?: (k: BakeKit, o: MeadowDecor) => void;
}

/** One kind of wind-blown particle of the weather layer, in screen space. */
export interface WeatherParticle {
	im: HTMLCanvasElement;
	w: number;
	h: number;
	px: number;
	py: number;
	vx: number;
	vy: number;
	ph: number;
	rot: number;
	/** Additive glow instead of normal blending. */
	add: boolean;
	/** Streak or band (moves straight) rather than a floating mote. */
	st: boolean;
}

export interface MeadowWeather {
	readonly count: number;
	make(i: number, vw: number, vh: number): WeatherParticle;
	/** Moves `p` by `d` 60-fps frames at `storm` strength; wraps it around the screen. */
	step(p: WeatherParticle, d: number, t: number, storm: number, vw: number, vh: number): void;
	/** Opacity of `p` at `storm` strength. */
	alpha(p: WeatherParticle, storm: number): number;
}

/** Ambient particles always drifting across the screen (snow, petals, leaves, motes). */
export interface MeadowDrift {
	readonly texture: (i: number) => HTMLCanvasElement;
	/** Size in css px for this viewport scale. */
	readonly size: (sc: number, rand: number) => readonly [number, number];
	/** +1 falls, -1 rises. */
	readonly direction: 1 | -1;
	readonly speed: number;
	readonly spin: boolean;
}

/** Everything that moves: food, portals, atmosphere, weather, night. */
export interface MeadowLiveTheme {
	readonly pellet: { readonly texture: () => HTMLCanvasElement; readonly size: number };
	readonly energizer: {
		readonly texture: () => HTMLCanvasElement;
		readonly size: number;
		readonly glow: number;
		/** Glow size in world units. */
		readonly glowSize: number;
		/** `spin` turns slowly; `sway` rocks from side to side. */
		readonly motion: 'spin' | 'sway';
	};
	readonly portal: { readonly glow: number; readonly ring: () => HTMLCanvasElement };
	readonly glints: number;
	readonly fog: () => HTMLCanvasElement;
	readonly mistAlpha: (storm: number) => number;
	readonly mistSpeed: (storm: number) => number;
	readonly rays: (t: number, i: number, storm: number, night: number) => number;
	readonly lit: () => HTMLCanvasElement;
	readonly litAlpha: (storm: number, night: number) => number;
	readonly drift: MeadowDrift;
	readonly wash: () => HTMLCanvasElement;
	readonly stormTint: string;
	readonly stormAlpha: number;
	readonly weather: MeadowWeather;
	readonly nightTint: string;
	readonly nightAlpha: number;
	readonly vignette: () => HTMLCanvasElement;
	readonly lights: { readonly energizer: number; readonly portal: number };
	readonly chimneySmoke: boolean;
}

export interface MeadowTheme {
	readonly name: string;
	readonly bake: MeadowBakeTheme;
	readonly live: MeadowLiveTheme;
	readonly decay: DecayPalette;
}
