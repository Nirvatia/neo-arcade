import type { EventBus } from '../core/EventBus';
import { SimonEvent, type SimonEventPayloads, type SimonUiSnapshot } from '../core/Events';
import {
	SimonPad,
	SimonState,
	type SimonPadId,
	type SimonStateId
} from '../core/SimonTypes';

const STORAGE_KEY = 'simon1c_muted';
const MASTER_GAIN = 0.5;

const PAD_FREQUENCIES: Record<SimonPadId, number> = {
	[SimonPad.Provesti]: 261.63,
	[SimonPad.Zapisat]: 329.63,
	[SimonPad.Udalit]: 392.0,
	[SimonPad.Eshche]: 523.25
};

interface ToneSpec {
	readonly wave: OscillatorType;
	readonly from: number;
	readonly to?: number;
	readonly ms: number;
	readonly gain: number;
	readonly at?: number;
}

export class SimonAudioPlayer {
	private context: AudioContext | null = null;
	private master: GainNode | null = null;
	private readonly unsubscribers: Array<() => void> = [];
	private lastState: SimonStateId | null = null;
	private lastLevel = 1;
	private mutedFlag = false;

	constructor(private readonly events: EventBus<SimonEventPayloads>) {
		this.mutedFlag = this.loadMuted();

		if (typeof window !== 'undefined') {
			window.addEventListener('pointerdown', this.onGesture, {
				capture: true,
				passive: true
			});
			window.addEventListener('keydown', this.onGesture, {
				capture: true,
				passive: true
			});
		}

		this.unsubscribers.push(
			this.events.on(SimonEvent.PadPressed, (payload) => {
				this.playPad(payload.pad, 1);
			})
		);

		this.unsubscribers.push(
			this.events.on(SimonEvent.PlaybackStepTriggered, (payload) => {
				this.playPad(payload.pad, 0.65);
			})
		);

		this.unsubscribers.push(
			this.events.on(SimonEvent.OrderAccepted, (payload) => {
				if (payload['break']) {
					this.breakChime();
					return;
				}
				if (payload.lottery !== null) {
					this.lottery();
					return;
				}
				if (payload.crit) {
					this.crit();
					return;
				}
				this.accept();
			})
		);

		this.unsubscribers.push(
			this.events.on(SimonEvent.OrderRejected, () => {
				this.reject();
			})
		);

		this.unsubscribers.push(
			this.events.on(SimonEvent.UiSync, (snapshot) => {
				this.onSync(snapshot);
			})
		);
	}

	get muted(): boolean {
		return this.mutedFlag;
	}

	setMuted(value: boolean): void {
		const next = Boolean(value);
		this.mutedFlag = next;
		this.persist(next);

		if (next) {
			if (this.master) {
				this.master.gain.value = 0;
			}
			return;
		}

		this.ensureContext();
		if (this.master) {
			this.master.gain.value = MASTER_GAIN;
		}
	}

	destroy(): void {
		for (const off of this.unsubscribers) {
			off();
		}
		this.unsubscribers.length = 0;

		if (typeof window !== 'undefined') {
			window.removeEventListener('pointerdown', this.onGesture, true);
			window.removeEventListener('keydown', this.onGesture, true);
		}

		const context = this.context;
		this.context = null;
		this.master = null;

		if (context) {
			void context.close().catch(() => undefined);
		}
	}

	private readonly onGesture = (): void => {
		this.ensureContext();
	};

	private onSync(snapshot: SimonUiSnapshot): void {
		const previous = this.lastState;
		const next = snapshot.state;

		if (previous !== next && previous !== SimonState.Paused) {
			if (next === SimonState.GameOver) {
				this.gameOver();
			} else if (previous === SimonState.Menu) {
				this.coin();
			} else if (next === SimonState.OrdersAwaiting) {
				if (snapshot.isBreak) {
					this.breakIntro();
				} else {
					this.blip();
				}
			} else if (next === SimonState.Paused) {
				this.pauseBlip();
			}
		}

		if (snapshot.level > this.lastLevel && next !== SimonState.GameOver) {
			this.levelUp();
		}

		this.lastLevel = snapshot.level;
		this.lastState = next;
	}

	private playPad(pad: SimonPadId, scale: number): void {
		const frequency = PAD_FREQUENCIES[pad] ?? 320;

		this.tone({
			wave: 'triangle',
			from: frequency,
			ms: 220,
			gain: 0.22 * scale
		});
		this.tone({
			wave: 'square',
			from: frequency * 2,
			ms: 110,
			gain: 0.05 * scale
		});
		this.tone({
			wave: 'sine',
			from: frequency / 2,
			ms: 260,
			gain: 0.1 * scale
		});
	}

	private blip(): void {
		this.tone({ wave: 'square', from: 660, ms: 70, gain: 0.12 });
	}

	private coin(): void {
		this.tone({ wave: 'square', from: 987.77, ms: 70, gain: 0.16 });
		this.tone({ wave: 'square', from: 1318.51, ms: 170, gain: 0.16, at: 70 });
	}

	private accept(): void {
		const notes = [523.25, 659.25, 783.99];
		notes.forEach((frequency, index) => {
			this.tone({
				wave: 'square',
				from: frequency,
				ms: 110,
				gain: 0.15,
				at: index * 70
			});
		});
	}

