export class ScoreModel {
	private scoreValue = 0;

	get score(): number {
		return this.scoreValue;
	}

	add(points: number): void {
		if (!Number.isFinite(points) || points < 0) {
			console.error('ScoreModel.add', 'invalid points', points);
			return;
		}

		this.scoreValue += Math.floor(points);
	}

	reset(): void {
		this.scoreValue = 0;
	}
}
