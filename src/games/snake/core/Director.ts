import type { World } from './ecs/World.js';
import type { GameLoop } from './GameLoop.js';
import { DirectorState, type DirectorStateType } from './Events.js';

export class Director {
	private readonly world: World;
	private readonly gameLoop: GameLoop;
	private currentState: DirectorStateType;

	constructor(world: World, gameLoop: GameLoop) {
		this.world = world;
		this.gameLoop = gameLoop;
		this.currentState = DirectorState.MENU;
		this.world.events.on('collision:wall', this.onDeath);
		this.world.events.on('collision:self', this.onDeath);
	}

	private onDeath = (): void => {
		this.transitionTo(DirectorState.GAME_OVER);
	};

	public transitionTo(next: DirectorStateType): void {
		const previous = this.currentState;
		this.currentState = next;

		if (next === DirectorState.PAUSED) {
			this.gameLoop.pause();
		}
		if (next === DirectorState.GAME_OVER) {
			this.gameLoop.stop();
		}
		if (next === DirectorState.PLAYING) {
			this.gameLoop.start();
			this.gameLoop.resume();
		}

		this.world.events.emit('director:stateChanged', {
			previous,
			current: next
		});
	}

	public getState(): DirectorStateType {
		return this.currentState;
	}
}
