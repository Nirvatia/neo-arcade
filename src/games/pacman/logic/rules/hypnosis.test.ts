import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap, PacmanFx } from '../../core/Events';
import { HYPNOSIS } from '../../config/hypnosisConfig';
import { SCORE_TABLE } from '../../config/scoreConfig';
import { buildLevelSession } from '../level/LevelSession';
import { seasonForLevel } from '../level/SeasonCatalog';
import type { GhostKind, GhostState, GhostTile } from '../actors/GhostModel';
import { shortestRoute } from '../actors/ghostRoutes';

const DT = 1 / 60;

/** A seeded generator (mulberry32). */
function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function setup() {
	const events = new EventBus<PacmanEventMap>();
	const fx: PacmanFx[] = [];
	events.on('fx:event', (e) => fx.push(e));
	const session = buildLevelSession({
		events,
		level: 1,
		profile: 'ms-pacman',
		season: seasonForLevel(1),
		hell: false,
		secret: false,
		godMode: false
	});
	const { ghosts, hypnosis, progress, grid, score } = session;
	// every hypnosis happens in the overdrive, which frightens the ghosts out of the lair first
	hypnosis.startOverdrive(ghosts);
	const ghost = (kind: GhostKind) => ghosts.list.find((g) => g.kind === kind)!;
	const place = (kind: GhostKind, tile: GhostTile, state: GhostState) => {
		ghost(kind).teleportTo(tile);
		ghost(kind).setState(state);
	};
	const world = ghosts.routeWorld();
	/** Every dot tile, in reading order. */
	const dotTiles: GhostTile[] = [];
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (grid.tileAt(x, y) === 'DT') dotTiles.push({ x, y });
		}
	}
	const eatAll = () => dotTiles.forEach((t) => progress.collectDotOnly(t.x, t.y));
	/** Hypnotises `kind` where it stands. */
	const hypnotise = (kind: GhostKind) => hypnosis.handleContact(kind, ghosts);
	const run = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds / DT); i += 1) {
			ghosts.update(DT);
			hypnosis.update(DT, ghosts);
		}
	};
	return {
		session,
		ghost,
		place,
		world,
		dotTiles,
		eatAll,
		hypnotise,
		run,
		fx,
		ghosts,
		hypnosis,
		progress,
		score
	};
}

describe('the hypnosis modes', () => {
	it('a ghost with plenty of food in reach is a feeder', () => {
		const { place, hypnotise, hypnosis, dotTiles } = setup();
		place('BLINKY', dotTiles[40]!, 'active');
		place('PINKY', dotTiles[120]!, 'active');
		hypnotise('BLINKY');
		expect(hypnosis.mode).toBe('feeder');
		expect(hypnosis.plannedDots).toBeGreaterThanOrEqual(HYPNOSIS.feederMinDots);
	});

	it('a ghost with no food left is a hunter, if there is anyone to hunt', () => {
		const { place, hypnotise, hypnosis, eatAll, dotTiles } = setup();
		eatAll();
		place('BLINKY', dotTiles[40]!, 'active');
		place('PINKY', dotTiles[120]!, 'active');
		hypnotise('BLINKY');
		expect(hypnosis.mode).toBe('hunter');
		expect(hypnosis.plannedDots).toBe(0);
	});

	it('with no food and nobody to hunt it stays a feeder', () => {
		const { place, hypnotise, hypnosis, eatAll, dotTiles } = setup();
		eatAll();
		place('BLINKY', dotTiles[40]!, 'active');
		hypnotise('BLINKY');
		expect(hypnosis.mode).toBe('feeder');
	});

	it('a ghost whose food is too far for its time is a hunter', () => {
		const { place, hypnotise, hypnosis, dotTiles, world, progress } = setup();
		const home = dotTiles[40]!;
		// the dots within 30 steps are gone; what is left cannot be reached in 4 s
		for (const t of dotTiles) {
			const near = shortestRoute(
				world,
				{ tile: home, facing: null },
				(x, y) => x === t.x && y === t.y,
				30
			);
			if (near || (t.x === home.x && t.y === home.y)) progress.collectDotOnly(t.x, t.y);
		}
		expect(progress.remainingDots).toBeGreaterThan(0);
		place('BLINKY', home, 'active');
		place('PINKY', dotTiles[120]!, 'active');
		hypnotise('BLINKY');
		expect(hypnosis.plannedDots).toBeLessThan(HYPNOSIS.feederMinDots);
		expect(hypnosis.mode).toBe('hunter');
	});

	it('does not change its mind in the middle of a hypnosis', () => {
		const { place, hypnotise, hypnosis, eatAll, progress, dotTiles, run } = setup();
		eatAll();
		place('BLINKY', dotTiles[40]!, 'active');
		place('PINKY', dotTiles[120]!, 'active');
		hypnotise('BLINKY');
		expect(hypnosis.mode).toBe('hunter');
		progress.resetDots();
		for (let i = 0; i < 6; i += 1) {
			run(0.5);
			expect(hypnosis.mode).toBe('hunter');
		}
	});

	it('plans again when the hypnosis moves to another ghost', () => {
		const { place, hypnotise, hypnosis, eatAll, dotTiles } = setup();
		place('BLINKY', dotTiles[40]!, 'active');
		place('PINKY', dotTiles[120]!, 'active');
		place('INKY', dotTiles[200]!, 'active');
		hypnotise('BLINKY');
		expect(hypnosis.mode).toBe('feeder');
		eatAll();
		hypnotise('PINKY');
		expect(hypnosis.hypnotizedKind).toBe('PINKY');
		expect(hypnosis.mode).toBe('hunter');
	});

	it('has no mode when nobody is hypnotised, and wakes into rage as before', () => {
		const { place, hypnotise, hypnosis, ghost, dotTiles, run } = setup();
		expect(hypnosis.mode).toBeNull();
		place('BLINKY', dotTiles[40]!, 'active');
		hypnotise('BLINKY');
		run(HYPNOSIS.seconds + 0.1);
		expect(hypnosis.mode).toBeNull();
		expect(ghost('BLINKY').state).toBe('enraged');
		run(HYPNOSIS.enragedSeconds + 0.1);
		expect(ghost('BLINKY').state).toBe('active');
	});
});

