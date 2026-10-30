/**
 * Chiptune sound for the arcade level, synthesised with WebAudio (square, triangle and
 * noise voices with short envelopes): our own effects and melodies, no sample files.
 * The AudioContext is created on the first sound, after the player has pressed a key.
 */

export type ArcadeSound =
	'chomp' | 'power' | 'ghost' | 'fruit' | 'death' | 'extra' | 'start' | 'clear' | 'intermission';

export type ArcadeLoop = 'hum' | 'scared' | 'eyes' | null;

type Wave = 'square' | 'triangle' | 'sawtooth';
/** [note (semitones from A4, null = rest), length in beats] */
type Phrase = ReadonlyArray<readonly [number | null, number]>;

const hz = (semi: number): number => 440 * 2 ** (semi / 12);

// Round start, ~2.2 s at 150 bpm: a bouncy minor riff over a walking bass.
const START_LEAD: Phrase = [
	[3, 0.5],
	[10, 0.5],
	[7, 0.5],
	[3, 0.5],
	[5, 0.5],
	[12, 0.5],
	[10, 1],
	[8, 0.5],
	[7, 0.5],
	[5, 0.5],
	[3, 0.5],
	[15, 1.5]
];
const START_BASS: Phrase = [
	[-21, 1],
	[-14, 1],
	[-16, 1],
	[-9, 1],
	[-11, 1],
	[-14, 1],
	[-21, 1.5]
];
// Intermission, ~7.3 s at 132 bpm: a sneaky tiptoe theme, then the chase.
const TIPTOE_LEAD: Phrase = [
	[0, 0.5],
	[null, 0.5],
	[3, 0.5],
	[null, 0.5],
	[7, 0.25],
	[6, 0.25],
	[7, 0.5],
	[null, 1],
	[0, 0.5],
	[null, 0.5],
	[3, 0.5],
	[null, 0.5],
	[8, 0.25],
	[7, 0.25],
	[8, 0.5],
	[null, 1],
	[12, 0.25],
	[11, 0.25],
	[10, 0.25],
	[9, 0.25],
	[8, 0.25],
	[7, 0.25],
	[6, 0.25],
	[5, 0.25],
	[3, 0.5],
	[7, 0.5],
	[12, 1]
];
const TIPTOE_BASS: Phrase = [
	[-24, 1],
	[-17, 1],
	[-24, 1],
	[-17, 1],
	[-24, 1],
	[-16, 1],
	[-24, 1],
	[-16, 1],
	[-19, 0.5],
	[-19, 0.5],
	[-19, 0.5],
	[-19, 0.5],
	[-24, 1],
	[-12, 1]
];

export class ArcadeSynth {
	private ac: AudioContext | null = null;
	private master: GainNode | null = null;
	private loopName: ArcadeLoop = null;
	private loopTimer: ReturnType<typeof setTimeout> | null = null;
	private loopNodes: AudioNode[] = [];
	private chompToggle = false;
	private urgency = 0;
	private readonly available = typeof window !== 'undefined' && 'AudioContext' in window;

	/** 0..1 (dots eaten): the hum rises and quickens. */
	setUrgency(value: number): void {
		this.urgency = Math.min(1, Math.max(0, value));
		if (this.loopName === 'hum') {
			this.startLoop('hum');
		}
	}

	setLoop(name: ArcadeLoop): void {
		if (name !== this.loopName) {
			this.startLoop(name);
		}
	}

	play(sound: ArcadeSound): void {
		const ac = this.context();
		if (!ac) {
			return;
		}
		const t = ac.currentTime + 0.01;
		switch (sound) {
			case 'chomp': {
				// a dry tick-tock, alternating pitch
				this.chompToggle = !this.chompToggle;
				this.tone('triangle', this.chompToggle ? 520 : 390, t, 0.05, 0.28, 0.6);
				break;
			}
			case 'power':
				this.sweep('square', 220, 880, t, 0.18, 0.12);
				break;
			case 'ghost':
				[0, 4, 7, 12, 16].forEach((s, i) =>
					this.tone('square', hz(s + 7), t + i * 0.035, 0.04, 0.14)
				);
				break;
			case 'fruit':
				this.tone('triangle', hz(12), t, 0.08, 0.3);
				this.tone('triangle', hz(19), t + 0.08, 0.18, 0.3);
				break;
			case 'extra':
				[0, 4, 7, 12, 7, 12].forEach((s, i) =>
					this.tone('square', hz(s + 3), t + i * 0.07, 0.06, 0.12)
				);
				break;
			case 'death': {
				// a sliding wail down a chromatic stair, then two thumps
				for (let i = 0; i < 12; i += 1) {
					this.sweep('triangle', hz(10 - i), hz(8 - i), t + i * 0.09, 0.085, 0.28);
				}
				this.noise(t + 1.15, 0.08, 0.35);
				this.noise(t + 1.32, 0.08, 0.35);
				break;
			}
			case 'clear':
				[12, 7, 12, 7, 12, 19].forEach((s, i) =>
					this.tone('triangle', hz(s), t + i * 0.12, 0.1, 0.25)
				);
				break;
			case 'start':
				this.phrase(START_LEAD, 'square', t, 150, 0.1);
				this.phrase(START_BASS, 'triangle', t, 150, 0.3);
				break;
			case 'intermission':
				this.phrase(TIPTOE_LEAD, 'square', t, 132, 0.09);
				this.phrase(TIPTOE_BASS, 'triangle', t, 132, 0.28);
				break;
		}
	}

