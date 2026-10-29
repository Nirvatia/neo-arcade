export class GameLoop {
	private readonly step: number;
	private readonly update: (dt: number) => void;
	private readonly render: () => void;
	private running = false;
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
		this.frameHandle = 0;
	}

	private tick = (now: number): void => {
		if (!this.running) {
			return;
		}
		try {
			// Variable step split into chunks of at most `step`: movement advances by the real
			// frame time, so high refresh displays never get frames without an update (judder).
			let remaining = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000));
			this.lastTime = now;
			while (remaining > 1e-6) {
				const dt = Math.min(this.step, remaining);
				this.update(dt);
				remaining -= dt;
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
