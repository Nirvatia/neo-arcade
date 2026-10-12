export class GameLoop {
	private readonly step: number;
	private accumulator: number = 0;
	private lastTime: number = 0;
	private animationFrameId: number | null = null;
	private isRunning: boolean = false;
	private readonly onUpdate: (dt: number) => void;
	private readonly onRender: () => void;
	private readonly maxTicksPerFrame: number = 5;

	constructor(targetFPS: number, onUpdate: (dt: number) => void, onRender: () => void) {
		this.step = 1000 / targetFPS;
		this.onUpdate = onUpdate;
		this.onRender = onRender;
	}

	start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.lastTime = performance.now();
		this.accumulator = 0;
		this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
	}

	stop(): void {
		this.isRunning = false;
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	private loop(currentTime: number): void {
		if (!this.isRunning) return;
		const frameTime = currentTime - this.lastTime;
		this.lastTime = currentTime;
		const clampedFrameTime = Math.min(frameTime, this.step * this.maxTicksPerFrame);
		this.accumulator += clampedFrameTime;
		let ticks = 0;
		while (this.accumulator >= this.step && ticks < this.maxTicksPerFrame) {
			this.onUpdate(this.step);
			this.accumulator -= this.step;
			ticks++;
		}
		this.onRender();
		this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
	}
}