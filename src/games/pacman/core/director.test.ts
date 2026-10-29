import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../engine/EventBus';
import type { PacmanAudioCue, PacmanEventMap, PacmanStateName } from './Events';
import { LevelLoader } from '../logic/level/LevelLoader';
import { Director } from './Director';
import { FLOW } from '../config/flowConfig';

const FADE = FLOW.screenFade * 2;

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
		const wave = director.deathWave?.progress ?? 0;
		director.togglePause();
		run(director, 10);
		expect(director.stateName).toBe('paused');
		expect(director.deathWave?.progress).toBeCloseTo(wave, 5);
		director.togglePause();
		expect(director.stateName).toBe('death');

		run(director, FLOW.death);
		expect(director.stateName).toBe('ready');
		director.showPlaying();
		director.debugCompleteLevel();
		expect(director.stateName).toBe('level-clear');
		run(director, 3);
		const phase = director.levelClear?.phase;
		director.togglePause();
		run(director, 10);
		director.togglePause();
		expect(director.levelClear?.phase).toBe(phase);
	});

	it('uses the short READY after a death, without the jingle', () => {
		const { director, cues } = setup();
		startToReady(director);
		director.showPlaying();
		cues.length = 0;
		director.debugKillPlayer();
		run(director, FLOW.death + 0.05);
		expect(director.stateName).toBe('ready');
		expect(director.flow.phase).toBe('short');
		expect(director.flow.duration).toBe(FLOW.readyShort);
		expect(cues).not.toContain('intro');
	});

	it('moves to the next level behind a fade after level clear', () => {
		const { director, level } = setup();
		startToReady(director);
		director.showPlaying();
		const start = level.level;
		director.debugCompleteLevel();
		const clear = FLOW.levelClear.blink + FLOW.levelClear.cutscene + FLOW.levelClear.mazeOut;
		run(director, clear + 0.05);
		expect(director.transitioning).toBe(true);
		expect(level.level).toBe(start);
		run(director, FADE);
		expect(level.level).toBe(start + 1);
		expect(director.stateName).toBe('ready');
		expect(director.flow.phase).toBe('short');
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
		run(director, FLOW.death + 0.05);
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
