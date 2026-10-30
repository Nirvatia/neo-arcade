import type { FruitKind } from '../logic/bonuses/fruitCatalog';

/** One round of the arcade (the secret level): speeds, energizer time, waves, fruit. */
export interface ArcadeRoundTuning {
	/** Multipliers on the base speeds. */
	readonly playerSpeed: number;
	readonly ghostSpeed: number;
	/** Seconds the ghosts stay scared after an energizer. */
	readonly power: number;
	/**
	 * Scatter / chase waves in seconds, starting with scatter; after the last one the
	 * ghosts chase for good.
	 */
	readonly waves: readonly number[];
	readonly fruit: FruitKind;
}

/**
 * The arcade: our own three-round arcade game inside the secret level, each round faster.
 * It has its own tries: dying never costs the main game's lives, and losing every try
 * returns to the main game without a penalty.
 */
export const ARCADE = {
	rounds: [
		{ playerSpeed: 1, ghostSpeed: 0.92, power: 6, waves: [6, 20, 5, 20, 4], fruit: 'PEAR' },
		{ playerSpeed: 1.04, ghostSpeed: 1.0, power: 4.5, waves: [5, 22, 4, 24, 3], fruit: 'PRETZEL' },
		{ playerSpeed: 1.08, ghostSpeed: 1.08, power: 3, waves: [4, 25, 3], fruit: 'MELON' }
	] as readonly ArcadeRoundTuning[],
	tries: 3,
	/** Added when a round is cleared, and on top of it after the last round. */
	roundBonus: 2000,
	finalBonus: 10000,
	/** The intermission plays after this round. */
	intermissionAfter: 2,
	/** The keeper chases only this close (tiles); otherwise it guards the fullest quarter. */
	keeperReach: 6,
	/** How far ahead the ambusher and behind the herder look for a junction (tiles). */
	junctionLookout: 10
} as const;

export function arcadeRound(round: number): ArcadeRoundTuning {
	const rounds = ARCADE.rounds;
	return rounds[Math.min(rounds.length, Math.max(1, Math.floor(round))) - 1];
}
