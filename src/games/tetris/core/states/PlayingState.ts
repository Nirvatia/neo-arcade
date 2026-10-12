import { GamePhase } from '../types';
import { TetrisEvents } from '../Events';
import { tetrisBus } from '../../engine/EventBus';
import { GridService } from '../../logic/grid/GridService';
import { PieceService } from '../../logic/piece/PieceService';
import { GravitySystem } from '../../systems/GravitySystem';
import { LockSystem } from '../../systems/LockSystem';
import { ClearingState } from './ClearingState';
import { GameOverState } from './GameOverState';
import type { GameModel } from '../GameModel';
import type { StateMachine } from '../../engine/StateMachine';
import type { GameState } from './types';

export class PlayingState implements GameState {
	private gravitySystem = new GravitySystem();
	private lockSystem = new LockSystem();

	enter(model: GameModel): void {
		model.phase = GamePhase.PLAYING;
		if (!model.queue.current) {
			if (!PieceService.spawn(model)) {
				model.phase = GamePhase.GAMEOVER;
			}
		}
	}

	update(dt: number, model: GameModel, sm: StateMachine): void {
		if (!model.queue.current) {
			if (!PieceService.spawn(model)) {
				sm.changeState(new GameOverState());
				return;
			}
		}
		if (model.forceLock) {
			model.forceLock = false;
			tetrisBus.emit(TetrisEvents.SHAKE);
			this.handleLock(model, sm);
			return;
		}
		this.gravitySystem.update(dt, model);
		const shouldLock = this.lockSystem.update(dt, model);
		if (shouldLock) {
			this.handleLock(model, sm);
		}
	}

	private handleLock(model: GameModel, sm: StateMachine): void {
		const aboveVisibleField = PieceService.lock(model);
		if (aboveVisibleField) {
			sm.changeState(new GameOverState());
			return;
		}
		const fullRows = GridService.findFullRows(model.grid);
		if (fullRows.length > 0) {
			model.clearingRows = fullRows;
			model.clearAccumulator = 0;
			sm.changeState(new ClearingState());
			return;
		}
		if (!PieceService.spawn(model)) {
			sm.changeState(new GameOverState());
		}
	}

	exit(): void {}
}