import type { Cutscene } from './Cutscene';
import { LevelClearCutscene } from './LevelClearCutscene';

const LEVEL_CLEAR_CUTSCENE = new LevelClearCutscene();

export function levelClearCutscene(): Cutscene {
	return LEVEL_CLEAR_CUTSCENE;
}