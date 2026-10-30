import { describe, expect, it } from 'vitest';
import { GRID_01 } from '../../config/gridConfig';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { LevelProgress } from '../level/LevelProgress';
import { ScoreModel } from '../level/ScoreModel';
import { PlayerService } from '../actors/PlayerService';
import { GhostService } from '../actors/GhostService';
import { LairCodeService } from '../rules/LairCodeService';
import { EasterEggService, EGG_DOOR_TIME, EGG_VANISH_TIME } from './EasterEggService';

const STEP = 1 / 60;

function lairLevel(level = 7) {
	const grid = new GridService(new GridModel(GRID_01));
	const events = new EventBus<PacmanEventMap>();
	const score = new ScoreModel();
	const progress = new LevelProgress(grid, score, events);
	const player = new PlayerService(grid, progress, events);
	const ghosts = new GhostService(grid, player, progress);
	const lairCode = new LairCodeService(level, events);
	const egg = new EasterEggService(level, grid, ghosts, lairCode, progress, events, score);
	const solve = () => {
		for (const kind of ['BLINKY', 'PINKY', 'INKY', 'CLYDE'] as const) lairCode.register(kind);
	};
	const run = (seconds: number) => {
		for (let t = 0; t < seconds; t += STEP) {
			egg.update(STEP, player);
			grid.setLairOpen(egg.lairOpen);
		}
	};
	return { grid, ghosts, egg, player, solve, run };
}

describe('Easter egg', () => {
	it('lies in the lair centre, between the ghosts spawns', () => {
		const { grid } = lairLevel();
		const spawns = grid.ghostSpawns;
		const tile = grid.lairEggTile();
		expect(tile).toEqual({ x: 12, y: 12 });
		expect(spawns.INKY.x).toBeLessThan(12);
		expect(spawns.PINKY.x).toBeGreaterThan(12);
	});

	it('sends the ghosts away, then opens the gate, then shows the egg', () => {
		const { grid, ghosts, egg, solve, run } = lairLevel();
		run(1);
		expect(egg.phase).toBe('waiting');
		expect(ghosts.list.length).toBe(4);

		solve();
		run(STEP);
		expect(egg.phase).toBe('vanish');
		expect(ghosts.list.length).toBe(0);
		expect(ghosts.banishedList.length).toBe(4);
		expect(grid.lairOpen).toBe(false);

		run(EGG_VANISH_TIME);
		expect(egg.phase).toBe('door');
		expect(egg.vanishProgress).toBe(1);
		expect(egg.doorOpen).toBeLessThan(1);
		expect(grid.lairOpen).toBe(false);

		run(EGG_DOOR_TIME + STEP);
		expect(egg.phase).toBe('egg');
		expect(egg.doorOpen).toBe(1);
		expect(grid.lairOpen).toBe(true);
		expect(egg.eggPosition).toEqual({ x: 12.5, y: 12.5 });
	});

	it('keeps the ghosts frozen while banished and brings them back on reset', () => {
		const { ghosts, egg, solve, run } = lairLevel();
		solve();
		run(STEP);
		const before = ghosts.banishedList.map((g) => ({ ...g.position }));
		ghosts.update(1);
		expect(ghosts.banishedList.map((g) => ({ ...g.position }))).toEqual(before);
		ghosts.reset();
		egg.reset();
		expect(ghosts.list.length).toBe(4);
		expect(egg.phase).toBe('waiting');
	});

	it('does nothing outside level 7', () => {
		const { ghosts, egg, solve, run } = lairLevel(3);
		solve();
		run(5);
		expect(egg.phase).toBe('waiting');
		expect(ghosts.list.length).toBe(4);
	});
});