	private crit(): void {
		const notes = [523.25, 783.99, 1046.5, 1567.98];
		notes.forEach((frequency, index) => {
			this.tone({
				wave: 'square',
				from: frequency,
				ms: 90,
				gain: 0.14,
				at: index * 55
			});
		});
		this.noise(220, 0.08, 0, 3200);
	}

	private lottery(): void {
		const notes = [392.0, 523.25, 659.25, 880.0, 1174.66];
		notes.forEach((frequency, index) => {
			this.tone({
				wave: 'triangle',
				from: frequency,
				ms: 130,
				gain: 0.16,
				at: index * 80
			});
		});
	}

	private breakIntro(): void {
		this.tone({ wave: 'sine', from: 523.25, ms: 160, gain: 0.12 });
		this.tone({ wave: 'sine', from: 392.0, ms: 220, gain: 0.12, at: 130 });
	}

	private breakChime(): void {
		this.tone({ wave: 'sine', from: 392.0, ms: 380, gain: 0.16 });
		this.tone({ wave: 'sine', from: 293.66, ms: 520, gain: 0.14, at: 200 });
		this.noise(600, 0.03, 60, 900);
	}

	private reject(): void {
		this.tone({ wave: 'sawtooth', from: 220, to: 70, ms: 420, gain: 0.24 });
		this.tone({ wave: 'square', from: 110, to: 55, ms: 420, gain: 0.14 });
		this.noise(180, 0.1, 0, 500);
	}

	private levelUp(): void {
		const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];
		notes.forEach((frequency, index) => {
			this.tone({
				wave: 'square',
				from: frequency,
				ms: 120,
				gain: 0.15,
				at: index * 85
			});
		});
	}

	private gameOver(): void {
		this.tone({ wave: 'sawtooth', from: 392.0, to: 98.0, ms: 900, gain: 0.2 });
		this.tone({
			wave: 'triangle',
			from: 196.0,
			to: 49.0,
			ms: 1100,
			gain: 0.16,
			at: 120
		});
		this.noise(900, 0.06, 0, 300);
	}

	private pauseBlip(): void {
		this.tone({ wave: 'triangle', from: 440, to: 220, ms: 200, gain: 0.14 });
	}

	private tone(spec: ToneSpec): void {
		const context = this.ensureContext();
		const master = this.master;

		if (!context || !master || this.mutedFlag) {
			return;
		}

		const start = context.currentTime + (spec.at ?? 0) / 1000;
		const duration = Math.max(0.03, spec.ms / 1000);
		const oscillator = context.createOscillator();
		const gain = context.createGain();

		oscillator.type = spec.wave;
		oscillator.frequency.setValueAtTime(Math.max(20, spec.from), start);

		if (spec.to !== undefined && spec.to > 0) {
			oscillator.frequency.exponentialRampToValueAtTime(
				Math.max(20, spec.to),
				start + duration
			);
		}

		const peak = Math.max(0.0002, spec.gain);
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(
			peak,
			start + Math.min(0.02, duration * 0.25)
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

		oscillator.connect(gain).connect(master);
		oscillator.start(start);
		oscillator.stop(start + duration + 0.02);
	}

	private noise(durationMs: number, gainValue: number, delayMs: number, centerHz: number): void {
		const context = this.ensureContext();
		const master = this.master;

		if (!context || !master || this.mutedFlag) {
			return;
		}

		const duration = Math.max(0.03, durationMs / 1000);
		const length = Math.max(1, Math.floor(context.sampleRate * duration));
		const buffer = context.createBuffer(1, length, context.sampleRate);
		const data = buffer.getChannelData(0);

		for (let index = 0; index < length; index += 1) {
			data[index] = Math.random() * 2 - 1;
		}

		const start = context.currentTime + delayMs / 1000;
		const source = context.createBufferSource();
		const filter = context.createBiquadFilter();
		const gain = context.createGain();

		source.buffer = buffer;
		filter.type = 'bandpass';
		filter.frequency.value = Math.max(60, centerHz);
		filter.Q.value = 0.9;

		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

		source.connect(filter).connect(gain).connect(master);
		source.start(start);
		source.stop(start + duration + 0.02);
	}

	private ensureContext(): AudioContext | null {
		if (this.mutedFlag || typeof window === 'undefined') {
			return null;
		}

		const scope = window as unknown as {
			AudioContext?: typeof AudioContext;
			webkitAudioContext?: typeof AudioContext;
		};
		const Constructor = scope.AudioContext ?? scope.webkitAudioContext;

		if (!Constructor) {
			return null;
		}

		if (!this.context) {
			this.context = new Constructor();
			const master = this.context.createGain();
			master.gain.value = this.mutedFlag ? 0 : MASTER_GAIN;
			master.connect(this.context.destination);
			this.master = master;
		}

		if (this.context.state === 'suspended') {
			void this.context.resume().catch(() => undefined);
		}

		return this.context;
	}

	private loadMuted(): boolean {
		if (typeof window === 'undefined') {
			return false;
		}
		try {
			return window.localStorage.getItem(STORAGE_KEY) === '1';
		} catch {
			return false;
		}
	}

	private persist(value: boolean): void {
		if (typeof window === 'undefined') {
			return;
		}
		try {
			window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
		} catch {
			// Хранилище недоступно — звук просто не запомнится.
		}
	}
}