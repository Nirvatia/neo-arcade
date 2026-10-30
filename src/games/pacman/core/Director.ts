import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap, PacmanStateName } from './Events';
import type { LevelLoader } from '../logic/level/LevelLoader';
import type { GameState, GameStateContext } from './flow/GameState';
import { StateClock } from './flow/StateClock';
import type { FlowTiming } from './flow/StateClock';
import { FLOW } from '../config/flowConfig';
import { MenuState } from './states/MenuState';
import { ReadyState } from './states/ReadyState';
import type { ReadyKind } from './states/ReadyState';
import { PlayingState } from './states/PlayingState';
import { PausedState } from './states/PausedState';
import { DeathState } from './states/DeathState';
import type { DeathSnapshot } from './states/DeathState';
import { LevelClearState } from './states/LevelClearState';
import type { LevelClearSnapshot } from './states/LevelClearState';
import { GameOverState } from './states/GameOverState';
import { debugLog } from '../logic/debug/debugLog';

export type { GameState, GameStateContext } from './flow/GameState';

/**
 * Allowed state changes. Pause and resume are not listed: they suspend and restore a state
 * instead of replacing it. Debug shortcuts bypass the table.
 */
const TRANSITIONS: Readonly<Record<PacmanStateName, readonly PacmanStateName[]>> = {
	menu: ['ready'],
	ready: ['playing', 'menu'],
	playing: ['death', 'level-clear', 'game-over', 'ready'],
	death: ['ready', 'game-over'],
	'level-clear': ['ready'],
	'game-over': ['ready', 'menu'],
	paused: ['menu']
};

type FadePhase = 'out' | 'in';

/** A screen fade: covers the screen, runs `action` while covered, then uncovers. */
interface ScreenFade {
	readonly clock: StateClock<FadePhase>;
	readonly action: () => void;
	fired: boolean;
}

/** The flow as the renderers and the overlay see it. */
export interface FlowSnapshot extends FlowTiming {
	/** The state on screen; while paused, the suspended one. */
	readonly state: PacmanStateName;
	readonly paused: boolean;
	/** Screen fade cover, 0 (clear) to 1 (black). */
	readonly fade: number;
}

export class Director {
	private readonly events: EventBus<PacmanEventMap>;
	private readonly context: GameStateContext;
	private current: GameState;
	private fadeValue: ScreenFade | null = null;
	private pauseAfterFade = false;

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

	/** The top state: `paused` while paused. Input and UI buttons go by this. */
	get stateName(): PacmanStateName {
		return this.current.name;
	}

	/** The state on screen: while paused, the one the pause suspended. */
	get activeState(): GameState {
		return this.current instanceof PausedState ? this.current.suspended : this.current;
	}

	get paused(): boolean {
		return this.current instanceof PausedState;
	}

	get transitioning(): boolean {
		return this.fadeValue !== null;
	}

	get flow(): FlowSnapshot {
		return {
			...this.activeState.timing(),
			state: this.activeState.name,
			paused: this.paused,
			fade: this.fadeCover()
		};
	}

	/** Where Pac-Man died, while the death state is on screen. */
	get death(): DeathSnapshot | null {
		const state = this.activeState;
		return state instanceof DeathState ? state.death : null;
	}

