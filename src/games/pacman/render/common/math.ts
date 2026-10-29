/** Clamps `value` into [min, max]; a non-finite value falls back to `min`. */
export function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) {
		return min;
	}
	return Math.min(max, Math.max(min, value));
}
