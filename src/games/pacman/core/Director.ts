import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap, PacmanStateName } from './Events';
import type { LevelLoader } from '../logic/LevelLoader';
import { MenuState } from './states/MenuState';
import { PlayingState } from './states/PlayingState';
import { PausedState } from './states/PausedState';
import { GameOverState } from './states/GameOverState';

export interface GameStateContext {
	director: Director;
	events: EventBus<PacmanEventMap>;
	level: LevelLoader;
}

export interface GameState {
	readonly name: PacmanStateName;
	enter(ctx: GameStateContext): void;
	update(ctx: GameStateContext, dt: number): void;
	exit(ctx: GameStateContext): void;
}

export class Director {
	private readonly events: EventBus<PacmanEventMap>;
	private readonly context: GameStateContext;
	private current: GameState;

	constructor(events: EventBus<PacmanEventMap>, level: LevelLoader) {
		if (!events) {
			console.error('Director.constructor', 'missing event bus');
			throw new Error('Director.constructor: missing event bus');
		}

		if (!level) {
			console.error('Director.constructor', 'missing level loader');
			throw new Error('Director.constructor: missing level loader');
		}

		this.events = events;
		this.context = { director: this, events, level };
		this.current = new MenuState();
		this.current.enter(this.context);
		this.events.emit('ui:stateChanged', { state: this.current.name });
	}

	get stateName(): PacmanStateName {
		return this.current.name;
	}

	setState(next: GameState): void {
		if (next.name === this.current.name) {
			return;
		}

		this.current.exit(this.context);
		this.current = next;
		this.current.enter(this.context);
		this.events.emit('ui:stateChanged', { state: this.current.name });
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('Director.update', 'invalid delta time', dt);
		}

		const safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(0.25, dt) : 0;
		this.current.update(this.context, safeDt);
	}

	startPlaying(): void {
		if (this.current.name === 'menu' || this.current.name === 'game-over') {
			this.setState(new PlayingState(false));
		}
	}

	togglePause(): void {
		if (this.current.name === 'playing') {
			this.setState(new PausedState());
			return;
		}

		if (this.current.name === 'paused') {
			this.setState(new PlayingState(true));
		}
	}

	returnToMenu(): void {
		if (this.current.name !== 'menu') {
			this.setState(new MenuState());
		}
	}

	showGameOver(): void {
		if (this.current.name !== 'game-over') {
			this.setState(new GameOverState());
		}
	}
}