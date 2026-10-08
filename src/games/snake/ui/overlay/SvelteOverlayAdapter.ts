import { DirectorState, type DirectorStateType } from '../../core/Events.js';
import { createOverlayState, snakeOverlayStore } from './overlayStore.js';

export interface OverlayAdapter {
	setState(state: DirectorStateType): void;
	setScore(score: number): void;
	setNewRecord(isNew: boolean): void;
	setProgress(level: number, biomeIndex: number, infinite: boolean): void;
	destroy(): void;
}

export class SvelteOverlayAdapter implements OverlayAdapter {
	private state: DirectorStateType = DirectorState.MENU;
	private score = 0;
	private isNewRecord = false;
	private level = 1;
	private biomeIndex = 0;
	private infinite = false;
	private lastKey = '';

	constructor() {
		this.push();
	}

	public setState(state: DirectorStateType): void {
		if (this.state === state) {
			return;
		}

		this.state = state;
		this.push();
	}

	public setScore(score: number): void {
		if (this.score === score) {
			return;
		}

		this.score = score;
		this.push();
	}

	public setNewRecord(isNew: boolean): void {
		if (this.isNewRecord === isNew) {
			return;
		}

		this.isNewRecord = isNew;
		this.push();
	}

	public setProgress(level: number, biomeIndex: number, infinite: boolean): void {
		if (this.level === level && this.biomeIndex === biomeIndex && this.infinite === infinite) {
			return;
		}

		this.level = level;
		this.biomeIndex = biomeIndex;
		this.infinite = infinite;
		this.push();
	}

	public destroy(): void {
		this.lastKey = '';
		snakeOverlayStore.set(createOverlayState());
	}

	private push(): void {
		const key = [
			this.state,
			this.score,
			this.isNewRecord ? 1 : 0,
			this.level,
			this.biomeIndex,
			this.infinite ? 1 : 0
		].join('|');

		if (key === this.lastKey) {
			return;
		}

		this.lastKey = key;

		snakeOverlayStore.set({
			state: this.state,
			score: this.score,
			isNewRecord: this.isNewRecord,
			level: this.level,
			biomeIndex: this.biomeIndex,
			infinite: this.infinite
		});
	}
}
