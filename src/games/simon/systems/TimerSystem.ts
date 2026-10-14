import {
	SimonComponent,
	type SimonFailureOccurredComponent,
	type SimonFeedbackTimerComponent,
	type SimonInputComponent,
	type SimonInputTimerComponent,
	type SimonOrderTimerComponent,
	type SimonPatternComponent,
	type SimonRoundComponent
} from '../components/SimonComponents';
import { SystemBase, type SystemContext } from '../engine/ecs/SystemBase';
import type { World } from '../engine/ecs/World';
import { SimonFailureReason, SimonPad } from '../core/SimonTypes';

export class TimerSystem extends SystemBase<World> {
	readonly name = 'simon.TimerSystem';

	constructor() {
		super(150);
	}

	update(context: SystemContext<World>): void {
		const { world, deltaMs } = context;

		if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
			return;
		}

		this.updateOrderTimers(world, deltaMs);
		this.updateInputTimers(world, deltaMs);
		this.updateFeedbackTimers(world, deltaMs);
	}

	private updateOrderTimers(world: World, deltaMs: number): void {
		const entities = world.query([SimonComponent.OrderTimer]);

		for (const entity of entities) {
			const timer = world.requireComponent<SimonOrderTimerComponent>(
				entity,
				SimonComponent.OrderTimer
			);

			if (timer.expired) {
				continue;
			}

			timer.elapsedMs = Math.max(0, timer.elapsedMs + deltaMs);

			if (timer.elapsedMs >= timer.durationMs) {
				timer.elapsedMs = timer.durationMs;
				timer.expired = true;
			}
		}
	}

	private updateInputTimers(world: World, deltaMs: number): void {
		const entities = world.query([
			SimonComponent.InputTimer,
			SimonComponent.Input,
			SimonComponent.Pattern,
			SimonComponent.Round
		]);

		for (const entity of entities) {
			const timer = world.requireComponent<SimonInputTimerComponent>(
				entity,
				SimonComponent.InputTimer
			);

			if (timer.expired) {
				continue;
			}

			timer.elapsedMs = Math.max(0, timer.elapsedMs + deltaMs);

			if (timer.elapsedMs < timer.durationMs) {
				continue;
			}

			timer.elapsedMs = timer.durationMs;
			timer.expired = true;

			const input = world.requireComponent<SimonInputComponent>(
				entity,
				SimonComponent.Input
			);

			if (input.locked) {
				continue;
			}

			if (
				world.hasComponent(entity, SimonComponent.FailureOccurred) ||
				world.hasComponent(entity, SimonComponent.RoundCompleted)
			) {
				continue;
			}

			const pattern = world.requireComponent<SimonPatternComponent>(
				entity,
				SimonComponent.Pattern
			);
			const round = world.requireComponent<SimonRoundComponent>(
				entity,
				SimonComponent.Round
			);

			const failedPad =
				pattern.sequence[input.expectedIndex] ?? SimonPad.Provesti;

			input.locked = true;

			world.addComponent<SimonFailureOccurredComponent>(
				entity,
				SimonComponent.FailureOccurred,
				{
					round: round.round,
					step: input.expectedIndex,
					pad: failedPad,
					reason: SimonFailureReason.Timeout
				}
			);
		}
	}

	private updateFeedbackTimers(world: World, deltaMs: number): void {
		const entities = world.query([SimonComponent.FeedbackTimer]);

		for (const entity of entities) {
			const timer = world.requireComponent<SimonFeedbackTimerComponent>(
				entity,
				SimonComponent.FeedbackTimer
			);

			if (timer.completed) {
				continue;
			}

			timer.elapsedMs = Math.max(0, timer.elapsedMs + deltaMs);

			if (timer.elapsedMs >= timer.durationMs) {
				timer.elapsedMs = timer.durationMs;
				timer.completed = true;
			}
		}
	}
}