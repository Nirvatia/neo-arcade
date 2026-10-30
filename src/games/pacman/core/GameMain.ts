import type { GameModule } from '../../../shared/core/types';
import type { PacmanEventMap } from './Events';
import { EventBus } from '../engine/EventBus';
import { GameLoop } from '../engine/GameLoop';
import { Director } from './Director';
import { InputController } from './InputController';
import { RenderPipeline } from '../render/RenderPipeline';
import { LevelLoader } from '../logic/level/LevelLoader';
import { PacmanAudioPlayer } from '../audio/PacmanAudioPlayer';
import { hudFrame, screenActions } from '../ui/hud/hudFrame';
import { buildHudSnapshot } from '../ui/hud/hudSnapshot';
import { getSavedScore, saveScore } from '../../../shared/utils/scoreStore';
import {
	setDebugController,
	clearDebugController,
	toggleDebugVisible
} from '../ui/debug/debugActions';
import { TimeControl } from '../engine/TimeControl';
import { DebugController } from './debug/DebugController';
import { debugLog } from '../logic/debug/debugLog';
import { pushDevLog } from '../ui/debug/devLog';

export class GameMain implements GameModule {
	private events: EventBus<PacmanEventMap> | null = null;
	private level: LevelLoader | null = null;
	private director: Director | null = null;
	private loop: GameLoop | null = null;
	private input: InputController | null = null;
	private render: RenderPipeline | null = null;
	private audio: PacmanAudioPlayer | null = null;
	private detachAutoPause: (() => void) | null = null;

	async init(container: HTMLDivElement): Promise<void> {
		if (this.loop) {
			return;
		}
		const events = new EventBus<PacmanEventMap>();
		const level = new LevelLoader(events);
		const audio = new PacmanAudioPlayer(events, () => ({
			active: level.secretMode,
			urgency: level.progress?.collectionRatio ?? 0
		}));
		const director = new Director(events, level);
		const render = new RenderPipeline(container, director, level, events);
		let highScore = parseInt(getSavedScore('pacman'), 10) || 0;
		let lastState = '';
		const time = new TimeControl();
		const loop = new GameLoop(
			(dt) => {
				const held = input.heldDirection;
				if (held && (director.stateName === 'playing' || director.stateName === 'ready')) {
					level.setDesiredDirection(held);
				}
				director.update(dt);
			},
			(dt) => {
				render.render(dt);
				const state = director.flow.state;
				if (state === 'game-over' && lastState !== 'game-over') {
					saveScore('pacman', level.score);
					highScore = Math.max(highScore, level.score);
				}
				lastState = state;
				hudFrame.set(buildHudSnapshot(director, level, highScore));
			},
			1 / 60,
			(real) => time.advance(real)
		);
		const input = new InputController({
			direction: (direction) => {
				const facing = level.player?.facing ?? '—';
				debugLog(events, 'input', `${direction} (facing ${facing}, ${director.stateName})`);
				if (director.stateName === 'playing' || director.stateName === 'ready') {
					level.setDesiredDirection(direction);
				}
			},
			confirm: () => {
				if (director.stateName === 'menu' || director.stateName === 'game-over') {
					director.startGame();
					return;
				}
				if (director.stateName === 'paused') {
					director.togglePause();
					return;
				}
				if (director.stateName === 'ready') {
					director.showPlaying();
				}
			},
			fire: () => {
				if (director.stateName === 'playing') {
					level.requestFire();
				}
			},
			pause: () => {
				director.togglePause();
			},
			menu: () => {
				const state = director.stateName;
				if (state === 'playing' || state === 'death' || state === 'level-clear') {
					director.togglePause();
					return;
				}
				if (
					director.stateName === 'paused' ||
					director.stateName === 'ready' ||
					director.stateName === 'game-over'
				) {
					director.returnToMenu();
				}
			},
			profile: () => {
				if (director.stateName === 'menu' || director.stateName === 'game-over') {
					level.toggleProfile();
				}
			},
			...(import.meta.env.DEV
				? { debugToggle: () => toggleDebugVisible(), debugStep: () => time.step() }
				: {})
		});
		input.attach();
		// a hidden tab or an unfocused window pauses the game; resuming is left to the player
		const onVisibility = (): void => {
			if (document.hidden) {
				director.autoPause();
			}
		};
		const onBlur = (): void => director.autoPause();
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('blur', onBlur);
		this.detachAutoPause = () => {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('blur', onBlur);
		};
		screenActions.set({
			confirm: () => input.pressConfirm(),
			pause: () => input.pressPause(),
			menu: () => input.pressMenu(),
			profile: () => input.pressProfile(),
			restart: () => director.restartLevel()
		});
		if (import.meta.env.DEV) {
			const dev = new DebugController(director, level, time);
			render.setDebugFlags(dev.renderFlags);
			setDebugController(dev);
			events.on('debug:log', (line) => pushDevLog(line, director.flow.state));
		}
		loop.start();
		if (import.meta.env.DEV) {
			// dev only: lets the browser console and automated play-tests inspect the game
			(window as unknown as { __pacman?: unknown }).__pacman = { level, director, render };
		}
		this.events = events;
		this.level = level;
		this.audio = audio;
		this.director = director;
		this.render = render;
		this.loop = loop;
		this.input = input;
	}

	destroy(): void {
		if (import.meta.env.DEV) {
			delete (window as unknown as { __pacman?: unknown }).__pacman;
		}
		this.loop?.stop();
		this.input?.detach();
		this.detachAutoPause?.();
		this.detachAutoPause = null;
		screenActions.set(null);
		hudFrame.set(null);
		clearDebugController();
		this.render?.destroy();
		this.audio?.destroy();
		this.events?.clear();
		this.events = null;
		this.level = null;
		this.director = null;
		this.loop = null;
		this.input = null;
		this.render = null;
		this.audio = null;
	}
}
