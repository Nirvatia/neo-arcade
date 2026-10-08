import type { World } from '$games/snake/engine/ecs/World.js';
import { SystemBase } from '../../engine/ecs/SystemBase.js';

/**
 * ScoreSystem новой прогрессии.
 *
 * Источники очков:
 * - успешные последовательности;
 * - комбо-множитель;
 * - бонус за последовательность без ошибок;
 * - бонус за переход в новый биом.
 *
 * Очки за просто съеденную еду не начисляются.
 */
export class ScoreSystem extends SystemBase {
	public readonly name = 'ScoreSystem';

	private readonly pointsPerSequence: number;
	private readonly pointsFlawlessBonus: number;
	private readonly pointsBiomeBonus: number;
	private readonly comboMaxMultiplier: number;

	constructor(
		world: World,
		pointsPerSequence: number,
		pointsFlawlessBonus: number,
		pointsBiomeBonus: number,
		comboMaxMultiplier: number
	) {
		super(world);

		this.pointsPerSequence = pointsPerSequence;
		this.pointsFlawlessBonus = pointsFlawlessBonus;
		this.pointsBiomeBonus = pointsBiomeBonus;
		this.comboMaxMultiplier = comboMaxMultiplier;
	}

	public onSequenceCompleted(streak: number, flawless: boolean): void {
		const multiplier = Math.min(
			Math.max(1, streak),
			this.comboMaxMultiplier
		);

		let points = this.pointsPerSequence * multiplier;

		if (flawless) {
			points = points + this.pointsFlawlessBonus;
		}

		this.addPoints(points);
	}

	public onBiomeCompleted(): void {
		this.addPoints(this.pointsBiomeBonus);
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