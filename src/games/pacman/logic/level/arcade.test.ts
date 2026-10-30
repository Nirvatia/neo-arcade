import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanAudioCue, PacmanEventMap } from '../../core/Events';
import { Director } from '../../core/Director';
import { FLOW } from '../../config/flowConfig';
import { ARCADE, arcadeRound } from '../../config/arcadeConfig';
import { GRID_01 } from '../../config/gridConfig';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { LevelLoader } from './LevelLoader';
import { arcadeChaseTarget, fullestQuarter, junctionAlong } from '../actors/arcadeTargets';

const FADE = FLOW.screenFade * 2;
const ARCADE_DEATH = FLOW.arcade.death.fold + FLOW.arcade.death.pause;

function setup() {
	const events = new EventBus<PacmanEventMap>();
	const cues: PacmanAudioCue[] = [];
	events.on('audio:cue', (payload) => cues.push(payload.cue));
	const level = new LevelLoader(events);
	const director = new Director(events, level);
	return { director, level, cues };
}

function run(director: Director, seconds: number, step = 1 / 60): void {
	for (let t = 0; t < seconds - 1e-9; t += step) {
		director.update(Math.min(step, seconds - t));
	}
}

/** A new game on level 3, then into the arcade, at the start of round 1's play. */
function intoArcade() {
	const world = setup();
	const { director, level } = world;
	level.setPendingStartLevel(3);
	director.startGame();
	run(director, FADE + 0.01);
	director.debugEnterSecret();
	director.showPlaying();
	return world;
}

/** Eats every dot of the current level at once. */
function clearDots(level: LevelLoader): void {
	const session = level.ensure();
	for (let y = 0; y < session.grid.height; y += 1) {
		for (let x = 0; x < session.grid.width; x += 1) {
			session.progress.collectAt(x, y);
		}
	}
}

afterEach(() => vi.restoreAllMocks());

describe('arcade (secret level)', () => {
	it('dying spends the arcade tries, never the game lives; the last one goes home', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { director, level } = intoArcade();
		expect(level.secretMode).toBe(true);
		const lives = level.ensure().combat.lives;
		const score = level.score;
		for (let i = ARCADE.tries; i > 1; i -= 1) {
			director.debugKillPlayer();
			expect(director.stateName).toBe('death');
			expect(level.ensure().combat.tries).toBe(i - 1);
			run(director, ARCADE_DEATH + 0.05);
			expect(director.stateName).toBe('ready');
			expect(level.ensure().combat.lives).toBe(lives);
			director.showPlaying();
		}
		director.debugKillPlayer();
		run(director, ARCADE_DEATH + FADE + 0.1);
		// back to the main game's next level: no game over, lives and score kept
		expect(level.secretMode).toBe(false);
		expect(level.level).toBe(4);
		expect(director.stateName).toBe('ready');
		expect(level.ensure().combat.lives).toBe(lives);
		expect(level.score).toBe(score);
	});

	it('plays three rounds with the intermission after the second, then goes home', () => {
		const { director, level, cues } = intoArcade();
		expect(level.arcadeRound).toBe(1);
		const flashOnly = FLOW.arcade.flash + 0.05;
		clearDots(level);
		run(director, 0.05);
		expect(director.stateName).toBe('level-clear');
		expect(director.flow.phase).toBe('flash');
		run(director, flashOnly);
		expect(level.arcadeRound).toBe(2);
		expect(level.secretMode).toBe(true);
		director.showPlaying();
		clearDots(level);
		run(director, FLOW.arcade.flash + 0.05);
		expect(director.flow.phase).toBe('intermission');
		expect(cues).toContain('intermission');
		run(director, FLOW.arcade.intermission);
		expect(level.arcadeRound).toBe(3);
		director.showPlaying();
		const before = level.score;
		clearDots(level);
		run(director, 0.05);
		// the last round pays the round bonus and the final bonus on top of the dots
		expect(level.score - before).toBeGreaterThanOrEqual(ARCADE.roundBonus + ARCADE.finalBonus);
		run(director, FLOW.arcade.flash + FADE + 0.1);
		expect(level.secretMode).toBe(false);
		expect(level.level).toBe(4);
	});

	it('carries the tries from round to round', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { director, level } = intoArcade();
		director.debugKillPlayer();
		run(director, ARCADE_DEATH + 0.05);
		director.showPlaying();
		clearDots(level);
		run(director, FLOW.arcade.flash + 0.1);
		expect(level.arcadeRound).toBe(2);
		expect(level.ensure().combat.tries).toBe(ARCADE.tries - 1);
	});

	it('energizers scare the ghosts, and each round has its fruit', () => {
		const { level } = intoArcade();
		const session = level.ensure();
		session.progress.collectAt(2, 2);
		session.combat.update(1 / 60);
		expect(session.combat.isPowerActive).toBe(true);
		expect(session.combat.powerTimer).toBeCloseTo(arcadeRound(1).power, 1);
		// eat dots until the first fruit shows up
		let eaten = 0;
		for (let y = 0; y < session.grid.height && !session.fruit.active; y += 1) {
			for (let x = 0; x < session.grid.width && !session.fruit.active; x += 1) {
				if (session.grid.tileAt(x, y) === 'DT') {
					session.progress.collectAt(x, y);
					eaten += 1;
					session.fruit.update(1 / 60, session.player);
				}
			}
		}
		expect(eaten).toBeGreaterThan(0);
		expect(session.fruit.active).toBe(arcadeRound(1).fruit);
	});

	it('restart from the pause screen replays the same round', () => {
		const { director, level } = intoArcade();
		clearDots(level);
		run(director, FLOW.arcade.flash + 0.1);
		expect(level.arcadeRound).toBe(2);
		director.restartLevel();
		expect(level.secretMode).toBe(true);
		expect(level.arcadeRound).toBe(2);
		expect(level.ensure().progress.remainingDots).toBeGreaterThan(0);
	});
});

