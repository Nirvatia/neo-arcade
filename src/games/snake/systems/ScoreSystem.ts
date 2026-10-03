import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';

export class ScoreSystem extends SystemBase {
	public readonly name = 'ScoreSystem';

	private readonly pointsPerSequence: number;
	private readonly pointsFinalSequence: number;
	private readonly comboMaxMultiplier: number;

	constructor(
		world: World,
		pointsPerSequence: number,
		pointsFinalSequence: number,
		comboMaxMultiplier: number
	) {
		super(world);
		this.pointsPerSequence = pointsPerSequence;
		this.pointsFinalSequence = pointsFinalSequence;
		this.comboMaxMultiplier = comboMaxMultiplier;
	}

	public onSequenceCompleted(streak: number): void {
		const multiplier = Math.min(
			Math.max(1, streak),
			this.comboMaxMultiplier
		);

		this.addPoints(this.pointsPerSequence * multiplier);
	}

	public onFinalCompleted(): void {
		this.addPoints(this.pointsFinalSequence);
	}

	public addPoints(points: number): void {
		const scoreEntities = this.world.query(['score']).entities;

		if (scoreEntities.length === 0) {
			return;
		}

		const scoreEntity = scoreEntities[0];
		const score = this.world.getComponent(scoreEntity, 'score');

		if (score !== undefined) {
			score.value = score.value + points;

			if (score.value < 0) {
				score.value = 0;
			}

			this.world.events.emit('score:changed', { score: score.value });
		}
	}

	public update(_deltaMS: number): void {
		// Счёт управляется прямыми вызовами.
	}
}