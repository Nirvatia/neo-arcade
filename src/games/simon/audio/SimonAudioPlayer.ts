import { SimonEvent, type SimonEventPayloads } from '../core/Events';
import { SimonPad, type SimonPadId } from '../core/SimonTypes';

interface SimonEventSource {
	on<K extends keyof SimonEventPayloads>(
		event: K,
		listener: (payload: SimonEventPayloads[K]) => void
	): () => void;
}

const SimonPadFrequencies: Readonly<Record<SimonPadId, number>> = Object.freeze({
	[SimonPad.Provesti]: 392.0,
	[SimonPad.Zapisat]: 493.88,
	[SimonPad.Udalit]: 329.63,
	[SimonPad.Eshche]: 587.33
});

export class SimonAudioPlayer {
	private readonly source: SimonEventSource;
	private readonly disposers: Array<() => void> = [];
	private context: AudioContext | null = null;
	private unlocked = false;

	private readonly unlockListener = (): void => {
		this.unlock();
	};

	constructor(source: SimonEventSource) {
		this.source = source;

		if (typeof window !== 'undefined') {
			window.addEventListener('pointerdown', this.unlockListener);
			window.addEventListener('keydown', this.unlockListener);
		}

		this.disposers.push(
			this.source.on(SimonEvent.PadPressed, (payload) => {
				this.unlock();
				this.playPad(payload.pad);
			})
		);

		this.disposers.push(
			this.source.on(SimonEvent.PlaybackStepTriggered, (payload) => {
				this.playPad(payload.pad);
			})
		);

		this.disposers.push(
			this.source.on(SimonEvent.InputRejected, () => {
				this.playError();
			})
		);

		this.disposers.push(
			this.source.on(SimonEvent.InputSequenceCompleted, () => {
				this.playSuccess();
			})
		);

		this.disposers.push(
			this.source.on(SimonEvent.StartRequested, () => {
				this.unlock();
			})
		);
	}

	destroy(): void {
		this.removeUnlockListeners();

		for (const dispose of this.disposers) {
			dispose();
		}

		this.disposers.length = 0;

		if (this.context) {
			void this.context.close().catch(() => undefined);
			this.context = null;
		}
	}

	private unlock(): void {
		if (this.unlocked) {
			return;
		}

		const context = this.ensureContext();

		if (!context) {
			return;
		}

		if (context.state === 'running') {
			this.unlocked = true;
			this.removeUnlockListeners();
			return;
		}

		void context
			.resume()
			.then(() => {
				this.unlocked = true;
				this.removeUnlockListeners();
			})
			.catch(() => undefined);
	}

	private ensureContext(): AudioContext | null {
		if (typeof window === 'undefined' || typeof AudioContext !== 'function') {
			return null;
		}

		if (this.context && this.context.state !== 'closed') {
			return this.context;
		}

		this.context = new AudioContext();
		return this.context;
	}

	private playPad(pad: SimonPadId): void {
		const context = this.ensureContext();

		if (!context || context.state !== 'running') {
			return;
		}

		const frequency = SimonPadFrequencies[pad];

		if (!Number.isFinite(frequency) || frequency <= 0) {
			return;
		}

		this.scheduleTone(context, {
			frequency,
			time: context.currentTime,
			duration: 0.2,
			peak: 0.12,
			type: 'sine'
		});
	}

	private playSuccess(): void {
		const context = this.ensureContext();

		if (!context || context.state !== 'running') {
			return;
		}

		const time = context.currentTime;

		this.scheduleTone(context, {
			frequency: 523.25,
			time,
			duration: 0.09,
			peak: 0.08,
			type: 'triangle'
		});

		this.scheduleTone(context, {
			frequency: 784.0,
			time: time + 0.1,
			duration: 0.12,
			peak: 0.08,
			type: 'triangle'
		});
	}

	private playError(): void {
		const context = this.ensureContext();

		if (!context || context.state !== 'running') {
			return;
		}

		const time = context.currentTime;
		const oscillator = context.createOscillator();
		const gain = context.createGain();

		oscillator.type = 'sawtooth';
		oscillator.frequency.setValueAtTime(320, time);
		oscillator.frequency.exponentialRampToValueAtTime(50, time + 0.6);

		gain.gain.setValueAtTime(0.0001, time);
		gain.gain.exponentialRampToValueAtTime(0.2, time + 0.03);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.65);

		oscillator.connect(gain);
		gain.connect(context.destination);

		oscillator.start(time);
		oscillator.stop(time + 0.7);
	}

	private scheduleTone(
		context: AudioContext,
		settings: {
			frequency: number;
			time: number;
			duration: number;
			peak: number;
			type: OscillatorType;
		}
	): void {
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		const stopTime = settings.time + settings.duration;

		oscillator.type = settings.type;
		oscillator.frequency.setValueAtTime(settings.frequency, settings.time);

		gain.gain.setValueAtTime(0.0001, settings.time);
		gain.gain.exponentialRampToValueAtTime(settings.peak, settings.time + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

		oscillator.connect(gain);
		gain.connect(context.destination);

		oscillator.start(settings.time);
		oscillator.stop(stopTime + 0.02);
	}

	private removeUnlockListeners(): void {
		if (typeof window === 'undefined') {
			return;
		}

		window.removeEventListener('pointerdown', this.unlockListener);
		window.removeEventListener('keydown', this.unlockListener);
	}
}