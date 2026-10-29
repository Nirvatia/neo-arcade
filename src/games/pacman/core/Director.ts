import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap, PacmanStateName } from './Events';
import type { LevelLoader } from '../logic/level/LevelLoader';
import type { DeathWaveSnapshot } from './states/DeathState';
import type { LevelClearSnapshot } from './states/LevelClearState';
import { MenuState } from './states/MenuState';
import { ReadyState } from './states/ReadyState';
import { PlayingState } from './states/PlayingState';
import { PausedState } from './states/PausedState';
import { DeathState } from './states/DeathState';
import { LevelClearState } from './states/LevelClearState';
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

	get overlayTimer(): number {
		const candidate = this.current as GameState & { overlayTimer?: number };
		return typeof candidate.overlayTimer === 'number' ? candidate.overlayTimer : 0;
	}

	get deathWave(): DeathWaveSnapshot | null {
		const candidate = this.current as GameState & { deathWave?: DeathWaveSnapshot | null };
		return candidate.deathWave ?? null;
	}

	get levelClear(): LevelClearSnapshot | null {
		const candidate = this.current as GameState & { levelClear?: LevelClearSnapshot | null };
		return candidate.levelClear ?? null;
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

	startGame(): void {
		if (this.current.name === 'menu' || this.current.name === 'game-over') {
			this.context.level.startNewGame();
			this.setState(new ReadyState());
		}
	}

	showPlaying(): void {
		if (this.current.name === 'ready') {
			this.setState(new PlayingState(true));
			return;
		}
		if (this.current.name === 'paused') {
			const paused = this.current as PausedState;
			if (paused.resumeTarget === 'playing') {
				this.setState(new PlayingState(true));
			}
		}
	}

	togglePause(): void {
		if (this.current.name === 'playing') {
			this.setState(new PausedState('playing', 0));
			return;
		}
		if (this.current.name === 'ready') {
			this.setState(new PausedState('ready', this.overlayTimer));
			return;
		}
		if (this.current.name === 'paused') {
			const paused = this.current as PausedState;
			if (paused.resumeTarget === 'ready') {
				this.setState(new ReadyState(paused.readyTimer));
				return;
			}
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

	showReady(): void {
		if (this.current.name !== 'ready') {
			this.setState(new ReadyState());
		}
	}

	showDeath(): void {
		if (this.current.name === 'playing') {
			this.setState(new DeathState());
		}
	}

	showLevelClear(): void {
		if (this.current.name === 'playing') {
			this.setState(new LevelClearState());
		}
	}

	debugCompleteLevel(): void {
		const combat = this.context.level.combat;
		if (!combat) {
			console.error('Director.debugCompleteLevel', 'combat is not initialized');
			return;
		}
		combat.debugComplete();
		if (this.current.name === 'playing') {
			this.setState(new LevelClearState());
		}
	}

	debugKillPlayer(): void {
		const combat = this.context.level.combat;
		if (!combat) {
			console.error('Director.debugKillPlayer', 'combat is not initialized');
			return;
		}
		combat.debugKill();
		if (this.current.name === 'playing') {
			this.setState(new DeathState());
		}
	}

	debugEnterHell(): void {
		this.context.level.debugEnterHell();
		this.setState(new ReadyState());
	}

	debugEnterSecret(): void {
		this.context.level.debugEnterSecret();
		this.setState(new ReadyState());
	}
}
