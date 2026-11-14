export interface FrameMetrics {
	readonly frameMs: number;
	readonly updateMs: number;
	readonly renderMs: number;
	/** How far behind the event loop the rAF timestamp is when its callback runs. */
	readonly rafLagMs: number;
	readonly width: number;
	readonly height: number;
	readonly pixelRatio: number;
}

export interface FramePerfSummary {
	readonly fps: number;
	readonly frameAvg: number;
	readonly frameP95: number;
	readonly frameWorst: number;
	readonly updateAvg: number;
	readonly updateP95: number;
	readonly renderAvg: number;
	readonly renderP95: number;
	readonly rafLagAvg: number;
	readonly rafLagP95: number;
	readonly rafLagMax: number;
	readonly inputCount: number;
	readonly inputAvg: number;
	readonly inputP95: number;
	readonly inputMax: number;
	readonly width: number;
	readonly height: number;
	readonly pixelRatio: number;
	readonly sampleCount: number;
}

const SAMPLE_COUNT = 240;

function pushCapped(list: number[], value: number): void {
	list.push(value);
	if (list.length > SAMPLE_COUNT) {
		list.splice(0, list.length - SAMPLE_COUNT);
	}
}

function average(values: readonly number[]): number {
	if (values.length === 0) {
		return 0;
	}
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: readonly number[], share: number): number {
	if (values.length === 0) {
		return 0;
	}
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * share) - 1))]!;
}

function worst(values: readonly number[]): number {
	if (values.length === 0) {
		return 0;
	}
	return Math.max(...values);
}

function finite(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Keeps the last few seconds of frame timings. `recordFrame` is called after the render callback
 * returns; the input timestamp is the last one before that render. Used by the dev panel only.
 */
export class FrameMeter {
	private frameTimes: number[] = [];
	private updateTimes: number[] = [];
	private renderTimes: number[] = [];
	private rafLags: number[] = [];
	private inputLatencies: number[] = [];
	private pendingInputAt: number | null = null;
	private width = 0;
	private height = 0;
	private pixelRatio = 1;

	observeInput(at: number = performance.now()): void {
		if (!finite(at)) {
			return;
		}
		this.pendingInputAt = at;
	}

	recordFrame(metrics: FrameMetrics, endedAt: number = performance.now()): void {
		if (!finite(metrics.frameMs) || !finite(metrics.updateMs) || !finite(metrics.renderMs)) {
			return;
		}
		pushCapped(this.frameTimes, metrics.frameMs);
		pushCapped(this.updateTimes, metrics.updateMs);
		pushCapped(this.renderTimes, metrics.renderMs);
		pushCapped(this.rafLags, metrics.rafLagMs);
		this.width = metrics.width;
		this.height = metrics.height;
		this.pixelRatio = metrics.pixelRatio;
		if (this.pendingInputAt !== null) {
			if (finite(endedAt) && endedAt >= this.pendingInputAt) {
				pushCapped(this.inputLatencies, endedAt - this.pendingInputAt);
			}
			this.pendingInputAt = null;
		}
	}

	reset(): void {
		this.frameTimes = [];
		this.updateTimes = [];
		this.renderTimes = [];
		this.rafLags = [];
		this.inputLatencies = [];
		this.pendingInputAt = null;
	}

	snapshot(): FramePerfSummary {
		const frameAvg = average(this.frameTimes);
		return {
			fps: frameAvg > 0 ? 1000 / frameAvg : 0,
			frameAvg,
			frameP95: percentile(this.frameTimes, 0.95),
			frameWorst: worst(this.frameTimes),
			updateAvg: average(this.updateTimes),
			updateP95: percentile(this.updateTimes, 0.95),
			renderAvg: average(this.renderTimes),
			renderP95: percentile(this.renderTimes, 0.95),
			rafLagAvg: average(this.rafLags),
			rafLagP95: percentile(this.rafLags, 0.95),
			rafLagMax: worst(this.rafLags),
			inputCount: this.inputLatencies.length,
			inputAvg: average(this.inputLatencies),
			inputP95: percentile(this.inputLatencies, 0.95),
			inputMax: worst(this.inputLatencies),
			width: this.width,
			height: this.height,
			pixelRatio: this.pixelRatio,
			sampleCount: this.frameTimes.length
		};
	}
}
