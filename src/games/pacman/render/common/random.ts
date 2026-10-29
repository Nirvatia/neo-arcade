/**
 * Park–Miller "minimal standard" generator: the same seed always yields the same sequence,
 * so baked scenery (flowers, stones, snowdrifts) stays put between frames and sessions.
 * Returns values in (0, 1).
 */
export function seededRandom(seed: number): () => number {
	let state = Math.floor(Math.abs(Number.isFinite(seed) ? seed : 0)) % 2147483647;

	if (state <= 0) {
		state += 2147483646;
	}

	return () => {
		state = (state * 16807) % 2147483647;
		return state / 2147483647;
	};
}
