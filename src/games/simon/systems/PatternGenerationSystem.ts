import {
  SimonDifficulty,
  SimonDifficultySettings,
  type SimonDifficultyId
} from '../core/SimonTypes';
import {
  SimonComponent,
  type SimonDifficultyComponent,
  type SimonInputComponent,
  type SimonInputQueueComponent,
  type SimonPatternComponent,
  type SimonPlaybackComponent,
  type SimonRoundComponent,
  type SimonRoundStartRequestComponent,
  type SimonStatsComponent
} from '../components/SimonComponents';
import { SystemBase, type SystemContext } from '../engine/ecs/SystemBase';
import type { World } from '../engine/ecs/World';
import { generateSimonPattern } from '../logic/PatternGenerator';

export class PatternGenerationSystem extends SystemBase<World> {
  readonly name = 'simon.PatternGenerationSystem';

  constructor() {
    super(100);
  }

  update(context: SystemContext<World>): void {
    const { world } = context;
    const entities = world.query([SimonComponent.RoundStartRequest]);

    for (const entity of entities) {
      const request = world.requireComponent<SimonRoundStartRequestComponent>(
        entity,
        SimonComponent.RoundStartRequest
      );

      if (!Number.isFinite(request.round)) {
        throw new Error('[PatternGenerationSystem] Round start request has invalid round');
      }

      const round = Math.max(1, Math.floor(request.round));
      const sequence = generateSimonPattern(round);

      const difficultyComponent = world.getComponent<SimonDifficultyComponent>(
        entity,
        SimonComponent.Difficulty
      );

      const difficulty = difficultyComponent?.difficulty ?? SimonDifficulty.Easy;

      const settings = Object.prototype.hasOwnProperty.call(SimonDifficultySettings, difficulty)
        ? SimonDifficultySettings[difficulty]
        : SimonDifficultySettings[SimonDifficulty.Easy];

      world.addComponent<SimonRoundComponent>(entity, SimonComponent.Round, {
        round
      });

      world.addComponent<SimonPatternComponent>(entity, SimonComponent.Pattern, {
        sequence
      });

      world.addComponent<SimonPlaybackComponent>(entity, SimonComponent.Playback, {
        timeMs: 0,
        lastTriggeredIndex: -1,
        completed: false,
        activePad: null,
        activeIndex: -1,
        startDelayMs: settings.startDelayMs,
        stepIntervalMs: settings.stepIntervalMs,
        highlightMs: settings.highlightMs,
        postPatternDelayMs: settings.postPatternDelayMs
      });

      world.addComponent<SimonInputComponent>(entity, SimonComponent.Input, {
        expectedIndex: 0,
        locked: true
      });

      world.addComponent<SimonInputQueueComponent>(entity, SimonComponent.InputQueue, {
        commands: []
      });

      if (world.hasComponent(entity, SimonComponent.Stats)) {
        const stats = world.requireComponent<SimonStatsComponent>(
          entity,
          SimonComponent.Stats
        );
        stats.clicksRound = 0;
      } else {
        world.addComponent<SimonStatsComponent>(entity, SimonComponent.Stats, {
          clicksTotal: 0,
          clicksRound: 0
        });
      }

      world.removeComponent(entity, SimonComponent.PlaybackCompleted);
      world.removeComponent(entity, SimonComponent.RoundCompleted);
      world.removeComponent(entity, SimonComponent.FailureOccurred);
      world.removeComponent(entity, SimonComponent.RoundStartRequest);
    }
  }
}