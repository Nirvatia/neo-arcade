import {
	SimonComponent,
	type SimonComboComponent,
	type SimonInputQueueComponent,
	type SimonLevelComponent,
	type SimonLivesComponent,
	type SimonModeComponent,
	type SimonOrderAcceptedComponent,
	type SimonOrderComponent,
	type SimonOrderGenerationRequestComponent,
	type SimonOrderRejectedComponent,
	type SimonOrderTimerComponent,
	type SimonScoreComponent,
	type SimonSkipRequestedComponent
} from '../components/SimonComponents';
import { SystemBase, type SystemContext } from '../engine/ecs/SystemBase';
import type { World } from '../engine/ecs/World';
import {
	SimonFailureReason,
	SimonMode,
	SimonPad,
	type SimonFailureReasonId,
	type SimonPadId
} from '../core/SimonTypes';

const SimonOrderSuccessMessages: readonly string[] = [
	'Документ «Реализация товаров №{n}» проведён.',
	'Проводки сформированы автоматически.',
	'Партии пересчитаны. Расхождения отправлены в архив.',
	'Записано в журнал регистрации. Надеемся, вы ничего не нарушили.',
	'Отчётность сдана. Проверяющие уведомлены.'
];

function randomInt(maxExclusive: number): number {
	const safe = Math.max(1, Math.floor(maxExclusive));
	return Math.floor(Math.random() * safe);
}

function getPadLabel(pad: SimonPadId): string {
	switch (pad) {
		case SimonPad.Provesti:
			return 'Провести';
		case SimonPad.Zapisat:
			return 'Записать';
		case SimonPad.Udalit:
			return 'Пометить на удаление';
		case SimonPad.Eshche:
			return 'Ещё…';
	}
}

function createSuccessMessage(): string {
	const template =
		SimonOrderSuccessMessages[randomInt(SimonOrderSuccessMessages.length)] ??
		'Документ проведён.';
	return template.replace('{n}', String(1000 + randomInt(9000)));
}

export class OrdersSystem extends SystemBase<World> {
	readonly name = 'simon.OrdersSystem';

	constructor() {
		super(250);
	}

	update(context: SystemContext<World>): void {
		const { world } = context;

		this.generateOrders(world);
		this.processReactions(world);
	}

	private generateOrders(world: World): void {
		const entities = world.query([
			SimonComponent.Mode,
			SimonComponent.OrderGenerationRequest
		]);

		for (const entity of entities) {
			const mode = world.getComponent<SimonModeComponent>(
				entity,
				SimonComponent.Mode
			);

			const request = world.requireComponent<SimonOrderGenerationRequestComponent>(
				entity,
				SimonComponent.OrderGenerationRequest
			);

			world.removeComponent(entity, SimonComponent.OrderGenerationRequest);

			if (!mode || mode.mode !== SimonMode.Orders) {
				continue;
			}

			this.ensureProgressComponents(world, entity);

			const round = Math.max(1, Math.floor(request.round));
			const level = world.requireComponent<SimonLevelComponent>(
				entity,
				SimonComponent.Level
			);

			const pads = [
				SimonPad.Provesti,
				SimonPad.Zapisat,
				SimonPad.Udalit,
				SimonPad.Eshche
			];

			const pad = pads[randomInt(pads.length)] ?? SimonPad.Provesti;
			const say = Math.random() < 0.62;
			const durationMs = Math.max(
				1200,
				2700 - level.level * 130 - round * 8
			);

			world.addComponent<SimonRoundComponentLike>(entity, SimonComponent.Round, {
				round
			});

			world.addComponent<SimonOrderComponent>(entity, SimonComponent.Order, {
				round,
				pad,
				say
			});

			world.addComponent<SimonOrderTimerComponent>(
				entity,
				SimonComponent.OrderTimer,
				{
					elapsedMs: 0,
					durationMs,
					expired: false
				}
			);

			if (!world.hasComponent(entity, SimonComponent.InputQueue)) {
				world.addComponent<SimonInputQueueComponent>(
					entity,
					SimonComponent.InputQueue,
					{
						commands: []
					}
				);
			}

			const queue = world.requireComponent<SimonInputQueueComponent>(
				entity,
				SimonComponent.InputQueue
			);
			queue.commands.length = 0;

			world.removeComponent(entity, SimonComponent.SkipRequested);
			world.removeComponent(entity, SimonComponent.OrderAccepted);
			world.removeComponent(entity, SimonComponent.OrderRejected);
			world.removeComponent(entity, SimonComponent.OrderTimeout);
		}
	}

