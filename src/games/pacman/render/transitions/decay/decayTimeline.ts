import { FLOW } from '../../../config/flowConfig';

/** Width of the shattering band behind the decay front, tiles. */
export const DECAY_BAND = 2.2;
/** Width of the band where shards fly back in behind the rebuild front, tiles. */
export const REBUILD_BAND = 1.8;
/** Front value meaning "not started" for the shader. */
export const FRONT_OFF = -100;

const FRONT_DELAY = 0.12;
const SHOCK_TIME = 1;

export interface DecayFronts {
	/** Decay front in death-field distance; FRONT_OFF before it starts. */
	readonly front: number;
	/** Rebuild front in respawn-field distance; FRONT_OFF before the rebuild. */
	readonly rebuild: number;
	/** Shock ring progress 0..1, or -1 when there is none. */
	readonly shock: number;
	/** 0..1 how much of the level is gone overall (for the no-WebGL fallback). */
	readonly cover: number;
}

/**
 * Fronts for `elapsed` seconds into the death state. `frontEnd` / `rebuildEnd` are the
 * largest distances on screen, so each front sweeps the whole view inside its phase:
 * the decay accelerates through `shatter`, holds over the abyss in `void`, and the level
 * reassembles from the respawn point through `rebuild`.
 */
export function decayFronts(elapsed: number, frontEnd: number, rebuildEnd: number): DecayFronts {
	const { shatter, void: hold, rebuild } = FLOW.death;
	if (!(elapsed >= 0)) {
		return { front: FRONT_OFF, rebuild: FRONT_OFF, shock: -1, cover: 0 };
	}
	const p = Math.min(1, Math.max(0, (elapsed - FRONT_DELAY) / (shatter - FRONT_DELAY)));
	const front =
		elapsed >= shatter
			? frontEnd + DECAY_BAND + 12
			: -3 + (frontEnd + DECAY_BAND + 6) * Math.pow(p, 1.6);
	const start = shatter + hold;
	const p2 = Math.min(1, Math.max(0, (elapsed - start) / rebuild));
	const back =
		elapsed < start
			? FRONT_OFF
			: elapsed >= start + rebuild
				? 1e4
				: -3 + (rebuildEnd + REBUILD_BAND + 6) * (1 - Math.pow(1 - p2, 3));
	return {
		front,
		rebuild: back,
		shock: elapsed < SHOCK_TIME ? elapsed / SHOCK_TIME : -1,
		cover: Math.min(Math.pow(p, 1.6), 1 - (1 - Math.pow(1 - p2, 3)))
	};
}
