import { LINE_CLEAR_DURATION_MS, SCORE_TABLE, updateLevel } from '../config/GameplayConfig';
import { TetrisEvents } from '../core/Events';
import { tetrisBus } from '../engine/EventBus';
import { GridService } from '../logic/grid/GridService';
import type { GameModel } from '../core/GameModel';
import type { System } from './types';

const CLEAR_TXT = [
	'',
	'РЯД УКЛАДЫВАЕМ!',
	'БРИГАДА! ДВА РЯДА!',
	'ТРОЙКА — УДАРНО!',
	'ТЕТРИС! ПЕРЕВЫПОЛНЕНИЕ!'
];

export class LineClearSystem implements System {
	update(dt: number, model: GameModel): boolean {
		model.clearAccumulator += dt;
		if (model.clearAccumulator < LINE_CLEAR_DURATION_MS) {
			return false;
		}
		GridService.clearRows(model.grid, model.clearingRows);
		const cleared = model.clearingRows.length;
		model.score.lines += cleared;
		const scoreToAdd = SCORE_TABLE[cleared];
		if (scoreToAdd) {
			model.score.score += scoreToAdd * model.score.level;
		}
		const prevLevel = model.score.level;
		model.score.level = updateLevel(model.score.lines, model.score.level);
		model.clearingRows = [];
		model.clearAccumulator = 0;
		const flashText = CLEAR_TXT[cleared];
		if (flashText) {
			tetrisBus.emit(TetrisEvents.FLASH, flashText);
		}
		if (cleared === 4) {
			tetrisBus.emit(TetrisEvents.SHAKE);
		}
		if (model.score.level > prevLevel) {
			tetrisBus.emit(
				TetrisEvents.BANNER,
				`ПЯТИЛЕТКА №${model.score.level} — ДОСРОЧНО ВЫПОЛНЕНА!`
			);
		}
		return true;
	}
}