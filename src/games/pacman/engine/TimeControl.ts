/** One debug frame step, in game seconds. */
export const FRAME_STEP = 1 / 60;

/**
 * Debug time: freeze, slow motion and single-frame steps. The game loop asks it how many
 * game seconds a real frame is worth; the renderer animates by the same amount, so a
 * frozen game stands still on screen too.
 */
export class TimeControl {
	private scaleValue = 1;
	private frozenValue = false;
	private stepsValue = 0;

	get scale(): number {
		return this.scaleValue;
	}

	get frozen(): boolean {
		return this.frozenValue;
	}

	setScale(value: number): void {
		if (!Number.isFinite(value)) {
			return;
		}
		this.scaleValue = Math.min(2, Math.max(0.1, value));
	}

	setFrozen(value: boolean): void {
		this.frozenValue = value;
		this.stepsValue = 0;
	}

	/** Freezes the game (if it was running) and advances it by one frame. */
	step(): void {
		this.frozenValue = true;
		this.stepsValue += 1;
	}

	/** Game seconds for a frame that took `real` seconds. */
	advance(real: number): number {
		if (this.frozenValue) {
			if (this.stepsValue > 0) {
				this.stepsValue -= 1;
				return FRAME_STEP;
			}
			return 0;
		}
		return real * this.scaleValue;
	}
}
