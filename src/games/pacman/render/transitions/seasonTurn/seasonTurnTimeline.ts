import { TURN_BAND } from './seasonTurnShader';

/** Front value meaning "not running" for the shader. */
export const TURN_OFF = -100;

/**
 * Phases of the season turn, seconds from the last dot: the light runs down the corridors
 * (`glow`), the mosaic turns over to the next season (`turn`, overlapping the light), the
 * new world settles (`settle`).
 */
export const SEASON_TURN = {
	glowStart: 0.15,
	glow: 2.2,
	turnStart: 1.3,
	turn: 3,
	settle: 1
} as const;

export const SEASON_TURN_TOTAL = SEASON_TURN.turnStart + SEASON_TURN.turn + SEASON_TURN.settle;

export interface SeasonTurnFronts {
	readonly glow: number;
	readonly front: number;
	/** 0..1 share of the screen already turned (for fallbacks and particles). */
	readonly progress: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Fronts at `elapsed` seconds; `end` is the largest field distance on screen, `glowEnd`
 * the farthest corridor (the light only runs inside the maze).
 */
export function seasonTurnFronts(elapsed: number, end: number, glowEnd: number): SeasonTurnFronts {
	if (!(elapsed >= 0)) {
		return { glow: TURN_OFF, front: TURN_OFF, progress: 0 };
	}
	const { glowStart, glow, turnStart, turn } = SEASON_TURN;
	const g = clamp01((elapsed - glowStart) / glow);
	const glowHead =
		elapsed < glowStart || g >= 1 ? TURN_OFF : -1 + (glowEnd + 4) * (1 - Math.pow(1 - g, 1.6));
	const p = clamp01((elapsed - turnStart) / turn);
	const front =
		elapsed < turnStart
			? TURN_OFF
			: p >= 1
				? end + TURN_BAND + 12
				: -3 + (end + TURN_BAND + 8) * Math.pow(p, 1.3);
	return { glow: glowHead, front, progress: Math.pow(p, 1.3) };
}
