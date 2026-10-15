import {
  SimonComponent,
  type SimonInputComponent,
  type SimonPatternComponent,
  type SimonPlaybackComponent,
  type SimonRoundComponent
} from '../components/SimonComponents';
import { SystemBase, type SystemContext } from '../engine/ecs/SystemBase';
import type { World } from '../engine/ecs/World';

export class PlaybackSystem extends SystemBase<World> {
  readonly name = 'simon.PlaybackSystem';

  constructor() {
    super(200);
  }

  update(context: SystemContext<World>): void {
    const { world, deltaMs } = context;
    const entities = world.query([
      SimonComponent.Pattern,
      SimonComponent.Playback,
      SimonComponent.Round
    ]);

    for (const entity of entities) {
      const pattern = world.requireComponent<SimonPatternComponent>(
        entity,
        SimonComponent.Pattern
      );

      const playback = world.requireComponent<SimonPlaybackComponent>(
        entity,
        SimonComponent.Playback
      );

      const roundComponent = world.requireComponent<SimonRoundComponent>(
        entity,
        SimonComponent.Round
      );

      if (playback.completed) {
        continue;
      }

      if (pattern.sequence.length === 0) {
        playback.completed = true;
        playback.activePad = null;
        playback.activeIndex = -1;

        world.addComponent(entity, SimonComponent.PlaybackCompleted, {
          round: roundComponent.round
        });

        this.unlockInput(world, entity);
        continue;
      }

      const currentMs = Number.isFinite(playback.timeMs) ? playback.timeMs : 0;
      playback.timeMs = Math.max(0, currentMs + deltaMs);

      const startDelayMs = Number.isFinite(playback.startDelayMs)
        ? Math.max(0, playback.startDelayMs)
        : 0;

      const stepIntervalMs = Number.isFinite(playback.stepIntervalMs)
        ? Math.max(1, playback.stepIntervalMs)
        : 1;

      const highlightMs = Number.isFinite(playback.highlightMs)
        ? Math.max(0, Math.min(playback.highlightMs, stepIntervalMs))
        : 0;

      const postPatternDelayMs = Number.isFinite(playback.postPatternDelayMs)
        ? Math.max(0, playback.postPatternDelayMs)
        : 0;

      const lastStartMs =
        startDelayMs + (pattern.sequence.length - 1) * stepIntervalMs;

      const completionMs = lastStartMs + postPatternDelayMs;

      playback.activePad = null;
      playback.activeIndex = -1;

      const localMs = playback.timeMs - startDelayMs;

      if (localMs >= 0) {
        const rawIndex = Math.floor(localMs / stepIntervalMs);
        const boundedIndex = Math.min(rawIndex, pattern.sequence.length - 1);

        if (boundedIndex >= 0 && boundedIndex > playback.lastTriggeredIndex) {
          playback.lastTriggeredIndex = boundedIndex;
        }

        if (
          boundedIndex >= 0 &&
          boundedIndex < pattern.sequence.length &&
          playback.timeMs < completionMs
        ) {
          const withinStepMs = localMs - boundedIndex * stepIntervalMs;

          if (withinStepMs >= 0 && withinStepMs < highlightMs) {
            playback.activePad = pattern.sequence[boundedIndex];
            playback.activeIndex = boundedIndex;
          }
        }
      }

      if (playback.timeMs >= completionMs) {
        playback.completed = true;
        playback.activePad = null;
        playback.activeIndex = -1;

        world.addComponent(entity, SimonComponent.PlaybackCompleted, {
          round: roundComponent.round
        });

        this.unlockInput(world, entity);
      }
    }
  }

  private unlockInput(world: World, entity: number): void {
    if (world.hasComponent(entity, SimonComponent.FailureOccurred)) {
      return;
    }

    const input = world.getComponent<SimonInputComponent>(
      entity,
      SimonComponent.Input
    );

    if (!input) {
      return;
    }

    input.locked = false;
  }
}