	get levelClear(): LevelClearSnapshot | null {
		const state = this.activeState;
		return state instanceof LevelClearState ? state.levelClear : null;
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('Director.update', 'invalid delta time', dt);
		}
		const safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(0.25, dt) : 0;
		if (this.fadeValue) {
			// the game is frozen behind a fade; only the fade itself moves
			this.updateFade(safeDt);
			return;
		}
		this.current.update(this.context, safeDt);
	}

	startGame(): void {
		if (this.fadeValue || !this.acceptsMenuInput()) {
			return;
		}
		if (this.current.name !== 'menu' && this.current.name !== 'game-over') {
			return;
		}
		this.fadeTo(() => {
			this.context.level.startNewGame();
			this.setState(new ReadyState('intro'));
		});
	}

	/** Ends READY early (skip) or on its own timer. */
	showPlaying(): void {
		if (!this.fadeValue && this.current.name === 'ready') {
			this.setState(new PlayingState());
		}
	}

	togglePause(): void {
		if (this.fadeValue) {
			this.pauseAfterFade = !this.pauseAfterFade;
			return;
		}
		if (this.current instanceof PausedState) {
			this.resume();
			return;
		}
		if (this.current.pausable) {
			this.pause();
		}
	}

	/** The tab was hidden or the window lost focus: pause if a game is running. */
	autoPause(): void {
		if (this.fadeValue) {
			this.pauseAfterFade = true;
			return;
		}
		if (this.current.pausable) {
			this.pause();
		}
	}

	returnToMenu(): void {
		if (this.fadeValue || !this.acceptsMenuInput()) {
			return;
		}
		const from = this.current.name;
		if (from === 'paused' || from === 'ready' || from === 'game-over') {
			this.fadeTo(() => this.setState(new MenuState()));
		}
	}

	showReady(kind: ReadyKind): void {
		this.setState(new ReadyState(kind));
	}

	showDeath(): void {
		this.setState(new DeathState());
	}

	showLevelClear(): void {
		this.setState(new LevelClearState());
	}

	showGameOver(): void {
		this.setState(new GameOverState());
	}

	/**
	 * Starts the next level without a fade, when its world is already on screen (after
	 * the season turn): `route` rebuilds the level, then a short READY opens it.
	 */
	startLevelInPlace(route: () => void): void {
		route();
		this.setState(new ReadyState('short'));
	}

	/**
	 * Moves to another level behind a screen fade: `route` rebuilds the level while the
	 * screen is covered, then a short READY opens it.
	 */
	changeLevel(route: () => void): void {
		this.fadeTo(() => {
			route();
			this.setState(new ReadyState('short'));
		});
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
		if (this.fadeValue) {
			return;
		}
		this.context.level.debugEnterHell();
		this.setState(new ReadyState('short'), true);
	}

	/** The pause screen's RESTART: the current level again, from a short READY. */
	restartLevel(): void {
		this.debugGotoLevel(this.context.level.level);
	}

	debugGotoLevel(level: number): void {
		if (this.fadeValue) {
			return;
		}
		this.context.level.debugGotoLevel(level);
		this.setState(new ReadyState('short'), true);
	}

	debugEnterSecret(): void {
		if (this.fadeValue) {
			return;
		}
		this.context.level.debugEnterSecret();
		this.setState(new ReadyState('short'), true);
	}

	private setState(next: GameState, force = false): void {
		const from = this.current.name;
		if (!force && !TRANSITIONS[from].includes(next.name)) {
			console.error('Director.setState', `transition ${from} -> ${next.name} is not allowed`);
			return;
		}
		if (this.current instanceof PausedState) {
			this.current.suspended.exit(this.context);
		}
		this.current.exit(this.context);
		this.current = next;
		this.current.enter(this.context);
		this.events.emit('ui:stateChanged', { state: this.current.name });
		debugLog(this.events, 'state', `${from} → ${next.name}`);
	}

	private pause(): void {
		const paused = new PausedState(this.current);
		debugLog(this.events, 'state', `pause (${this.current.name})`);
		this.current = paused;
		paused.enter(this.context);
		this.events.emit('ui:stateChanged', { state: paused.name });
	}

	private resume(): void {
		if (!(this.current instanceof PausedState)) {
			return;
		}
		const paused = this.current;
		paused.exit();
		this.current = paused.suspended;
		this.events.emit('ui:stateChanged', { state: this.current.name });
		this.context.level.emitHud();
	}

	private acceptsMenuInput(): boolean {
		return !(this.current instanceof GameOverState) || this.current.inputReady;
	}

	private fadeTo(action: () => void): void {
		if (this.fadeValue) {
			return;
		}
		this.fadeValue = {
			clock: new StateClock<FadePhase>([
				{ name: 'out', duration: FLOW.screenFade },
				{ name: 'in', duration: FLOW.screenFade }
			]),
			action,
			fired: false
		};
	}

	private updateFade(dt: number): void {
		const fade = this.fadeValue;
		if (!fade) {
			return;
		}
		fade.clock.advance(dt);
		if (!fade.fired && fade.clock.elapsed >= FLOW.screenFade) {
			fade.fired = true;
			fade.action();
		}
		if (fade.clock.done) {
			this.fadeValue = null;
			if (this.pauseAfterFade) {
				this.pauseAfterFade = false;
				if (this.current.pausable) {
					this.pause();
				}
			}
		}
	}

	private fadeCover(): number {
		const fade = this.fadeValue;
		if (!fade) {
			return 0;
		}
		const timing = fade.clock.timing;
		return timing.phase === 'out' ? timing.phaseProgress : 1 - timing.phaseProgress;
	}
}
