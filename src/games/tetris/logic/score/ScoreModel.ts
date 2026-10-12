import { MIN_LEVEL } from '../../config/GameplayConfig';

export class ScoreModel {
	score = 0;
	lines = 0;
	level = MIN_LEVEL;

	reset(): void {
		this.score = 0;
		this.lines = 0;
		this.level = MIN_LEVEL;
	}
}