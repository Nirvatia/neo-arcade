import type { State, StateContext } from './State';
import type { SimonModel } from '../../logic/SimonModel';
import { SimonMode, SimonState, type SimonStateId } from '../SimonTypes';
import { ClassicState } from './ClassicState';
import { OrdersState } from './OrdersState';

type MascotMood =
	| 'normal'
	| 'happy'
	| 'shock'
	| 'angry'
	| 'coffee'
	| 'shout';

export class MenuState implements State {
	private unsubStart: (() => void) | null = null;

	constructor(private readonly model: SimonModel) {}

	get view(): SimonStateId {
		return SimonState.Menu;
	}

	enter(ctx: StateContext): void {
		this.model.resetRun();

		this.setVisual('happy', '1С ГОВОРИТ', 'база сама себя не проведёт…');

		this.model.activePad = null;
		this.model.inputLocked = true;

		this.model.failureReason = null;
		this.model.failureMessage = null;

		this.model.orderText = 'Нажмите «Начать смену», чтобы приступить.';
		this.model.orderSay = false;
		this.model.orderPad = null;
		this.model.timerProgress = 0;
		this.model.statusText = 'Готово';

		this.unsubStart = ctx.input.onStart(() => {
			if (this.model.mode === SimonMode.Orders) {
				ctx.director.setState(new OrdersState(this.model));
				return;
			}

			ctx.director.setState(new ClassicState(this.model));
		});
	}

	update(): void {}

	exit(): void {
		this.unsubStart?.();
		this.unsubStart = null;
	}

	private setVisual(
		mood: MascotMood,
		bossTag: string,
		flavorText: string
	): void {
		const visualModel = this.model as SimonModel & {
			mascotMood?: MascotMood;
			bossTag?: string;
			flavorText?: string;
			isBreak?: boolean;
		};

		visualModel.mascotMood = mood;
		visualModel.bossTag = bossTag;
		visualModel.flavorText = flavorText;
		visualModel.isBreak = false;
	}
}