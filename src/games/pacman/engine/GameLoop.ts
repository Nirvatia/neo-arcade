export class GameLoop {
	private readonly step: number;
	private readonly update: (dt: number) => void;
	private readonly render: () => void;
	private running = false;
	private accumulator = 0;
	private lastTime = 0;
	private frameHandle = 0;

	constructor(update: (dt: number) => void, render: () => void, step = 1 / 60) {
		if (typeof update !== 'function' || typeof render !== 'function') {
			console.error('GameLoop.constructor', 'update or render is not a function');
			throw new Error('GameLoop.constructor: update and render are required');
		}
		if (!Number.isFinite(step) || step <= 0) {
			console.error('GameLoop.constructor', 'invalid fixed step', step);
			throw new Error('GameLoop.constructor: fixed step must be positive');
		}
		this.update = update;
		this.render = render;
		this.step = step;
	}

	start(): void {
		if (this.running) {
			return;
		}
		if (typeof window === 'undefined' || typeof performance === 'undefined') {
			console.error('GameLoop.start', 'browser environment is required');
			return;
		}
		this.running = true;
		this.accumulator = 0;
		this.lastTime = performance.now();
		this.frameHandle = window.requestAnimationFrame(this.tick);
	}

	stop(): void {
		if (!this.running) {
			return;
		}
		this.running = false;
		if (typeof window !== 'undefined') {
			window.cancelAnimationFrame(this.frameHandle);
		}
		this.accumulator = 0;
		this.frameHandle = 0;
	}

	private tick = (now: number): void => {
		if (!this.running) {
			return;
		}
		try {
			const frameTime = Math.min(0.25, Math.max(0, (now - this.lastTime) / 1000));
			this.lastTime = now;
			this.accumulator += frameTime;
			while (this.accumulator >= this.step) {
				this.update(this.step);
				this.accumulator -= this.step;
			}
			this.render();
		} catch (error: unknown) {
			console.error('GameLoop.tick', error);
			this.stop();
			return;
		}
		this.frameHandle = window.requestAnimationFrame(this.tick);
	};
}