import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../engine/EventBus';
import type { PacmanAudioCue, PacmanEventMap, PacmanStateName } from './Events';
import { LevelLoader } from '../logic/level/LevelLoader';
import { Director } from './Director';
import { FLOW } from '../config/flowConfig';

const FADE = FLOW.screenFade * 2;
const DEATH = FLOW.death.shatter + FLOW.death.void + FLOW.death.rebuild;

function setup(): {
	director: Director;
	level: LevelLoader;
	states: PacmanStateName[];
	cues: PacmanAudioCue[];
} {
	const events = new EventBus<PacmanEventMap>();
	const states: PacmanStateName[] = [];
	const cues: PacmanAudioCue[] = [];
	events.on('ui:stateChanged', (payload) => states.push(payload.state));
	events.on('audio:cue', (payload) => cues.push(payload.cue));
	const level = new LevelLoader(events);
	const director = new Director(events, level);
	return { director, level, states, cues };
}

/** Advances the director in game-loop sized steps. */
function run(director: Director, seconds: number, step = 1 / 60): void {
	for (let t = 0; t < seconds - 1e-9; t += step) {
		director.update(Math.min(step, seconds - t));
	}
}

function startToReady(director: Director): void {
	director.startGame();
	run(director, FADE + 0.01);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('game flow', () => {
	it('starts a game behind a fade and plays the intro READY with its jingle', () => {
		const { director, cues } = setup();
		director.startGame();
		expect(director.transitioning).toBe(true);
		expect(director.stateName).toBe('menu');
		run(director, FLOW.screenFade / 2);
		expect(director.flow.fade).toBeGreaterThan(0);
		run(director, FADE);
		expect(director.transitioning).toBe(false);
		expect(director.stateName).toBe('ready');
		expect(director.flow.phase).toBe('intro');
		expect(cues).toContain('intro');
		run(director, FLOW.readyIntro + 0.05);
		expect(director.stateName).toBe('playing');
	});

	it('ignores input while a fade runs', () => {
		const { director } = setup();
		director.startGame();
		director.returnToMenu();
		director.showPlaying();
		run(director, FADE + 0.01);
		expect(director.stateName).toBe('ready');
	});

	it('skips READY on confirm', () => {
		const { director } = setup();
		startToReady(director);
		director.showPlaying();
		expect(director.stateName).toBe('playing');
	});

	it('pauses READY and resumes the same countdown', () => {
		const { director } = setup();
		startToReady(director);
		run(director, 1);
		const before = director.flow.remaining;
		director.togglePause();
		expect(director.stateName).toBe('paused');
		expect(director.flow.state).toBe('ready');
		expect(director.flow.paused).toBe(true);
		run(director, 3);
		expect(director.flow.remaining).toBeCloseTo(before, 5);
		director.togglePause();
		expect(director.stateName).toBe('ready');
		expect(director.flow.remaining).toBeCloseTo(before, 5);
	});

	it('pauses during death and level clear without losing progress', () => {
		const { director } = setup();
		startToReady(director);
		director.showPlaying();
		director.debugKillPlayer();
		expect(director.stateName).toBe('death');
		run(director, 1);
		const progress = director.flow.progress;
		expect(director.death).not.toBeNull();
		director.togglePause();
		run(director, 10);
		expect(director.stateName).toBe('paused');
		expect(director.flow.progress).toBeCloseTo(progress, 5);
		director.togglePause();
		expect(director.stateName).toBe('death');

		run(director, DEATH);
		expect(director.stateName).toBe('ready');
		director.showPlaying();
		director.debugCompleteLevel();
		expect(director.stateName).toBe('level-clear');
		run(director, 3);
		const turned = director.flow.progress;
		director.togglePause();
		run(director, 10);
		director.togglePause();
		expect(director.stateName).toBe('level-clear');
		expect(director.flow.progress).toBeCloseTo(turned, 5);
	});

	it('uses the short READY after a death, without the jingle', () => {
		const { director, cues } = setup();
		startToReady(director);
		director.showPlaying();
		cues.length = 0;
		director.debugKillPlayer();
		run(director, DEATH + 0.05);
		expect(director.stateName).toBe('ready');
		expect(director.flow.phase).toBe('short');
		expect(director.flow.duration).toBe(FLOW.readyShort);
		expect(cues).not.toContain('intro');
	});

	it('turns the season, then starts the next level in place without a fade', () => {
		const { director, level, cues } = setup();
		startToReady(director);
		director.showPlaying();
		const start = level.level;
		const next = level.peekNextLevel();
		cues.length = 0;
		director.debugCompleteLevel();
		expect(cues).toContain('win');
		expect(director.levelClear).not.toBeNull();
		expect(director.flow.phase).toBe('lights');
		const clear = FLOW.levelClear.lights + FLOW.levelClear.turn + FLOW.levelClear.settle;
		run(director, clear - 0.05);
		expect(director.flow.phase).toBe('settle');
		expect(level.level).toBe(start);
		run(director, 0.1);
		expect(director.transitioning).toBe(false);
		expect(level.level).toBe(start + 1);
		expect(level.season?.name).toBe(next.season.name);
		expect(director.stateName).toBe('ready');
		expect(director.flow.phase).toBe('short');
	});

	it('peeks the next world: a season, or the hell every fifth level', () => {
		const { level } = setup();
		level.setPendingStartLevel(4);
		level.startNewGame();
		expect(level.peekNextLevel()).toMatchObject({ level: 5, hell: true });
		level.setPendingStartLevel(1);
		level.startNewGame();
		expect(level.peekNextLevel()).toMatchObject({ level: 2, hell: false });
	});

	it('defers an auto-pause requested during a fade until the fade ends', () => {
		const { director } = setup();
		director.startGame();
		run(director, 0.1);
		director.autoPause();
		expect(director.stateName).toBe('menu');
		run(director, FADE);
		expect(director.stateName).toBe('paused');
		expect(director.flow.state).toBe('ready');
	});

	it('does not auto-pause the menu', () => {
		const { director } = setup();
		director.autoPause();
		expect(director.stateName).toBe('menu');
	});

	it('locks game-over input briefly, then restarts', () => {
		const { director, level } = setup();
		startToReady(director);
		director.showPlaying();
		level.ensure().combat.setLives(1);
		director.debugKillPlayer();
		run(director, DEATH + 0.05);
		expect(director.stateName).toBe('game-over');
		director.startGame();
		director.returnToMenu();
		expect(director.transitioning).toBe(false);
		run(director, FLOW.gameOverInputLock);
		director.startGame();
		expect(director.transitioning).toBe(true);
		run(director, FADE + 0.01);
		expect(director.stateName).toBe('ready');
		expect(director.flow.phase).toBe('intro');
	});

	it('returns to the menu from pause and logs a disallowed transition', () => {
		const { director } = setup();
		startToReady(director);
		director.showPlaying();
		director.togglePause();
		director.returnToMenu();
		run(director, FADE + 0.01);
		expect(director.stateName).toBe('menu');

		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		director.showDeath();
		expect(director.stateName).toBe('menu');
		expect(error).toHaveBeenCalledWith(
			'Director.setState',
			'transition menu -> death is not allowed'
		);
	});
});