describe('arcade ghosts', () => {
	const grid = new GridService(new GridModel(GRID_01));
	const all = () => true;

	it('the ambusher heads for the junction ahead, the herder for the one behind', () => {
		// on row 19, facing left from x = 11
		const ahead = junctionAlong(grid, { x: 11, y: 19 }, 'LEFT');
		const behind = junctionAlong(grid, { x: 11, y: 19 }, 'RIGHT');
		expect(ahead.y).toBe(19);
		expect(ahead.x).toBeLessThan(11);
		expect(behind.x).toBeGreaterThan(11);
		expect(grid.exitsCount(ahead.x, ahead.y)).toBeGreaterThanOrEqual(3);
		const input = {
			grid,
			ghost: { x: 2, y: 2 },
			player: { x: 11, y: 19 },
			facing: 'LEFT' as const,
			hasFood: all
		};
		expect(arcadeChaseTarget('PINKY', input)).toEqual(ahead);
		expect(arcadeChaseTarget('INKY', input)).toEqual(behind);
		expect(arcadeChaseTarget('BLINKY', input)).toEqual({ x: 11, y: 19 });
	});

	it('the keeper guards the fullest quarter and chases only up close', () => {
		// food left only in the bottom-right quarter
		const food = (x: number, y: number) => x > 13 && y > 13;
		const quarter = fullestQuarter(grid, food);
		expect(quarter).not.toBeNull();
		expect(quarter!.x).toBeGreaterThan(12);
		expect(quarter!.y).toBeGreaterThan(13);
		const far = {
			grid,
			ghost: { x: 2, y: 2 },
			player: { x: 20, y: 20 },
			facing: null,
			hasFood: food
		};
		expect(arcadeChaseTarget('CLYDE', far)).toEqual(quarter);
		const near = { ...far, ghost: { x: 18, y: 20 } };
		expect(arcadeChaseTarget('CLYDE', near)).toEqual({ x: 20, y: 20 });
	});
});
