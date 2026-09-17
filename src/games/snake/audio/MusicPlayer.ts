import type { EventBus } from '../core/EventBus.js';
import { DirectorState, type DirectorStateType } from '../core/Events.js';
import type { SnakeEventMap } from '../core/Events.js';

interface StateChangedPayload {
	previous: DirectorStateType;
	current: DirectorStateType;
}

export class MusicPlayer {
	private readonly events: EventBus<SnakeEventMap>;
	private readonly audio: HTMLAudioElement;
	private readonly stateHandler: (payload: StateChangedPayload) => void;
	private unlocked = false;
	private shouldPlay = false;

	constructor(events: EventBus<SnakeEventMap>, src: string) {
		this.events = events;
		this.audio = new Audio(src);
		this.audio.loop = true;
		this.stateHandler = (payload: StateChangedPayload): void => {
			this.onStateChanged(payload.current);
		};
		this.events.on('director:stateChanged', this.stateHandler);
	}

	public unlock(): void {
		if (this.unlocked) {
			return;
		}
		this.unlocked = true;
		this.tryPlay();
	}

	public setMuted(muted: boolean): void {
		this.audio.muted = muted;
	}

	public dispose(): void {
		this.audio.pause();
		this.events.off('director:stateChanged', this.stateHandler);
		this.audio.src = '';
		this.shouldPlay = false;
		this.unlocked = false;
	}

	private onStateChanged(current: DirectorStateType): void {
		if (current === DirectorState.PLAYING) {
			this.shouldPlay = true;
			this.tryPlay();
			return;
		}
		this.shouldPlay = false;
		this.audio.pause();
	}

	private tryPlay(): void {
		if (!this.unlocked) {
			return;
		}
		if (!this.shouldPlay) {
			return;
		}
		const promise = this.audio.play();
		promise.catch(() => {
			// Автовоспроизведение заблокировано или прервано паузой — игнорируем.
		});
	}
}