	private processReactions(world: World): void {
		const entities = world.query([SimonComponent.Mode, SimonComponent.Order]);

		for (const entity of entities) {
			const mode = world.getComponent<SimonModeComponent>(
				entity,
				SimonComponent.Mode
			);

			if (!mode || mode.mode !== SimonMode.Orders) {
				continue;
			}

			if (
				world.hasComponent(entity, SimonComponent.OrderAccepted) ||
				world.hasComponent(entity, SimonComponent.OrderRejected)
			) {
				continue;
			}

			const order = world.requireComponent<SimonOrderComponent>(
				entity,
				SimonComponent.Order
			);

			if (world.hasComponent(entity, SimonComponent.SkipRequested)) {
				world.removeComponent(entity, SimonComponent.SkipRequested);

				if (order.say) {
					this.rejectOrder(
						world,
						entity,
						order.round,
						SimonFailureReason.SkippedRequiredOrder,
						'Вы проигнорировали прямой приказ 1С!'
					);
				} else {
					this.acceptOrder(
						world,
						entity,
						order.round,
						'Команда отклонена. В журнале: «исполнение без приказа не зафиксировано».'
					);
				}

				continue;
			}

			const timer = world.getComponent<SimonOrderTimerComponent>(
				entity,
				SimonComponent.OrderTimer
			);

			if (timer && timer.expired) {
				if (order.say) {
					this.rejectOrder(
						world,
						entity,
						order.round,
						SimonFailureReason.Timeout,
						'Вы не успели выполнить приказ 1С. Документ остался непроведённым.'
					);
				} else {
					this.acceptOrder(
						world,
						entity,
						order.round,
						'Приказ проигнорирован. Верно: команда исходила не от 1С.'
					);
				}

				continue;
			}

			const queue = world.getComponent<SimonInputQueueComponent>(
				entity,
				SimonComponent.InputQueue
			);

			if (!queue || queue.commands.length === 0) {
				continue;
			}

			const pad = queue.commands.shift();

			if (pad === undefined) {
				continue;
			}

			if (order.say && pad === order.pad) {
				this.acceptOrder(world, entity, order.round, createSuccessMessage());
				continue;
			}

			if (!order.say) {
				this.rejectOrder(
					world,
					entity,
					order.round,
					SimonFailureReason.ExecutedForeignOrder,
					'Вы выполнили приказ, которого 1С не давала. Нарушение субординации!'
				);
				continue;
			}

			this.rejectOrder(
				world,
				entity,
				order.round,
				SimonFailureReason.WrongOrderButton,
				`Неверная кнопка. 1С просила «${getPadLabel(order.pad)}», а вы нажали «${getPadLabel(pad)}».`
			);
		}
	}

	private acceptOrder(
		world: World,
		entity: number,
		round: number,
		message: string
	): void {
		this.ensureProgressComponents(world, entity);

		const score = world.requireComponent<SimonScoreComponent>(
			entity,
			SimonComponent.Score
		);
		const combo = world.requireComponent<SimonComboComponent>(
			entity,
			SimonComponent.Combo
		);
		const level = world.requireComponent<SimonLevelComponent>(
			entity,
			SimonComponent.Level
		);
		const lives = world.requireComponent<SimonLivesComponent>(
			entity,
			SimonComponent.Lives
		);

		const scoreDelta = 10 + combo.combo * 2;

		score.score += scoreDelta;
		combo.combo += 1;

		if (round % 5 === 0) {
			level.level += 1;
		}

		if (round % 9 === 0 && lives.lives < 3) {
			lives.lives += 1;
		}

		world.addComponent<SimonOrderAcceptedComponent>(
			entity,
			SimonComponent.OrderAccepted,
			{
				round,
				scoreDelta,
				message
			}
		);

		this.clearOrderReaction(world, entity);
	}

	private rejectOrder(
		world: World,
		entity: number,
		round: number,
		reason: SimonFailureReasonId,
		message: string
	): void {
		this.ensureProgressComponents(world, entity);

		const lives = world.requireComponent<SimonLivesComponent>(
			entity,
			SimonComponent.Lives
		);
		const combo = world.requireComponent<SimonComboComponent>(
			entity,
			SimonComponent.Combo
		);

		lives.lives = Math.max(0, lives.lives - 1);
		combo.combo = 0;

		world.addComponent<SimonOrderRejectedComponent>(
			entity,
			SimonComponent.OrderRejected,
			{
				round,
				reason,
				message
			}
		);

		this.clearOrderReaction(world, entity);
	}

	private clearOrderReaction(world: World, entity: number): void {
		const queue = world.getComponent<SimonInputQueueComponent>(
			entity,
			SimonComponent.InputQueue
		);

		if (queue) {
			queue.commands.length = 0;
		}

		world.removeComponent(entity, SimonComponent.Order);
		world.removeComponent(entity, SimonComponent.OrderTimer);
		world.removeComponent(entity, SimonComponent.SkipRequested);
		world.removeComponent(entity, SimonComponent.OrderTimeout);
	}

	private ensureProgressComponents(world: World, entity: number): void {
		if (!world.hasComponent(entity, SimonComponent.Score)) {
			world.addComponent<SimonScoreComponent>(entity, SimonComponent.Score, {
				score: 0,
				best: 0
			});
		}

		if (!world.hasComponent(entity, SimonComponent.Lives)) {
			world.addComponent<SimonLivesComponent>(entity, SimonComponent.Lives, {
				lives: 3
			});
		}

		if (!world.hasComponent(entity, SimonComponent.Combo)) {
			world.addComponent<SimonComboComponent>(entity, SimonComponent.Combo, {
				combo: 0
			});
		}

		if (!world.hasComponent(entity, SimonComponent.Level)) {
			world.addComponent<SimonLevelComponent>(entity, SimonComponent.Level, {
				level: 1
			});
		}
	}
}

interface SimonRoundComponentLike {
	round: number;
}