import type { GameModule } from '../../../shared/core/types';
import type { PacmanEventMap } from './Events';
import { EventBus } from '../engine/EventBus';
import { GameLoop } from '../engine/GameLoop';
import { Director } from './Director';
import { InputController } from './InputController';
import { RenderPipeline } from './RenderPipeline';

export class GameMain implements GameModule {
	private events: EventBus<PacmanEventMap> | null = null;
	private director: Director | null = null;
	private loop: GameLoop | null = null;
	private input: InputController | null = null;
	private render: RenderPipeline | null = null;

	async init(container: HTMLDivElement): Promise<void> {
		if (this.loop) {
			return;
		}
		const events = new EventBus<PacmanEventMap>();
		const director = new Director(events);
		const render = new RenderPipeline(container, director);
		const loop = new GameLoop(
			(dt) => {
				director.update(dt);
			},
			() => {
				render.render();
			}
		);
		const input = new InputController({
			direction: () => {
				director.startPlaying();
			},
			confirm: () => {
				director.startPlaying();
			},
			pause: () => {
				director.togglePause();
			},
			menu: () => {
				director.returnToMenu();
			}
		});

		input.attach();
		loop.start();

		this.events = events;
		this.director = director;
		this.render = render;
		this.loop = loop;
		this.input = input;
	}

	destroy(): void {
		this.loop?.stop();
		this.input?.detach();
		this.render?.destroy();
		this.events?.clear();
		this.events = null;
		this.director = null;
		this.loop = null;
		this.input = null;
		this.render = null;
	}
}