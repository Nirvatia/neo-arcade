import type { GameModule } from '$shared/core/types';
import { GameLoop } from '../engine/GameLoop';
import { FxCoordinator } from '../render/fx/FxCoordinator';
import { InputSystem } from '../systems/InputSystem';
import { TetrisCommand } from './types';
import { Director } from './Director';
import { GameModel } from './GameModel';
import { InputController } from './InputController';
import { RenderPipeline } from './RenderPipeline';

export class GameMain implements GameModule {
	private readonly model = new GameModel();
	private readonly director = new Director(this.model);
	private readonly inputSystem = new InputSystem(this.model);
	private readonly fx = new FxCoordinator();
	private pipeline: RenderPipeline | null = null;
	private loop: GameLoop | null = null;
	private input: InputController | null = null;

	async init(canvasParent: HTMLDivElement): Promise<void> {
		this.pipeline = new RenderPipeline(canvasParent);
		this.pipeline.setActions({
			start: () => this.director.start(),
			togglePause: () => this.director.togglePause(),
			press: (command: TetrisCommand) => this.press(command)
		});
		this.loop = new GameLoop(60, this.update.bind(this), this.render.bind(this));
		this.input = new InputController(this.director, this.inputSystem);
		this.fx.attach();
		this.input.attach();
		this.loop.start();
	}

	destroy(): void {
		if (this.loop) {
			this.loop.stop();
		}
		if (this.input) {
			this.input.destroy();
		}
		this.fx.destroy();
		if (this.pipeline) {
			this.pipeline.destroy();
		}
		this.pipeline = null;
		this.loop = null;
		this.input = null;
	}

	press(command: TetrisCommand): void {
		if (command === TetrisCommand.START) {
			this.director.start();
			return;
		}
		if (command === TetrisCommand.TOGGLE_PAUSE) {
			this.director.togglePause();
			return;
		}
		this.inputSystem.handle(command);
	}

	private update(dt: number): void {
		this.director.update(dt);
	}

	private render(): void {
		if (!this.pipeline) {
			return;
		}
		this.pipeline.render(this.model);
	}
}
