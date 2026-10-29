import type { Director } from '../../core/Director';
import type { LevelLoader } from '../../logic/level/LevelLoader';
import type { OverlayMode, OverlaySnapshot } from './OverlayView';

/** What the canvas overlay shows for the current game state. */
export function buildOverlaySnapshot(director: Director, level: LevelLoader): OverlaySnapshot {
	const state = director.stateName;
	const combat = level.combat;

	let mode: OverlayMode = 'none';
	let title = '';
	let timer = 0;
	let duration = 0;

	if (state === 'ready') {
		mode = 'ready';
		title = 'READY';
		timer = director.overlayTimer;
	} else if (state === 'playing') {
		mode = 'playing';
	} else if (state === 'paused') {
		mode = 'paused';
		title = 'PAUSED';
	} else if (state === 'death') {
		mode = 'death';
		title = 'DEATH';
		const wave = director.deathWave;
		timer = wave ? wave.timer : director.overlayTimer;
		duration = wave ? wave.duration : 0;
	} else if (state === 'level-clear') {
		mode = 'level-clear';
		title = 'LEVEL CLEAR';
		const clear = director.levelClear;
		timer = clear ? clear.timer : director.overlayTimer;
		duration = clear ? clear.duration : 0;
	} else if (state === 'game-over') {
		mode = 'game-over';
		title = 'GAME OVER';
	}

	let powerLabel = '';
	let powerTimer = 0;
	if (state === 'playing') {
		if (level.profile === 'pacman' && combat && combat.isPowerActive) {
			powerLabel = 'POWER';
			powerTimer = combat.powerTimer;
		}
		const hypnosis = level.hypnosis;
		if (hypnosis && hypnosis.overdriveActive) {
			powerLabel = 'OVERDRIVE';
			powerTimer = hypnosis.overdriveTimer;
		}
		const echo = level.echo;
		if (echo && echo.phase === 'clone') {
			powerLabel = 'ECHO';
			powerTimer = echo.timer;
		}
		const doom = level.doom;
		if (level.hellMode && doom && doom.armed) {
			powerLabel = doom.armed.toUpperCase();
		}
	}

	return {
		mode,
		title,
		timer: Number.isFinite(timer) && timer >= 0 ? timer : 0,
		duration: Number.isFinite(duration) && duration >= 0 ? duration : 0,
		level: Number.isFinite(level.level) && level.level >= 1 ? Math.floor(level.level) : 1,
		lives: combat && combat.lives >= 0 ? Math.floor(combat.lives) : 0,
		powerLabel,
		powerTimer: Number.isFinite(powerTimer) && powerTimer >= 0 ? powerTimer : 0
	};
}