describe('the feeder', () => {
	/** A board late in a level: each dot is still there with this chance, by a seeded dice. */
	function thinned(guided: boolean, start: number, seed: number) {
		const s = setup();
		if (!guided) s.ghosts.setHypnosisGuide(null);
		const dice = seeded(seed);
		s.dotTiles.forEach((t) => {
			if (dice() > 0.4) s.progress.collectDotOnly(t.x, t.y);
		});
		s.place('BLINKY', s.dotTiles[start]!, 'active');
		s.hypnotise('BLINKY');
		const before = s.progress.remainingDots;
		const mode = s.hypnosis.mode;
		s.run(HYPNOSIS.seconds - 0.2);
		return { eaten: before - s.progress.remainingDots, mode };
	}

	it('eats more than the old straight-line rule on thinned boards, and gets stuck less', () => {
		let planned = 0;
		let old = 0;
		let better = 0;
		let worse = 0;
		let scenarios = 0;
		for (let seed = 1; seed <= 60; seed += 1) {
			const start = (seed * 37) % 250;
			const a = thinned(true, start, seed);
			// a hunter does not feed: count the boards where the plan chose to feed
			if (a.mode !== 'feeder') continue;
			const b = thinned(false, start, seed);
			scenarios += 1;
			planned += a.eaten;
			old += b.eaten;
			if (a.eaten > b.eaten) better += 1;
			if (a.eaten < b.eaten) worse += 1;
		}
		expect(scenarios).toBeGreaterThanOrEqual(30);
		expect(planned).toBeGreaterThan(old);
		expect(better).toBeGreaterThan(worse);
	});

	it('eats roughly what it planned to', () => {
		const s = setup();
		s.place('BLINKY', s.dotTiles[60]!, 'active');
		s.hypnotise('BLINKY');
		const planned = s.hypnosis.plannedDots;
		const before = s.progress.remainingDots;
		s.run(HYPNOSIS.seconds - 0.1);
		const eaten = before - s.progress.remainingDots;
		expect(eaten).toBeGreaterThanOrEqual(Math.floor(planned * 0.6));
	});
});

