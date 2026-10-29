/**
 * Durations of the game flow, in seconds. Every timed state reads its phases from here, so
 * later animation stages retime the flow in one place.
 */
export const FLOW = {
	/** READY at the start of a new game, with the intro jingle. */
	readyIntro: 5,
	/** READY after a death or a level change. */
	readyShort: 2,
	/** Death of Pac-Man and the reaction of the level (stage 3 splits it into phases). */
	death: 5,
	levelClear: {
		blink: 2,
		cutscene: 5,
		mazeOut: 1
	},
	/** Screen fade between menu and game and between levels: each half, out then in. */
	screenFade: 0.4,
	/** Game over ignores confirm/menu this long, so a held key does not restart at once. */
	gameOverInputLock: 1
} as const;