	/** Stops the loop and everything scheduled. */
	stopAll(): void {
		this.startLoop(null);
		if (this.ac && this.master) {
			const t = this.ac.currentTime;
			this.master.gain.setValueAtTime(0, t);
			this.master.disconnect();
			this.master = this.ac.createGain();
			this.master.gain.value = 0.5;
			this.master.connect(this.ac.destination);
		}
	}

	destroy(): void {
		this.stopAll();
		void this.ac?.close().catch(() => undefined);
		this.ac = null;
	}

	private context(): AudioContext | null {
		if (!this.available) {
			return null;
		}
		if (!this.ac) {
			this.ac = new AudioContext();
			this.master = this.ac.createGain();
			this.master.gain.value = 0.5;
			this.master.connect(this.ac.destination);
		}
		if (this.ac.state === 'suspended') {
			void this.ac.resume().catch(() => undefined);
		}
		return this.ac;
	}

	private tone(
		wave: Wave,
		freq: number,
		at: number,
		length: number,
		volume: number,
		decay = 1
	): void {
		const ac = this.ac;
		if (!ac || !this.master) {
			return;
		}
		const osc = ac.createOscillator();
		const gain = ac.createGain();
		osc.type = wave;
		osc.frequency.setValueAtTime(freq, at);
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(volume, at + 0.004);
		gain.gain.setValueAtTime(volume, at + length * (1 - decay) + 0.004);
		gain.gain.exponentialRampToValueAtTime(0.0008, at + length + 0.02);
		osc.connect(gain).connect(this.master);
		osc.start(at);
		osc.stop(at + length + 0.05);
	}

	private sweep(
		wave: Wave,
		from: number,
		to: number,
		at: number,
		length: number,
		volume: number
	): void {
		const ac = this.ac;
		if (!ac || !this.master) {
			return;
		}
		const osc = ac.createOscillator();
		const gain = ac.createGain();
		osc.type = wave;
		osc.frequency.setValueAtTime(from, at);
		osc.frequency.exponentialRampToValueAtTime(to, at + length);
		gain.gain.setValueAtTime(volume, at);
		gain.gain.exponentialRampToValueAtTime(0.0008, at + length + 0.02);
		osc.connect(gain).connect(this.master);
		osc.start(at);
		osc.stop(at + length + 0.05);
	}

	private noise(at: number, length: number, volume: number): void {
		const ac = this.ac;
		if (!ac || !this.master) {
			return;
		}
		const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * length), ac.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i += 1) {
			data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
		}
		const src = ac.createBufferSource();
		const filter = ac.createBiquadFilter();
		const gain = ac.createGain();
		src.buffer = buffer;
		filter.type = 'lowpass';
		filter.frequency.value = 600;
		gain.gain.value = volume;
		src.connect(filter).connect(gain).connect(this.master);
		src.start(at);
	}

	private phrase(notes: Phrase, wave: Wave, at: number, bpm: number, volume: number): void {
		const beat = 60 / bpm;
		let t = at;
		for (const [note, beats] of notes) {
			if (note !== null) {
				this.tone(wave, hz(note), t, beats * beat * 0.85, volume, 0.5);
			}
			t += beats * beat;
		}
	}

	/** Background loops: a pulsing hum, a bubbling scared arpeggio, the eyes' quick blips. */
	private startLoop(name: ArcadeLoop): void {
		if (this.loopTimer) {
			clearTimeout(this.loopTimer);
			this.loopTimer = null;
		}
		for (const node of this.loopNodes) {
			try {
				(node as OscillatorNode).stop?.();
			} catch {
				// already stopped
			}
			node.disconnect();
		}
		this.loopNodes = [];
		this.loopName = name;
		if (!name) {
			return;
		}
		const ac = this.context();
		if (!ac || !this.master) {
			return;
		}
		if (name === 'hum') {
			// a low pulse wave with a wobble; faster and higher as the dots run out
			const osc = ac.createOscillator();
			const lfo = ac.createOscillator();
			const depth = ac.createGain();
			const gain = ac.createGain();
			osc.type = 'square';
			osc.frequency.value = 92 + this.urgency * 46;
			lfo.frequency.value = 2.4 + this.urgency * 3;
			depth.gain.value = 7;
			gain.gain.value = 0.045;
			lfo.connect(depth).connect(osc.frequency);
			const tremolo = ac.createGain();
			tremolo.gain.value = 0.5;
			const lfo2 = ac.createGain();
			lfo2.gain.value = 0.5;
			lfo.connect(lfo2).connect(tremolo.gain);
			osc.connect(gain).connect(tremolo).connect(this.master);
			osc.start();
			lfo.start();
			this.loopNodes = [osc, lfo, depth, gain, tremolo, lfo2];
			return;
		}
		const notes = name === 'scared' ? [7, 10, 14, 10] : [24, 19, 22, 17];
		const step = name === 'scared' ? 0.075 : 0.05;
		let i = 0;
		let next = ac.currentTime + 0.02;
		const tick = (): void => {
			const now = ac.currentTime;
			while (next < now + 0.12) {
				this.tone(
					'triangle',
					hz(notes[i % notes.length]),
					next,
					step * 0.8,
					name === 'scared' ? 0.1 : 0.07
				);
				next += step;
				i += 1;
			}
			this.loopTimer = setTimeout(tick, 25);
		};
		tick();
	}
}
