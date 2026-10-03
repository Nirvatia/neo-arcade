import type { World } from './ecs/World.js';
import type { GameLoop } from './GameLoop.js';
import { StateMachine } from './StateMachine.js';
import { DirectorState, type DirectorStateType } from './Events.js';
import type { DirectorContext } from './states/types.js';
import { MenuState } from './states/MenuState.js';
import { PlayingState } from './states/PlayingState.js';
import { PausedState } from './states/PausedState.js';
import { GameOverState } from './states/GameOverState.js';
import { VictoryState } from './states/VictoryState.js';

export class Director {
	private readonly world: World;
	private readonly gameLoop: GameLoop;
	private readonly stateMachine: StateMachine<DirectorContext>;
	private readonly playingState: PlayingState;

	constructor(world: World, gameLoop: GameLoop) {
		this.world = world;
		this.gameLoop = gameLoop;

		const context: DirectorContext = {
			gameLoop,
			events: world.events
		};

		this.stateMachine = new StateMachine<DirectorContext>(context);

		const menuState = new MenuState();
		this.playingState = new PlayingState();
		const pausedState = new PausedState();
		const gameOverState = new GameOverState();
		const victoryState = new VictoryState();

		this.stateMachine.addState(menuState);
		this.stateMachine.addState(this.playingState);
		this.stateMachine.addState(pausedState);
		this.stateMachine.addState(gameOverState);
		this.stateMachine.addState(victoryState);

		// Таблица переходов.
		this.stateMachine.addTransition(DirectorState.MENU, 'start', DirectorState.PLAYING);
		this.stateMachine.addTransition(DirectorState.PLAYING, 'pause', DirectorState.PAUSED);
		this.stateMachine.addTransition(DirectorState.PLAYING, 'death', DirectorState.GAME_OVER);
		this.stateMachine.addTransition(DirectorState.PLAYING, 'victory', DirectorState.VICTORY);
		this.stateMachine.addTransition(DirectorState.PAUSED, 'resume', DirectorState.PLAYING);
		this.stateMachine.addTransition(DirectorState.PAUSED, 'death', DirectorState.GAME_OVER);
		this.stateMachine.addTransition(DirectorState.GAME_OVER, 'restart', DirectorState.MENU);
		this.stateMachine.addTransition(DirectorState.VICTORY, 'restart', DirectorState.MENU);

		this.stateMachine.start(DirectorState.MENU);
	}

	// ===== Прямые вызовы из систем (заменяют EventBus) =====

	public onDeath(): void {
		this.playingState.setPrevious(this.stateMachine.stateName);
		this.stateMachine.dispatch('death');
	}

	public onVictory(): void {
		this.playingState.setPrevious(this.stateMachine.stateName);
		this.stateMachine.dispatch('victory');
	}

	// ===== Публичный интерфейс для GameMain / InputController =====

	public startGame(): void {
		this.playingState.setPrevious(this.stateMachine.stateName);
		this.stateMachine.dispatch('start');
	}

	public pause(): void {
		this.stateMachine.dispatch('pause');
	}

	public resume(): void {
		this.playingState.setPrevious(DirectorState.PAUSED);
		this.stateMachine.dispatch('resume');
	}

	public restart(): void {
		this.stateMachine.dispatch('restart');
	}

	public getState(): DirectorStateType {
		return this.stateMachine.stateName as DirectorStateType;
	}

	public isState(state: DirectorStateType): boolean {
		return this.stateMachine.is(state);
	}
}