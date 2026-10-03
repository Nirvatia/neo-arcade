export class GameLoop {
	private readonly maxDeltaMS: number;

	private running = false;
	private paused = false;

	private updateCallback: ((deltaMS: number) => void) | null = null;
	private renderCallback:
		| ((deltaMS: number, interpolation: number) => void)
		| null = null;

	constructor(_fixedStepMS: number, maxDeltaMS: number) {
		this.maxDeltaMS = maxDeltaMS;
	}

	public setCallbacks(
		update: (deltaMS: number) => void,
		render: (deltaMS: number, interpolation: number) => void
	): void {
		this.updateCallback = update;
		this.renderCallback = render;
	}

	public tick(deltaMS: number): void {
		if (!this.running) {
			return;
		}

		if (this.paused) {
			return;
		}

		const clamped = Math.min(deltaMS, this.maxDeltaMS);

		if (this.updateCallback !== null) {
			this.updateCallback(clamped);
		}

		if (this.renderCallback !== null) {
			this.renderCallback(clamped, 0);
		}
	}

	public start(): void {
		this.running = true;
	}

	public stop(): void {
		this.running = false;
	}

	public pause(): void {
		this.paused = true;
	}

	public resume(): void {
		this.paused = false;
	}

	public isRunning(): boolean {
		return this.running;
	}

	public isPaused(): boolean {
		return this.paused;
	}
}