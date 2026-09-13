import { SystemBase } from "../core/ecs/SystemBase.js";
import type { World } from "../core/ecs/World.js";

export class ScoreSystem extends SystemBase {
  public readonly name = "ScoreSystem";

  private readonly pointsPerFood: number;
  private readonly pointsPerSequence: number;
  private readonly penaltyPerFailure: number;

  constructor(
    world: World,
    pointsPerFood: number,
    pointsPerSequence: number,
    penaltyPerFailure: number,
  ) {
    super(world);
    this.pointsPerFood = pointsPerFood;
    this.pointsPerSequence = pointsPerSequence;
    this.penaltyPerFailure = penaltyPerFailure;
    this.world.events.on("collision:food", this.onFoodEaten);
    this.world.events.on("score:add", this.onScoreAdd);
    this.world.events.on("sequence:completed", this.onSequenceCompleted);
    this.world.events.on("sequence:failed", this.onSequenceFailed);
  }

  private onFoodEaten = (): void => {
    this.addPoints(this.pointsPerFood);
  };

  private onScoreAdd = (payload: { points: number }): void => {
    this.addPoints(payload.points);
  };

  private onSequenceCompleted = (): void => {
    this.addPoints(this.pointsPerSequence);
  };

  private onSequenceFailed = (): void => {
    this.addPoints(-this.penaltyPerFailure);
  };

  private addPoints(points: number): void {
    const scoreEntities = this.world.query(["score"]).entities;
    if (scoreEntities.length === 0) {
      return;
    }
    const scoreEntity = scoreEntities[0];
    const score = this.world.getComponent(scoreEntity, "score");
    if (score !== undefined) {
      score.value = score.value + points;
      // Не позволяем счету уйти в минус
      if (score.value < 0) {
        score.value = 0;
      }
      this.world.events.emit("score:changed", { score: score.value });
    }
  };

  public update(_deltaMS: number): void {
    // Счёт управляется событиями.
  }
}