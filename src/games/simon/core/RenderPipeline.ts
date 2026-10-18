import type { EventBus } from './EventBus';
import type { SimonModel } from '../logic/SimonModel';
import type { Director } from './Director';
import {
	SimonEvent,
	type SimonEventPayloads,
	type SimonUiSnapshot
} from './Events';
import { SimonState } from './SimonTypes';

export class RenderPipeline {
	private lastKey = '';

	constructor(
		private readonly events: EventBus<SimonEventPayloads>,
		private readonly model: SimonModel,
		private readonly director: Director
	) {}

	render(): void {
		const snapshot = this.buildSnapshot();
		const key = this.createKey(snapshot);

		if (key === this.lastKey) {
			return;
		}

		this.lastKey = key;
		this.events.emit(SimonEvent.UiSync, snapshot);
	}

	buildSnapshot(): SimonUiSnapshot {
		return {
			state: this.director.getCurrentState()?.view ?? SimonState.Boot,
			difficulty: this.model.difficulty,
			round: this.model.round,
			activePad: this.model.activePad,
			inputLocked: this.model.inputLocked,
			failureReason: this.model.failureReason,
			mode: this.model.mode,
			score: this.model.score,
			combo: this.model.combo,
			lives: this.model.lives,
			level: this.model.level,
			best: this.model.best,
			orderText: this.model.orderText,
			orderSay: this.model.orderSay,
			orderPad: this.model.orderPad,
			timerProgress: this.model.timerProgress,
			statusText: this.model.statusText,
			failureMessage: this.model.failureMessage,

			mascotMood: this.model.mascotMood,
			bossTag: this.model.bossTag,
			flavorText: this.model.flavorText,
			isBreak: this.model.isBreak,
			ordersInLevel: this.model.ordersInLevel,
			ordersPerLevel: this.model.ordersPerLevel
		};
	}

	private createKey(snapshot: SimonUiSnapshot): string {
		return [
			snapshot.state,
			snapshot.mode,
			snapshot.difficulty,
			snapshot.round,
			snapshot.score,
			snapshot.combo,
			snapshot.lives,
			snapshot.level,
			snapshot.best,
			snapshot.activePad ?? 'null',
			String(snapshot.inputLocked),
			snapshot.failureReason ?? 'null',
			snapshot.orderText,
			snapshot.orderSay ? '1' : '0',
			snapshot.orderPad ?? 'null',
			Math.round(snapshot.timerProgress * 1000),
			snapshot.statusText,
			snapshot.failureMessage ?? 'null',

			snapshot.mascotMood,
			snapshot.bossTag,
			snapshot.flavorText,
			String(snapshot.isBreak),
			snapshot.ordersInLevel,
			snapshot.ordersPerLevel
		].join('|');
	}
}