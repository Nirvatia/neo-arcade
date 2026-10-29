import type { EventBus } from '../engine/EventBus';
import type { PacmanAudioCue, PacmanEventMap, PacmanStateName } from '../core/Events';

const AUDIO_BASE = '/assets/pacman/sfx/';

const PRELOAD_FILES: readonly string[] = [
	'start.wav',
	'siren0.wav',
	'fright.wav',
	'eat_dot_0.wav',
	'eat_dot_1.wav',
	'eat_fruit.wav',
	'eat_ghost.wav',
	'death_0.wav',
	'death_1.wav',
	'intermission.wav',
	'extend.wav',
	'eyes.wav'
];

export class PacmanAudioPlayer {
	private readonly events: EventBus<PacmanEventMap>;
	private readonly available: boolean;
	private readonly sounds = new Map<string, HTMLAudioElement>();
	private background: HTMLAudioElement | null = null;
	private state: PacmanStateName = 'menu';
	private powerActive = false;
	private dotToggle = false;
	private deathToggle = false;
	private readonly unsubscribeState: () => void;
	private readonly unsubscribeCue: () => void;

	constructor(events: EventBus<PacmanEventMap>) {
		if (!events) {
			console.error('PacmanAudioPlayer.constructor', 'missing event bus');
			throw new Error('PacmanAudioPlayer.constructor: missing event bus');
		}
		this.events = events;
		this.available = typeof window !== 'undefined' && typeof Audio !== 'undefined';
		this.unsubscribeState = events.on('ui:stateChanged', (payload) => {
			this.handleState(payload.state);
		});
		this.unsubscribeCue = events.on('audio:cue', (payload) => {
			this.handleCue(payload.cue);
		});
		this.preload();
	}

	destroy(): void {
		this.unsubscribeState();
		this.unsubscribeCue();
		this.stopBackground();
		for (const audio of this.sounds.values()) {
			audio.pause();
		}
		this.sounds.clear();
	}

	private preload(): void {
		if (!this.available) {
			return;
		}
		for (const name of PRELOAD_FILES) {
			this.sound(name);
		}
	}

	private handleState(next: PacmanStateName): void {
		if (next !== 'ready') {
			this.stop('start.wav');
		}
		if (next === 'menu' || next === 'game-over') {
			this.powerActive = false;
		}
		this.state = next;
		this.updateBackground();
	}

	private handleCue(cue: PacmanAudioCue): void {
		if (cue === 'intro') {
			// the new-game jingle; leaving READY stops it (see handleState)
			this.play('start.wav', 0.8);
			return;
		}
		if (cue === 'dot') {
			this.dotToggle = !this.dotToggle;
			this.play(this.dotToggle ? 'eat_dot_0.wav' : 'eat_dot_1.wav', 0.55);
			return;
		}
		if (cue === 'energizer') {
			this.play('eat_fruit.wav', 0.6);
			return;
		}
		if (cue === 'power-start') {
			this.powerActive = true;
			this.updateBackground();
			return;
		}
		if (cue === 'power-end') {
			this.powerActive = false;
			this.updateBackground();
			return;
		}
		if (cue === 'ghost-eaten') {
			this.play('eat_ghost.wav', 0.7);
			return;
		}
		if (cue === 'death') {
			this.deathToggle = !this.deathToggle;
			this.play(this.deathToggle ? 'death_0.wav' : 'death_1.wav', 0.75);
			return;
		}
		if (cue === 'lose') {
			this.play('death_1.wav', 0.8);
			return;
		}
		if (cue === 'win') {
			this.play('intermission.wav', 0.8);
			return;
		}
		if (cue === 'fruit-spawn') {
			return;
		}
		if (cue === 'fruit-collect') {
			this.play('eat_fruit.wav', 0.65);
			return;
		}
		if (cue === 'fruit-expire') {
			return;
		}
		if (cue === 'egg-spawn') {
			this.play('extend.wav', 0.5);
			return;
		}
		if (cue === 'egg-collect') {
			this.play('eat_fruit.wav', 0.65);
			return;
		}
		if (cue === 'exit-open') {
			this.play('extend.wav', 0.65);
			return;
		}
		if (cue === 'exit-enter') {
			this.play('intermission.wav', 0.8);
			return;
		}
		if (cue === 'teleport') {
			this.play('eyes.wav', 0.55);
			return;
		}
		console.error('PacmanAudioPlayer.handleCue', 'unknown audio cue', cue);
	}

	private updateBackground(): void {
		if (this.state !== 'playing') {
			this.stopBackground();
			return;
		}
		if (this.powerActive) {
			this.startLoop('fright.wav', 0.3);
			return;
		}
		this.startLoop('siren0.wav', 0.25);
	}

	private startLoop(name: string, volume: number): void {
		if (!this.available) {
			return;
		}
		const audio = this.sound(name);
		if (!audio) {
			return;
		}
		if (this.background === audio) {
			return;
		}
		this.stopBackground();
		audio.loop = true;
		audio.volume = Math.max(0, volume);
		audio.currentTime = 0;
		void audio.play().catch(() => undefined);
		this.background = audio;
	}

	private stopBackground(): void {
		if (!this.background) {
			return;
		}
		this.background.pause();
		this.background.loop = false;
		this.background.currentTime = 0;
		this.background = null;
	}

	private play(name: string, volume: number): void {
		if (!this.available) {
			return;
		}
		const audio = this.sound(name);
		if (!audio) {
			return;
		}
		audio.loop = false;
		audio.volume = Math.max(0, volume);
		audio.currentTime = 0;
		void audio.play().catch(() => undefined);
	}

	private stop(name: string): void {
		const audio = this.sounds.get(name);
		if (!audio) {
			return;
		}
		audio.pause();
		audio.loop = false;
		audio.currentTime = 0;
	}

	private sound(name: string): HTMLAudioElement | null {
		if (!this.available) {
			return null;
		}
		let audio = this.sounds.get(name);
		if (!audio) {
			audio = new Audio(AUDIO_BASE + name);
			audio.preload = 'auto';
			this.sounds.set(name, audio);
		}
		return audio;
	}
}
