export class CanvasSurface {
	public readonly canvas: HTMLCanvasElement;
	public readonly ctx: CanvasRenderingContext2D;
	private dpr = 1;
	private width = 0;
	private height = 0;
	private background = '#000000';
	private frameCallback: ((deltaMS: number, timeMS: number) => void) | null = null;
	private rafId = 0;
	private lastTime = -1;

	constructor(parent: HTMLElement, width: number, height: number) {
		this.canvas = document.createElement('canvas');
		this.canvas.style.display = 'block';
		this.canvas.style.borderRadius = '6px';
		this.canvas.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.6)';

		const ctx = this.canvas.getContext('2d', { alpha: false });

		if (ctx === null) {
			throw new Error('CanvasSurface: cannot create 2D context.');
		}

		this.ctx = ctx;
		parent.appendChild(this.canvas);

		this.setSize(width, height);
	}

	public setBackground(color: number): void {
		this.background = `#${color.toString(16).padStart(6, '0')}`;
	}

	public setSize(width: number, height: number): void {
		this.dpr = Math.min(window.devicePixelRatio || 1, 2);
		this.width = width;
		this.height = height;

		this.canvas.width = Math.max(1, Math.round(width * this.dpr));
		this.canvas.height = Math.max(1, Math.round(height * this.dpr));
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;

		this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		this.clear();
	}

	public clear(): void {
		this.ctx.save();
		this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		this.ctx.fillStyle = this.background;
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.ctx.restore();
	}

	public onFrame(callback: (deltaMS: number, timeMS: number) => void): void {
		this.frameCallback = callback;
		this.start();
	}

	public destroy(): void {
		if (this.rafId !== 0) {
			cancelAnimationFrame(this.rafId);
		}

		this.rafId = 0;
		this.lastTime = -1;
		this.frameCallback = null;
		this.canvas.remove();
	}

	private start(): void {
		if (this.rafId !== 0) {
			return;
		}

		const loop = (timeMS: number): void => {
			this.rafId = requestAnimationFrame(loop);

			const deltaMS =
				this.lastTime < 0 ? 16.6 : Math.max(0, timeMS - this.lastTime);

			this.lastTime = timeMS;

			if (this.frameCallback !== null) {
				this.frameCallback(deltaMS, timeMS);
			}
		};

		this.rafId = requestAnimationFrame(loop);
	}
}