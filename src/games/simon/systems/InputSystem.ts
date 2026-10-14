import { SimonFailureReason } from '../core/SimonTypes';
import {
  SimonComponent,
  type SimonFailureOccurredComponent,
  type SimonInputComponent,
  type SimonInputQueueComponent,
  type SimonPatternComponent,
  type SimonRoundCompletedComponent,
  type SimonRoundComponent,
  type SimonStatsComponent
} from '../components/SimonComponents';
import { SystemBase, type SystemContext } from '../engine/ecs/SystemBase';
import type { World } from '../engine/ecs/World';
import type { SimonPadId } from '../core/SimonTypes';

export class InputSystem extends SystemBase<World> {
  readonly name = 'simon.InputSystem';

  constructor() {
    super(300);
  }

  update(context: SystemContext<World>): void {
    const { world } = context;
    const entities = world.query([
      SimonComponent.Pattern,
      SimonComponent.Input,
      SimonComponent.InputQueue,
      SimonComponent.Round
    ]);

    for (const entity of entities) {
      const pattern = world.requireComponent<SimonPatternComponent>(
        entity,
        SimonComponent.Pattern
      );

      const input = world.requireComponent<SimonInputComponent>(
        entity,
        SimonComponent.Input
      );

      const queue = world.requireComponent<SimonInputQueueComponent>(
        entity,
        SimonComponent.InputQueue
      );

      if (queue.commands.length === 0) {
        continue;
      }

      if (input.locked) {
        queue.commands.length = 0;
        continue;
      }

      if (!Number.isFinite(input.expectedIndex) || input.expectedIndex < 0) {
        input.expectedIndex = 0;
      }

      while (queue.commands.length > 0) {
        const pad = queue.commands.shift();

        if (pad === undefined) {
          continue;
        }

        this.processCommand(world, entity, pattern, input, pad);

        if (input.locked) {
          queue.commands.length = 0;
          break;
        }
      }
    }
  }

  private processCommand(
    world: World,
    entity: number,
    pattern: SimonPatternComponent,
    input: SimonInputComponent,
    pad: SimonPadId
  ): void {
    const roundComponent = world.requireComponent<SimonRoundComponent>(
      entity,
      SimonComponent.Round
    );

    const expectedPad = pattern.sequence[input.expectedIndex];

    if (expectedPad === undefined || input.expectedIndex >= pattern.sequence.length) {
      input.locked = true;

      this.addFailure(world, entity, {
        round: roundComponent.round,
        step: input.expectedIndex,
        pad,
        reason: SimonFailureReason.IncompleteSequence
      });

      return;
    }

    if (pad !== expectedPad) {
      input.locked = true;

      this.addFailure(world, entity, {
        round: roundComponent.round,
        step: input.expectedIndex,
        pad,
        reason: SimonFailureReason.WrongPad
      });

      return;
    }

    input.expectedIndex += 1;
    this.registerSuccessfulClick(world, entity);

    if (input.expectedIndex === pattern.sequence.length) {
      input.locked = true;

      if (!world.hasComponent(entity, SimonComponent.RoundCompleted)) {
        world.addComponent<SimonRoundCompletedComponent>(
          entity,
          SimonComponent.RoundCompleted,
          {
            round: roundComponent.round
          }
        );
      }
    }
  }

  private registerSuccessfulClick(world: World, entity: number): void {
    const stats = world.getComponent<SimonStatsComponent>(
      entity,
      SimonComponent.Stats
    );

    if (!stats) {
      return;
    }

    stats.clicksTotal += 1;
    stats.clicksRound += 1;
  }

  private addFailure(
    world: World,
    entity: number,
    failure: SimonFailureOccurredComponent
  ): void {
    if (world.hasComponent(entity, SimonComponent.FailureOccurred)) {
      return;
    }

    world.addComponent<SimonFailureOccurredComponent>(
      entity,
      SimonComponent.FailureOccurred,
      failure
    );
  }
}