describe('the hunter', () => {
	/** A hunter and a tile `steps` steps away from it along a corridor. */
	function chase(steps: number) {
		const s = setup();
		s.eatAll();
		const home = s.dotTiles[40]!;
		const route = shortestRoute(
			s.world,
			{ tile: home, facing: null },
			(x, y) => Math.abs(x - home.x) + Math.abs(y - home.y) === steps
		)!;
		s.place('BLINKY', home, 'active');
		s.place('PINKY', route.end.tile, 'frightened');
		return { ...s, home, preyTile: route.end.tile };
	}

	it('catches a frightened ghost by the way round, and eats it: eyes and 200', () => {
		const s = chase(5);
		s.hypnotise('BLINKY');
		expect(s.hypnosis.mode).toBe('hunter');
		const before = s.score.score;
		s.run(HYPNOSIS.seconds - 0.2);
		expect(s.ghost('PINKY').state).toBe('eyes');
		expect(s.score.score - before).toBeGreaterThanOrEqual(SCORE_TABLE.hypnosisEat);
		expect(s.fx.some((e) => e.kind === 'ghost-eaten' && e.ghost === 'PINKY')).toBe(true);
	});

	it('pays 200 for each ghost, with no chain', () => {
		const s = setup();
		s.eatAll();
		const home = s.dotTiles[40]!;
		s.place('BLINKY', home, 'active');
		s.place('PINKY', home, 'frightened');
		s.place('INKY', home, 'frightened');
		s.place('CLYDE', home, 'frightened');
		s.hypnotise('BLINKY');
		const before = s.score.score;
		s.hypnosis.update(DT, s.ghosts);
		expect(s.score.score - before).toBe(3 * SCORE_TABLE.hypnosisEat);
		for (const kind of ['PINKY', 'INKY', 'CLYDE'] as const) {
			expect(s.ghost(kind).state).toBe('eyes');
		}
	});

	it('eats a ghost that is not frightened too (the overdrive may be over)', () => {
		const s = setup();
		s.eatAll();
		const home = s.dotTiles[40]!;
		s.place('BLINKY', home, 'active');
		s.place('PINKY', home, 'active');
		s.hypnotise('BLINKY');
		s.hypnosis.update(DT, s.ghosts);
		expect(s.ghost('PINKY').state).toBe('eyes');
	});

	it('lets an eaten ghost leave the lair when a new overdrive starts during its exit', () => {
		const s = setup();
		s.eatAll();
		const home = s.dotTiles[40]!;
		s.place('BLINKY', home, 'active');
		s.place('PINKY', home, 'frightened');
		s.hypnotise('BLINKY');
		s.hypnosis.update(DT, s.ghosts);
		expect(s.ghost('PINKY').state).toBe('eyes');
		for (let i = 0; i < 20 * 60 && s.ghost('PINKY').state !== 'exiting'; i += 1) {
			s.run(DT);
		}
		expect(s.ghost('PINKY').state).toBe('exiting');
		s.hypnosis.startOverdrive(s.ghosts);
		s.run(2);
		const prey = s.ghost('PINKY');
		expect(s.session.grid.isGhostWalkable(prey.tile.x, prey.tile.y, false)).toBe(true);
	});

	it('leaves ghosts in the lair, the eyes and itself alone', () => {
		const s = setup();
		s.eatAll();
		const home = s.dotTiles[40]!;
		s.place('BLINKY', home, 'active');
		s.place('PINKY', home, 'lair');
		s.place('INKY', home, 'eyes');
		s.place('CLYDE', home, 'exiting');
		s.hypnotise('BLINKY');
		const before = s.score.score;
		s.hypnosis.update(DT, s.ghosts);
		expect(s.score.score).toBe(before);
		expect(s.ghost('BLINKY').state).toBe('hypnotized');
	});

	it('a feeder does not eat the ghosts it touches', () => {
		const s = setup();
		const home = s.dotTiles[40]!;
		s.place('BLINKY', home, 'active');
		s.place('PINKY', home, 'frightened');
		s.hypnotise('BLINKY');
		expect(s.hypnosis.mode).toBe('feeder');
		s.hypnosis.update(DT, s.ghosts);
		expect(s.ghost('PINKY').state).toBe('frightened');
	});

	it('makes a frightened ghost within 4 tiles run from it, and no other', () => {
		const s = chase(3);
		s.hypnotise('BLINKY');
		const prey = s.ghost('PINKY');
		expect(s.hypnosis.threatFor(prey)).toEqual(s.ghost('BLINKY').tile);
		const far = chase(9);
		far.hypnotise('BLINKY');
		expect(far.hypnosis.threatFor(far.ghost('PINKY'))).toBeNull();
		// an active ghost has no reason to run
		const calm = chase(3);
		calm.ghost('PINKY').setState('active');
		calm.hypnotise('BLINKY');
		expect(calm.hypnosis.threatFor(calm.ghost('PINKY'))).toBeNull();
	});

	it('gives no threat from a feeder', () => {
		const s = setup();
		const home = s.dotTiles[40]!;
		s.place('BLINKY', home, 'active');
		s.place('PINKY', s.dotTiles[41]!, 'frightened');
		s.hypnotise('BLINKY');
		expect(s.hypnosis.mode).toBe('feeder');
		expect(s.hypnosis.threatFor(s.ghost('PINKY'))).toBeNull();
	});
});
