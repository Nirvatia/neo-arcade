/**
 * Durations of the game flow, in seconds. Every timed state reads its phases from here, so
 * later animation stages retime the flow in one place.
 */
export const FLOW = {
	/** READY at the start of a new game, with the intro jingle. */
	readyIntro: 5,
	/** READY after a death or a level change. */
	readyShort: 2,
	/**
	 * Death: the level shatters from the death point, hangs over the abyss, then
	 * reassembles from the respawn point. Pac-Man's own death plays inside `shatter`.
	 */
	death: {
		shatter: 2.6,
		void: 0.5,
		rebuild: 1.9
	},
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
